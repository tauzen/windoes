#!/usr/bin/env node
/**
 * Winamp skin diff harness (F005).
 *
 *   npm run test:winamp-skin-diff
 *
 * Opens Winamp in the shell (Chromium, 1024x768, device scale factor 1),
 * sets the player to the state the reference shows, and then:
 *
 * - measures every window and item of `layout.mjs` against the reference
 *   geometry, and lists the skin frames each item still lacks;
 * - compares the 275x348 capture with the reference screenshot per window,
 *   outside the dynamic areas (masks), with tolerance 0. The share of
 *   differing pixels is reported, not gated.
 *
 * Writes, for commit: `diff/<window>.png` (our capture in grey, differing
 * pixels red, masks hatched; no reference pixels) and `diff/report.txt`.
 * Writes, git-ignored: the reference in `.cache/` and `side-by-side/<window>.png`
 * (reference | capture | diff) for local review.
 *
 * The reference is a screenshot of Nullsoft's skin art. It is fetched here at
 * check time, verified by SHA-256, and never committed.
 */

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSkin, encodePng } from '../../scripts/build-winamp-skin.mjs';
import { WINDOWS } from './layout.mjs';

const require = createRequire(import.meta.url);
const { launchBrowser, startStaticServer } = require('../launch-browser');
const { waitForBoot } = require('../helpers/test-harness');
const { routeTrackWorker } = require('../helpers/track-worker');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const CACHE_DIR = join(HERE, '.cache');
const SIDE_BY_SIDE_DIR = join(HERE, 'side-by-side');
const DIFF_DIR = join(HERE, 'diff');

// Skin Museum screenshot of base-2.91.wsz, rendered by Webamp (F005 notes, section 1).
const REFERENCE = {
  url: 'https://r2.webampskins.org/screenshots/5e4f10275dcb1fb211d4a8b4f1bda236.png',
  sha256: '6c6b81a825036fbff4ed4ca3c0008566157a5100a59a56e8c4bf261e2fa8f47c',
  file: join(CACHE_DIR, 'base-2.91.png'),
};
const CAPTURE_SIZE = [275, 348];
const VIEWPORT = { width: 1024, height: 768 };

// The player state the reference shows: Webamp's defaults (volume 78 of 100,
// balance centred, EQ on, AUTO off, every EQ slider centred, shuffle and repeat
// off), both toggles on, and a track playing.
const STATE = {
  volume: 78,
  balance: 0,
  preamp: 0,
  band: 0,
  eqOn: true,
  shuffle: false,
  repeat: false,
};

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function referencePng() {
  if (existsSync(REFERENCE.file)) {
    const cached = readFileSync(REFERENCE.file);
    if (sha256(cached) === REFERENCE.sha256) return cached;
  }
  const response = await fetch(REFERENCE.url);
  if (!response.ok) throw new Error(`reference fetch failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = sha256(bytes);
  if (hash !== REFERENCE.sha256) {
    throw new Error(`reference SHA-256 is ${hash}, expected ${REFERENCE.sha256}`);
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(REFERENCE.file, bytes);
  return bytes;
}

// ── Shell and app ───────────────────────────────────────────────────────────

async function openWinamp(page) {
  await page.evaluate(() => window.WindoesApp.open.winamp());
  for (let i = 0; i < 100; i++) {
    const frame = await (await page.$('#winampFrame'))?.contentFrame();
    if (frame && /winamp-player/.test(frame.url())) {
      await frame.waitForLoadState('load');
      return frame;
    }
    await page.waitForTimeout(50);
  }
  throw new Error('#winampFrame did not load the Winamp app');
}

async function setPlayerState(page, app) {
  await app.waitForFunction(() => document.querySelectorAll('#playlist-tracks > *').length > 0);
  await app.evaluate((state) => {
    const setRange = (el, value) => {
      el.value = String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const setToggle = (id, on) => {
      const el = document.getElementById(id);
      if (el.classList.contains('active') !== on) el.click();
    };
    setRange(document.getElementById('volume-slider'), state.volume);
    setRange(document.getElementById('balance-slider'), state.balance);
    setRange(document.getElementById('eq-preamp-slider'), state.preamp);
    document.querySelectorAll('#eq-bands input').forEach((el) => setRange(el, state.band));
    setToggle('btn-eq', true);
    setToggle('btn-pl', true);
    setToggle('eq-on-btn', state.eqOn);
    setToggle('btn-shuffle', state.shuffle);
    setToggle('btn-repeat', state.repeat);
  }, STATE);
  await page.evaluate(() => window.WindoesApp.WindowManager.bringToFront('winamp'));
  await app.click('#btn-play');
  await app.waitForFunction(() => document.getElementById('btn-play').classList.contains('active'));
  // Keep hover styles off the capture.
  await page.mouse.move(VIEWPORT.width - 1, VIEWPORT.height - 1);
  await page.waitForTimeout(300);
}

/** Rect of every window and item; windows relative to #winamp, items to their window. */
function measure(windows) {
  const rectOf = (el, origin) => {
    const r = el.getBoundingClientRect();
    return [r.left - origin.left, r.top - origin.top, r.width, r.height];
  };
  const root = document.getElementById('winamp').getBoundingClientRect();
  return windows.map((win) => {
    const winEl = document.querySelector(win.selector);
    const winRect = winEl?.getBoundingClientRect();
    return {
      rect: winEl ? rectOf(winEl, root) : null,
      items: win.items.map((item) => {
        if (!item.selector) return null;
        const el = winEl && document.querySelector(item.selector);
        return el ? rectOf(el, winRect) : null;
      }),
    };
  });
}

async function capture(page, app) {
  const iframe = await page.$('#winampFrame');
  const box = await iframe.boundingBox();
  const inset = await iframe.evaluate((el) => [el.clientLeft, el.clientTop]);
  const root = await app.evaluate(() => {
    const r = document.getElementById('winamp').getBoundingClientRect();
    return [r.left, r.top];
  });
  const x = box.x + inset[0] + root[0];
  const y = box.y + inset[1] + root[1];
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(`Winamp sits at a fractional position (${x}, ${y}); a 1x capture would blur`);
  }
  const [width, height] = CAPTURE_SIZE;
  return page.screenshot({ clip: { x, y, width, height } });
}

/** Decode PNGs to RGBA in Chromium, without colour management. */
async function decodePngs(page, pngs) {
  const decoded = await page.evaluate(
    async (list) => {
      const out = [];
      for (const b64 of list) {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), {
          colorSpaceConversion: 'none',
          premultiplyAlpha: 'none',
        });
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
        let binary = '';
        for (let i = 0; i < data.length; i += 0x8000) {
          binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
        }
        out.push({ w: bitmap.width, h: bitmap.height, b64: btoa(binary) });
      }
      return out;
    },
    pngs.map((png) => png.toString('base64'))
  );
  return decoded.map((d) => ({
    w: d.w,
    h: d.h,
    pixels: new Uint8Array(Buffer.from(d.b64, 'base64')),
  }));
}

// ── Comparison ──────────────────────────────────────────────────────────────

function crop(image, [x0, y0, w, h]) {
  const pixels = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const from = ((y0 + y) * image.w + x0) * 4;
    pixels.set(image.pixels.subarray(from, from + w * 4), y * w * 4);
  }
  return { w, h, pixels };
}

function inMasks(masks, x, y) {
  return masks.some(([mx, my, mw, mh]) => x >= mx && x < mx + mw && y >= my && y < my + mh);
}

/** Count differing unmasked pixels and draw the committed diff image. */
function compare(ours, theirs, masks) {
  const diff = { w: ours.w, h: ours.h, pixels: new Uint8Array(ours.pixels.length) };
  let differing = 0;
  let unmasked = 0;
  for (let y = 0; y < ours.h; y++) {
    for (let x = 0; x < ours.w; x++) {
      const i = (y * ours.w + x) * 4;
      const [r, g, b] = ours.pixels.subarray(i, i + 3);
      const grey = 64 + Math.round((0.299 * r + 0.587 * g + 0.114 * b) / 2);
      let rgb = [grey, grey, grey];
      if (inMasks(masks, x, y)) {
        if ((x + y) % 4 === 0) rgb = [0, 96, 255];
      } else {
        unmasked++;
        const same =
          r === theirs.pixels[i] && g === theirs.pixels[i + 1] && b === theirs.pixels[i + 2];
        if (!same) {
          differing++;
          rgb = [255, 0, 0];
        }
      }
      diff.pixels.set([...rgb, 255], i);
    }
  }
  return { differing, unmasked, diff };
}

function sideBySide(images, gap = 4) {
  const w = images.reduce((sum, im) => sum + im.w, gap * (images.length - 1));
  const h = Math.max(...images.map((im) => im.h));
  const out = { w, h, pixels: new Uint8Array(w * h * 4) };
  let left = 0;
  for (const im of images) {
    for (let y = 0; y < im.h; y++) {
      out.pixels.set(im.pixels.subarray(y * im.w * 4, (y + 1) * im.w * 4), (y * w + left) * 4);
    }
    left += im.w + gap;
  }
  return out;
}

// ── Report ──────────────────────────────────────────────────────────────────

const fmtRect = (r) =>
  r
    .map((v) => (v === null ? '?' : Number.isInteger(v) ? v : v.toFixed(2)))
    .join(',')
    .replace(/^([^,]+),([^,]+),([^,]+),([^,]+)$/, '$1,$2 $3x$4');

function rectMatches(expected, actual) {
  return expected.every((v, i) => v === null || v === actual[i]);
}

function geometryLine(name, expected, actual) {
  const status = !actual ? 'missing' : rectMatches(expected, actual) ? 'ok' : 'off';
  const seen = actual ? fmtRect(actual) : '-';
  return {
    status,
    text: `  ${status.padEnd(8)}${name.padEnd(18)}${fmtRect(expected).padEnd(16)}${seen}`,
  };
}

function report({ pixelLines, geometry, frames }) {
  const lines = [
    'Winamp skin diff report (generated by tests/winamp-skin/diff.mjs; do not edit)',
    '',
    `Reference: ${REFERENCE.url}`,
    `Reference SHA-256: ${REFERENCE.sha256}`,
    `Capture: shell at ${VIEWPORT.width}x${VIEWPORT.height}, device scale factor 1, ` +
      `${CAPTURE_SIZE.join('x')} from the top-left of #winamp`,
    '',
    'Pixels outside the masks whose RGB differs from the reference (tolerance 0; reported, not gated)',
    ...pixelLines,
    '',
    'Geometry: status, item, expected x,y wxh, actual (windows relative to #winamp, items to their window)',
    ...geometry.lines,
    `  ${geometry.ok} of ${geometry.total} rects match`,
    '',
    'Skin frames each item needs and the build does not have yet',
    ...frames.lines,
    `  ${frames.present} of ${frames.total} frames present`,
    '',
  ];
  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function run() {
  const reference = await referencePng();
  const skinFrames = new Set(
    buildSkin().sheets.flatMap((s) => s.frames.map((f) => `${s.name}-${f.name}`))
  );

  const { server, baseUrl } = await startStaticServer(join(ROOT, 'windoes'));
  const browser = await launchBrowser();
  try {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await routeTrackWorker(ctx, new URL(baseUrl).origin);
    const page = await ctx.newPage();
    await waitForBoot(page, baseUrl);
    const app = await openWinamp(page);
    await setPlayerState(page, app);

    const measured = await app.evaluate(measure, WINDOWS);
    const shot = await capture(page, app);
    const [ours, theirs] = await decodePngs(page, [shot, reference]);
    if (theirs.w !== CAPTURE_SIZE[0] || theirs.h !== CAPTURE_SIZE[1]) {
      throw new Error(`reference is ${theirs.w}x${theirs.h}, expected ${CAPTURE_SIZE.join('x')}`);
    }

    mkdirSync(DIFF_DIR, { recursive: true });
    mkdirSync(SIDE_BY_SIDE_DIR, { recursive: true });
    const pixelLines = [];
    const geometry = { lines: [], ok: 0, total: 0 };
    const frames = { lines: [], present: 0, total: 0 };

    WINDOWS.forEach((win, w) => {
      const band = [0, win.rect[1], win.rect[2], win.rect[3]];
      const oursWin = crop(ours, band);
      const theirsWin = crop(theirs, band);
      const { differing, unmasked, diff } = compare(oursWin, theirsWin, win.masks);
      writeFileSync(join(DIFF_DIR, `${win.id}.png`), encodePng(diff));
      writeFileSync(
        join(SIDE_BY_SIDE_DIR, `${win.id}.png`),
        encodePng(sideBySide([theirsWin, oursWin, diff]))
      );
      const share = ((100 * differing) / unmasked).toFixed(1);
      pixelLines.push(`  ${win.id.padEnd(10)} ${differing} of ${unmasked} (${share}%)`);

      const rows = [geometryLine(`${win.id} window`, win.rect, measured[w].rect)];
      win.items.forEach((item, i) => {
        if (item.selector) rows.push(geometryLine(item.name, item.rect, measured[w].items[i]));
        const missing = item.frames.filter((f) => !skinFrames.has(f));
        frames.total += item.frames.length;
        frames.present += item.frames.length - missing.length;
        if (missing.length) {
          frames.lines.push(`  ${win.id} ${item.name}: ${missing.join(' ')}`);
        }
      });
      geometry.lines.push(`  [${win.id}]`, ...rows.map((r) => r.text));
      geometry.total += rows.length;
      geometry.ok += rows.filter((r) => r.status === 'ok').length;
    });

    const text = report({ pixelLines, geometry, frames });
    writeFileSync(join(DIFF_DIR, 'report.txt'), text);
    console.log(text);
    console.log(`Wrote ${relative(ROOT, DIFF_DIR)}/ and ${relative(ROOT, SIDE_BY_SIDE_DIR)}/`);
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error(`winamp skin diff failed: ${err.message}`);
  process.exit(1);
});
