#!/usr/bin/env node
/**
 * Builds the Winamp skin from text pixel sources.
 *
 *   node scripts/build-winamp-skin.mjs            write skin/ from skin-src/
 *   node scripts/build-winamp-skin.mjs --check    fail when skin/ differs from a fresh build
 *   node scripts/build-winamp-skin.mjs --preview out.png
 *                                                 also draw every font and a sample line at 1x
 *
 * Every `skin-src/<sheet>.txt` becomes `skin/<sheet>.png`, and all sheets
 * together become `skin/skin.css`, one class `.wa-<sheet>-<frame>` per frame.
 * The app is served from `public/` without a build step, so the output is
 * committed; `--check` (run by the Winamp app test) keeps it in step.
 *
 * Source format, one directive per line; `#` at line start is a comment:
 *
 *   mode background|mask   background: the sheet is a sprite background.
 *                          mask: the sheet is an alpha mask filled with
 *                          `currentColor` (text whose colour CSS picks).
 *   width N                frames pack left to right in file order and wrap
 *                          before they pass N pixels.
 *   size WxH               optional: every frame must have this size.
 *   color C #RRGGBB        palette entry: grid character C is this colour.
 *   color C none           grid character C is transparent.
 *   ramp C #RRGGBB #RRGGBB ...
 *                          grid character C takes a colour from these stops,
 *                          linearly, per frame of a `levels` set.
 *   frame NAME             a frame; its grid rows follow, all one width.
 *   glyph X                a font glyph for the single character X (or the
 *                          word `space`); its frame name is the code point.
 *   levels NAME N          a template grid drawn N times as NAME-0..NAME-(N-1);
 *                          ramp characters run from the first stop to the last.
 *
 * All art in skin-src/ is drawn for Windoes. Nothing is taken from Winamp's
 * own bitmaps or from screenshots of it.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync, crc32 } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const APP_DIR = join(ROOT, 'windoes/public/applications/winamp-player');
export const SRC_DIR = join(APP_DIR, 'skin-src');
export const OUT_DIR = join(APP_DIR, 'skin');
const CSS_FILE = 'skin.css';

const range = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => String.fromCodePoint(from + i));

/** Characters each font sheet must define, no more and no fewer. */
export const FONT_CHARSETS = {
  // Winamp's 5x6 text font: upper case, digits and the punctuation the
  // classic text bitmap holds. Lower case maps to upper case when drawn.
  'font-small': [
    ...range(0x41, 0x5a),
    '"',
    '@',
    ' ',
    ...range(0x30, 0x39),
    '…',
    '.',
    ':',
    '(',
    ')',
    '-',
    "'",
    '!',
    '_',
    '+',
    '\\',
    '/',
    '[',
    ']',
    '^',
    '&',
    '%',
    ',',
    '=',
    '$',
    '#',
    'Å',
    'Ö',
    'Ä',
    '?',
    '*',
  ],
  // The 9x13 time digits: 0-9, the minus sign and a blank.
  'font-digits': [...range(0x30, 0x39), '-', ' '],
  // Playlist rows: printable ASCII.
  'font-playlist': range(0x20, 0x7e),
};

// ── Parsing ─────────────────────────────────────────────────────────────────

class SkinSourceError extends Error {}

function fail(file, line, message) {
  throw new SkinSourceError(`${file}:${line}: ${message}`);
}

function parseColor(file, line, text) {
  if (text === 'none') return [0, 0, 0, 0];
  const m = /^#([0-9a-fA-F]{6})$/.exec(text);
  if (!m) fail(file, line, `colour must be #RRGGBB or none, got "${text}"`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

/** Parse one source file into { name, mode, width, size, frames[] }. */
export function parseSheet(file, text) {
  const name = file.replace(/\.txt$/, '');
  const sheet = { name, mode: null, width: null, size: null, frames: [] };
  const palette = new Map();
  const ramps = new Map();
  const lines = text.split('\n');
  let block = null; // the frame, glyph or levels block whose rows are being read

  const closeBlock = () => {
    if (!block) return;
    if (block.rows.length === 0)
      fail(file, block.line, `${block.kind} "${block.label}" has no rows`);
    sheet.frames.push(...expandBlock(file, block, palette, ramps));
    block = null;
  };

  lines.forEach((raw, index) => {
    const line = index + 1;
    const text = raw.replace(/\r$/, '');
    if (text.startsWith('#')) return;
    if (text.trim() === '') {
      closeBlock();
      return;
    }
    const [word, ...args] = text.split(' ');
    if (block && !['frame', 'glyph', 'levels'].includes(word)) {
      block.rows.push({ text, line });
      return;
    }
    closeBlock();
    switch (word) {
      case 'mode':
        if (!['background', 'mask'].includes(args[0]))
          fail(file, line, 'mode is background or mask');
        sheet.mode = args[0];
        break;
      case 'width':
        sheet.width = Number(args[0]);
        if (!Number.isInteger(sheet.width) || sheet.width < 1) fail(file, line, 'bad width');
        break;
      case 'size': {
        const m = /^(\d+)x(\d+)$/.exec(args[0] || '');
        if (!m) fail(file, line, 'size is WxH');
        sheet.size = [Number(m[1]), Number(m[2])];
        break;
      }
      case 'color':
      case 'ramp': {
        const [char, ...values] = args;
        if ([...(char || '')].length !== 1) fail(file, line, 'palette key is one character');
        if (palette.has(char) || ramps.has(char)) fail(file, line, `"${char}" is defined twice`);
        if (word === 'color') {
          if (values.length !== 1) fail(file, line, 'color takes one value');
          palette.set(char, parseColor(file, line, values[0]));
        } else {
          if (values.length < 2) fail(file, line, 'ramp takes two or more stops');
          ramps.set(
            char,
            values.map((v) => parseColor(file, line, v))
          );
        }
        break;
      }
      case 'frame':
        if (!/^[a-z0-9][a-z0-9-]*$/.test(args.join(' ')))
          fail(file, line, 'frame names are lower-case letters, digits and "-"');
        block = { kind: 'frame', label: args[0], line, rows: [] };
        break;
      case 'glyph': {
        const label = text.slice('glyph '.length);
        const char = label === 'space' ? ' ' : label;
        if ([...char].length !== 1) fail(file, line, 'glyph takes one character or "space"');
        block = { kind: 'glyph', label, char, line, rows: [] };
        break;
      }
      case 'levels': {
        const count = Number(args[1]);
        if (!/^[a-z0-9][a-z0-9-]*$/.test(args[0] || '') || !Number.isInteger(count) || count < 2)
          fail(file, line, 'levels takes a name and a count of 2 or more');
        block = { kind: 'levels', label: args[0], count, line, rows: [] };
        break;
      }
      default:
        fail(file, line, `unknown directive "${word}"`);
    }
  });
  closeBlock();

  if (!sheet.mode) fail(file, 1, 'missing "mode"');
  if (!sheet.width) fail(file, 1, 'missing "width"');
  const seen = new Set();
  for (const frame of sheet.frames) {
    if (seen.has(frame.name)) fail(file, frame.line, `frame "${frame.name}" is defined twice`);
    seen.add(frame.name);
    if (sheet.size && (frame.w !== sheet.size[0] || frame.h !== sheet.size[1]))
      fail(
        file,
        frame.line,
        `frame is ${frame.w}x${frame.h}, sheet size is ${sheet.size.join('x')}`
      );
    if (frame.w > sheet.width) fail(file, frame.line, `frame is wider than the sheet`);
  }
  checkCharset(file, sheet);
  return sheet;
}

function lerpStops(stops, t) {
  const pos = t * (stops.length - 1);
  const i = Math.min(Math.floor(pos), stops.length - 2);
  const f = pos - i;
  return stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
}

/** Turn one parsed block into frames with RGBA pixels. */
function expandBlock(file, block, palette, ramps) {
  const width = [...block.rows[0].text].length;
  for (const row of block.rows) {
    if ([...row.text].length !== width)
      fail(file, row.line, `row is ${[...row.text].length} wide, first row is ${width}`);
    for (const char of row.text) {
      if (!palette.has(char) && !ramps.has(char))
        fail(file, row.line, `"${char}" is not in the palette`);
    }
  }
  const draw = (t) => {
    const pixels = new Uint8Array(width * block.rows.length * 4);
    block.rows.forEach((row, y) => {
      [...row.text].forEach((char, x) => {
        const rgba = palette.get(char) ?? lerpStops(ramps.get(char), t);
        pixels.set(rgba, (y * width + x) * 4);
      });
    });
    return pixels;
  };
  const base = { w: width, h: block.rows.length, line: block.line };
  if (block.kind === 'levels') {
    return Array.from({ length: block.count }, (_, i) => ({
      ...base,
      name: `${block.label}-${i}`,
      pixels: draw(i / (block.count - 1)),
    }));
  }
  if (block.kind === 'glyph') {
    return [
      { ...base, name: String(block.char.codePointAt(0)), char: block.char, pixels: draw(0) },
    ];
  }
  return [{ ...base, name: block.label, pixels: draw(0) }];
}

function checkCharset(file, sheet) {
  const expected = FONT_CHARSETS[sheet.name];
  const glyphs = sheet.frames.filter((f) => f.char !== undefined).map((f) => f.char);
  if (!expected) {
    if (glyphs.length)
      fail(file, 1, `glyphs belong in a font sheet (${Object.keys(FONT_CHARSETS)})`);
    return;
  }
  const missing = expected.filter((c) => !glyphs.includes(c));
  const extra = glyphs.filter((c) => !expected.includes(c));
  if (missing.length) fail(file, 1, `missing glyphs: ${JSON.stringify(missing.join(''))}`);
  if (extra.length) fail(file, 1, `glyphs outside the charset: ${JSON.stringify(extra.join(''))}`);
  if (glyphs.length !== sheet.frames.length) fail(file, 1, 'a font sheet holds only glyphs');
}

// ── Packing and output ──────────────────────────────────────────────────────

/** Place frames on shelves in file order; returns the sheet height. */
function pack(sheet) {
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const frame of sheet.frames) {
    if (x + frame.w > sheet.width) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    frame.x = x;
    frame.y = y;
    x += frame.w;
    shelf = Math.max(shelf, frame.h);
  }
  return y + shelf;
}

/** Compose packed frames into one RGBA image. */
function compose(sheet, height) {
  const image = { w: sheet.width, h: height, pixels: new Uint8Array(sheet.width * height * 4) };
  for (const frame of sheet.frames) blit(image, frame, frame.x, frame.y);
  return image;
}

function blit(image, frame, left, top) {
  for (let y = 0; y < frame.h; y++) {
    for (let x = 0; x < frame.w; x++) {
      const src = (y * frame.w + x) * 4;
      if (frame.pixels[src + 3] === 0) continue;
      image.pixels.set(frame.pixels.subarray(src, src + 4), ((top + y) * image.w + left + x) * 4);
    }
  }
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function ihdr(w, h) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, deflate, no filter, no interlace
  return header;
}

/** Scanlines as stored in IDAT before compression: filter byte 0, then RGBA. */
function scanlines({ w, h, pixels }) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw.set(pixels.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  return raw;
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Encode an RGBA image { w, h, pixels } as a PNG. */
export function encodePng(image) {
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr(image.w, image.h)),
    chunk('IDAT', deflateSync(scanlines(image), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Header and inflated IDAT of a PNG this script wrote. `--check` compares
 * these, not the file bytes, so another zlib version cannot fail the check.
 */
function pngContent(bytes) {
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  let header = null;
  const idat = [];
  for (let at = 8; at + 12 <= bytes.length; ) {
    const length = bytes.readUInt32BE(at);
    const type = bytes.toString('latin1', at + 4, at + 8);
    const data = bytes.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') header = Buffer.from(data);
    if (type === 'IDAT') idat.push(data);
    at += 12 + length;
  }
  if (!header) return null;
  try {
    return { header, raw: inflateSync(Buffer.concat(idat)) };
  } catch {
    return null;
  }
}

function cssFor(sheets) {
  const lines = [
    '/* Generated by scripts/build-winamp-skin.mjs from skin-src/. Do not edit. */',
    '',
  ];
  for (const sheet of sheets) {
    const classes = sheet.frames.map((f) => `.wa-${sheet.name}-${f.name}`);
    lines.push(`${classes.join(',\n')} {`);
    if (sheet.mode === 'mask') {
      lines.push(
        `  mask-image: url(${sheet.name}.png);`,
        '  mask-repeat: no-repeat;',
        '  background-color: currentColor;'
      );
    } else {
      lines.push(
        `  background-image: url(${sheet.name}.png);`,
        '  background-repeat: no-repeat;',
        '  image-rendering: pixelated;'
      );
    }
    lines.push('}');
    const property = sheet.mode === 'mask' ? 'mask-position' : 'background-position';
    for (const f of sheet.frames) {
      const pos = `${f.x ? -f.x + 'px' : 0} ${f.y ? -f.y + 'px' : 0}`;
      lines.push(
        `.wa-${sheet.name}-${f.name} { ${property}: ${pos}; width: ${f.w}px; height: ${f.h}px; }`
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Build every sheet in memory.
 * Returns { sheets, files }: parsed sheets with packed frame positions, and
 * output file name → { png: image } or { text }.
 */
export function buildSkin(srcDir = SRC_DIR) {
  const sources = readdirSync(srcDir)
    .filter((f) => f.endsWith('.txt'))
    .sort();
  const sheets = sources.map((file) => parseSheet(file, readFileSync(join(srcDir, file), 'utf8')));
  const files = new Map();
  for (const sheet of sheets) {
    files.set(`${sheet.name}.png`, { png: compose(sheet, pack(sheet)) });
  }
  files.set(CSS_FILE, { text: cssFor(sheets) });
  return { sheets, files };
}

/** Every difference between `outDir` and a fresh build, as messages. */
export function checkSkin(files, outDir = OUT_DIR) {
  const problems = [];
  const present = existsSync(outDir) ? readdirSync(outDir) : [];
  for (const name of present) {
    if (!files.has(name)) problems.push(`${name}: not produced by the build`);
  }
  for (const [name, file] of files) {
    if (!present.includes(name)) {
      problems.push(`${name}: missing`);
      continue;
    }
    const bytes = readFileSync(join(outDir, name));
    if (file.text !== undefined) {
      if (bytes.toString('utf8') !== file.text) problems.push(`${name}: differs`);
      continue;
    }
    const content = pngContent(bytes);
    if (
      !content ||
      !content.header.equals(ihdr(file.png.w, file.png.h)) ||
      !content.raw.equals(scanlines(file.png))
    ) {
      problems.push(`${name}: pixels differ`);
    }
  }
  return problems;
}

function writeSkin(files, outDir = OUT_DIR) {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  for (const [name, file] of files) {
    writeFileSync(join(outDir, name), file.text ?? encodePng(file.png));
  }
}

// ── Owner preview ───────────────────────────────────────────────────────────

const PREVIEW_SAMPLES = {
  'font-small': [
    "WINAMP 2.91 *** 1. DJ MIKE LLAMA - LLAMA WHIPPIN' INTRO (0:05) ***",
    '128 44 4:00/12:16 00:03 ÅÖÄ',
  ],
  'font-digits': ['00 03', '-12 59'], // the colon is window art, not a glyph
  'font-playlist': [
    "1. DJ Mike Llama - Llama Whippin' Intro      0:05",
    'The quick brown fox jumps over the lazy dog.',
    '0123456789 !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
  ],
};
const PREVIEW_BACKGROUND = [0, 0, 0, 255];
const PREVIEW_MASK_INK = [0, 255, 0, 255];
const PREVIEW_GAP = 4;

/** Draw a string with a font sheet's glyphs; returns its frames and x offsets. */
function layoutText(sheet, text) {
  const byChar = new Map(sheet.frames.map((f) => [f.char, f]));
  let x = 0;
  const placed = [...text].map((char) => {
    const frame = byChar.get(char);
    if (!frame) throw new SkinSourceError(`${sheet.name}: no glyph for ${JSON.stringify(char)}`);
    const at = x;
    x += frame.w;
    return { frame, x: at };
  });
  return { placed, w: x, h: Math.max(...placed.map((p) => p.frame.h)) };
}

/** One 1x image: each font's packed sheet, then its sample lines. */
export function renderPreview(sheets) {
  const fonts = sheets.filter((s) => FONT_CHARSETS[s.name]);
  const blocks = [];
  for (const sheet of fonts) {
    const ink = (frame) => (sheet.mode === 'mask' ? tint(frame, PREVIEW_MASK_INK) : frame);
    blocks.push({
      w: sheet.width,
      h: Math.max(...sheet.frames.map((f) => f.y + f.h)),
      items: sheet.frames.map((f) => ({ frame: ink(f), x: f.x, y: f.y })),
    });
    for (const text of PREVIEW_SAMPLES[sheet.name]) {
      const line = layoutText(sheet, text);
      blocks.push({
        w: line.w,
        h: line.h,
        items: line.placed.map((p) => ({ frame: ink(p.frame), x: p.x, y: 0 })),
      });
    }
  }
  const w = Math.max(...blocks.map((b) => b.w)) + PREVIEW_GAP * 2;
  const h = blocks.reduce((sum, b) => sum + b.h + PREVIEW_GAP, PREVIEW_GAP);
  const image = { w, h, pixels: new Uint8Array(w * h * 4) };
  for (let i = 0; i < w * h; i++) image.pixels.set(PREVIEW_BACKGROUND, i * 4);
  let top = PREVIEW_GAP;
  for (const block of blocks) {
    for (const item of block.items) blit(image, item.frame, PREVIEW_GAP + item.x, top + item.y);
    top += block.h + PREVIEW_GAP;
  }
  return image;
}

function tint(frame, rgba) {
  const pixels = new Uint8Array(frame.pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    if (frame.pixels[i + 3]) pixels.set(rgba, i);
  }
  return { ...frame, pixels };
}

// ── Command line ────────────────────────────────────────────────────────────

function main(argv) {
  const check = argv.includes('--check');
  const previewAt = argv.indexOf('--preview');
  let built;
  try {
    built = buildSkin();
  } catch (err) {
    if (!(err instanceof SkinSourceError)) throw err;
    console.error(`skin-src error: ${err.message}`);
    return 1;
  }
  const counts = built.sheets.map((s) => `${s.name} ${s.frames.length}`).join(', ');
  if (check) {
    const problems = checkSkin(built.files);
    if (problems.length) {
      console.error('skin/ is out of date with skin-src/:');
      for (const p of problems) console.error(`  ${p}`);
      console.error('Run: node scripts/build-winamp-skin.mjs');
      return 1;
    }
    console.log(`skin/ matches skin-src/ (${counts})`);
  } else {
    writeSkin(built.files);
    console.log(`Wrote ${built.files.size} files to skin/ (${counts})`);
  }
  if (previewAt !== -1) {
    const out = argv[previewAt + 1];
    if (!out) {
      console.error('--preview needs a file path');
      return 1;
    }
    writeFileSync(out, encodePng(renderPreview(built.sheets)));
    console.log(`Wrote preview ${out}`);
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
