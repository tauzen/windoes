/**
 * Cloudflare Worker that serves Winamp MP3 tracks from an R2 bucket
 * behind short-lived HMAC-signed URLs.
 *
 * Endpoints:
 *   GET /sign?key=<r2-key>
 *     Issues a signed stream URL for the given key. Requires the request
 *     to come from an allow-listed Origin. Response:
 *       { url, expiresAt }
 *
 *   GET /stream/<key>?exp=<unix>&sig=<base64url>
 *     Streams the R2 object if the HMAC signature is valid and the
 *     expiry is in the future. Supports Range requests so the
 *     HTMLAudioElement can seek/stream normally.
 *
 * Required bindings (see wrangler.toml):
 *   - env.BUCKET        R2 bucket with the MP3 objects
 *   - env.SIGNING_SECRET (secret) HMAC key, any long random string
 *   - env.ALLOWED_ORIGINS  comma-separated list of allowed origins
 *   - env.SIGN_TTL_SECONDS (optional, defaults to 3600)
 */

const DEFAULT_TTL_SECONDS = 3600;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowed = parseAllowed(env.ALLOWED_ORIGINS);
    const origin = request.headers.get('Origin') || '';
    const originAllowed = allowed.includes(origin);

    if (request.method === 'OPTIONS') {
      return preflight(origin, originAllowed);
    }

    if (url.pathname === '/sign' && request.method === 'GET') {
      return handleSign(url, env, origin, originAllowed);
    }

    if (url.pathname.startsWith('/stream/') && request.method === 'GET') {
      return handleStream(request, url, env, origin, originAllowed);
    }

    return new Response('Not Found', { status: 404 });
  },
};

function parseAllowed(raw) {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function corsHeaders(origin, originAllowed) {
  if (!originAllowed) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
  };
}

function preflight(origin, originAllowed) {
  if (!originAllowed) return new Response('Forbidden', { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin, originAllowed),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

async function handleSign(url, env, origin, originAllowed) {
  if (!originAllowed) return new Response('Forbidden', { status: 403 });

  const key = url.searchParams.get('key');
  if (!key) {
    return json({ error: 'missing key' }, 400, corsHeaders(origin, originAllowed));
  }

  // Defense: do not allow path traversal-style keys.
  if (key.includes('..') || key.startsWith('/')) {
    return json({ error: 'invalid key' }, 400, corsHeaders(origin, originAllowed));
  }

  const ttl = Number(env.SIGN_TTL_SECONDS) || DEFAULT_TTL_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const sig = await sign(env.SIGNING_SECRET, `${key}:${exp}`);
  const streamUrl =
    `${url.origin}/stream/${encodeKey(key)}?exp=${exp}&sig=${sig}`;

  return json(
    { url: streamUrl, expiresAt: exp * 1000 },
    200,
    { ...corsHeaders(origin, originAllowed), 'Cache-Control': 'no-store' }
  );
}

async function handleStream(request, url, env, origin, originAllowed) {
  // The HTMLAudioElement will always send an Origin header when
  // crossOrigin="anonymous" is set, so an absent Origin means the
  // request likely came from a direct navigation / curl. Reject those.
  if (!originAllowed) return new Response('Forbidden', { status: 403 });

  const rawKey = url.pathname.slice('/stream/'.length);
  const key = decodeKey(rawKey);
  const exp = Number(url.searchParams.get('exp') || 0);
  const sig = url.searchParams.get('sig') || '';

  if (!key || !exp || !sig) {
    return new Response('Bad Request', { status: 400 });
  }

  if (Date.now() / 1000 > exp) {
    return new Response('Link expired', { status: 410 });
  }

  const expected = await sign(env.SIGNING_SECRET, `${key}:${exp}`);
  if (!timingSafeEqual(expected, sig)) {
    return new Response('Invalid signature', { status: 403 });
  }

  const range = parseRange(request.headers.get('Range'));
  const obj = await env.BUCKET.get(key, range ? { range } : undefined);
  if (!obj) return new Response('Not Found', { status: 404 });

  const headers = new Headers({
    ...corsHeaders(origin, originAllowed),
    'Content-Type': obj.httpMetadata?.contentType || 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    // Private: browser may cache but CDN must not fan out a signed URL.
    'Cache-Control': 'private, max-age=600',
    // Prevents the browser from offering a one-click "Save As" filename
    // from the URL path. Does not prevent saving via DevTools.
    'Content-Disposition': 'inline',
  });

  if (obj.range) {
    const start = obj.range.offset ?? 0;
    const length = obj.range.length ?? obj.size - start;
    const end = start + length - 1;
    headers.set('Content-Range', `bytes ${start}-${end}/${obj.size}`);
    headers.set('Content-Length', String(length));
    return new Response(obj.body, { status: 206, headers });
  }

  headers.set('Content-Length', String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}

function parseRange(header) {
  if (!header) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const offset = Number(match[1]);
  if (match[2] === '') return { offset };
  const end = Number(match[2]);
  if (end < offset) return null;
  return { offset, length: end - offset + 1 };
}

async function sign(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  );
  return base64url(new Uint8Array(sig));
}

function base64url(bytes) {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function encodeKey(key) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function decodeKey(raw) {
  try {
    return raw.split('/').map(decodeURIComponent).join('/');
  } catch {
    return '';
  }
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
