// Stand-in for the remote-track Worker that serves Winamp's tracks, for tests
// that play a Winamp track without the network.

const TRACKS_ORIGIN = 'https://windoes-tracks.tauzen.workers.dev';

// A short silent 16-bit mono WAV, so a test has a real track to play.
function silentWav(seconds, rate = 8000) {
  const samples = seconds * rate;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + samples * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples * 2, 40);
  return wav;
}

// Like the real Worker, it serves only the shell's origin, so a request made
// from an opaque-origin frame gets 403. Each request is pushed to `requests`.
async function routeTrackWorker(ctx, shellOrigin, requests = []) {
  const track = silentWav(5);
  await ctx.route(`${TRACKS_ORIGIN}/**`, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const origin = request.headers().origin;
    requests.push({ path: url.pathname, key: url.searchParams.get('key'), origin });
    if (origin !== shellOrigin) {
      return route.fulfill({ status: 403, body: 'forbidden' });
    }
    const cors = { 'Access-Control-Allow-Origin': shellOrigin };
    if (url.pathname === '/sign') {
      return route.fulfill({
        status: 200,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify({
          url: `${TRACKS_ORIGIN}/stream?key=${encodeURIComponent(url.searchParams.get('key'))}`,
          expiresAt: Date.now() + 600_000,
        }),
      });
    }
    return route.fulfill({ status: 200, headers: cors, contentType: 'audio/wav', body: track });
  });
}

module.exports = { TRACKS_ORIGIN, routeTrackWorker };
