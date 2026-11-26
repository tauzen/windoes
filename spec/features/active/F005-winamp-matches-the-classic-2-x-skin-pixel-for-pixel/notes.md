# F005 notes · survey of the classic Winamp 2.x skin

Owner decision (ticket Notes): all art is our own pixel art, redrawn from reference screenshots. Original skin bitmaps and `.wsz` files are not downloaded, shipped, extracted or traced. Path (a), original bitmaps as CSS sprites, is dropped.

Coordinates below are `x,y wxh` in pixels, relative to the top-left corner of the window they belong to.

## 1. Reference screenshots

No reference screenshot found has a license that allows us to commit it. All of them show Nullsoft's skin art. `references/` holds only our own screenshots of the current app.

| Image | URL | Shows | Version | Scale | License | Committed |
|---|---|---|---|---|---|---|
| Skin Museum screenshot of `base-2.91.wsz` | https://r2.webampskins.org/screenshots/5e4f10275dcb1fb211d4a8b4f1bda236.png (page: https://skins.webamp.org/skin/5e4f10275dcb1fb211d4a8b4f1bda236) | main + EQ + playlist stacked, 275x348, playing, track 1 at 00:03 | base skin 2.91, rendered by Webamp | 1x | none stated; art is Nullsoft's | no, URL only |
| Internet Archive copy | https://archive.org/download/winampskins_base-2.91/base-2.91.png (item: https://archive.org/details/winampskins_base-2.91) | same composition, 275x348 | base skin 2.91, Webamp render; uploaded by the Webamp author 2023-07-30 | 1x | no license field in item metadata | no, URL only |
| Wikipedia `File:Winamp2.PNG` | https://upload.wikimedia.org/wikipedia/en/b/bc/Winamp2.PNG (page: https://en.wikipedia.org/wiki/File:Winamp2.PNG) | main + EQ + playlist stacked, 275x348, playing | real Winamp 2.x; an older base skin than 2.91 (playlist buttons `+FILE -FILE SEL ALL FILE INF LOAD LIST`, EQ labels `+20db/-20db`) [INFERENCE from the labels] | 1x | non-free, fair use on en.wikipedia only | no, URL only |
| Wikimedia Commons `File:Webamp_screenshot.png` | https://commons.wikimedia.org/wiki/File:Webamp_screenshot.png | Webamp with a third-party Xbox skin, 640x306 | not the base skin | 1x | CC BY-SA 4.0 | no, wrong skin |

SHA-256 at survey time: Museum PNG `6c6b81a825036fbff4ed4ca3c0008566157a5100a59a56e8c4bf261e2fa8f47c` (Last-Modified 2022-10-08); archive.org PNG `468fe16a…3a3231` (bytes differ from the Museum PNG; pixel identity not checked); Wikipedia PNG `22f58ced…ac7e5d`.

Recommended diff reference: the Skin Museum PNG. It is the 2.91 base skin the ticket names, at 1x, and Webamp states that it renders skins "pixel for pixel exactly how they were rendered in the Winamp 2.9" (https://docs.webamp.org/docs/features/skins). It is a Webamp render, not a capture of Winamp itself. The Wikipedia image is a real Winamp capture but of an older base skin, so it is useful for comparison by eye only.

Not found: a stopped-state reference. Every reference found shows playback. Stopped state differs from playing only in dynamic areas (time, play indicator, visualizer, marquee), so it adds one sprite (the stopped indicator) to the check. Pressed, inactive and LED-off states of buttons also appear in no reference found.

Committed in `references/` (our own art, from this repo):

- `current-1x-stopped.png`: the current app, 275x406, stopped. Chromium headless, device scale factor 1, shell viewport 1024x768, screenshot of the `#winampFrame` iframe after `WindoesApp.open.winamp()`.
- `current-1x-playing.png`: same, 2.5 s into a routed 30 s test tone (the track worker is stubbed as in `tests/test-app-sandbox.js`).

## 2. Where the original base-skin bitmaps come from, and their terms

Facts and sources only.

- Winamp 2.x builds the default skin into the program. Nullsoft also distributed it as a "base skin" for skin authors to paint over (https://winampskins.neocities.org/base, a fan tutorial; the official tutorial at http://wiki.winamp.com/wiki/Creating_Classic_Skins no longer resolves).
- Webamp ships it as `packages/webamp/assets/skins/base-2.91.wsz` and as an unpacked folder `.../skins/base-2.91/` (https://github.com/captbaritone/webamp/tree/master/packages/webamp/assets/skins/base-2.91). The folder holds the standard classic-skin bitmaps (`MAIN.BMP`, `CBUTTONS.BMP`, `TEXT.BMP`, …) and text files (`PLEDIT.TXT`, `VISCOLOR.TXT`, `REGION.TXT`).
- Webamp's README: "While the Winamp name, interface, and, sample audio file are surely property of Nullsoft, the code within this project is released under the MIT License." The MIT license covers Webamp's code, not the skin art.
- The Internet Archive and the Skin Museum host `base-2.91.wsz` (https://archive.org/details/winampskins_base-2.91) with no license field.
- The current owner of Winamp (Llama Group) published the Winamp desktop source in September 2024 under the "Winamp Collaborative License", which forbade distribution of modified versions, and deleted the repository in October 2024 (https://www.hackster.io/news/llama-group-releases-the-winamp-source-code-but-beware-its-restrictive-license-189e1b933c42). No license found grants reuse of the base-skin art.
- Webamp's code (MIT) documents the classic-skin layout: sprite names, sizes and window coordinates in `packages/webamp/js/skinSprites.ts` and `packages/webamp/css/*.css`. Sizes and coordinates in sections 3 and 4 come from there and from the reference screenshots, not from the bitmaps.

Disclosure: before the owner decision reached this job, the survey made a sparse clone of the Webamp `base-2.91/` folder into `/tmp` and read the bitmap headers and text files. That clone was deleted when the decision arrived. Nothing from it is in this commit, and section 4 does not depend on it.

## 3. Current app against the 2.91 reference

Current geometry was measured in the shell at 1x with `getBoundingClientRect` (script not committed). The app stacks three windows in one iframe: main at y0, EQ at y145, playlist at y300. The content is 407 px tall but the shell frame is 406 px, so the last pixel row is cut off.

### Main window

| Item | Current | Reference (2.91) |
|---|---|---|
| Size | 275x145 | 275x116 |
| Background | flat dark grey `rgb(35,35,41)` panels | blue-grey bitmap with bevelled frame, recessed display boxes, printed labels |
| Title bar | 14 px; lightning icon; spaced text `W I N A M P` on dark-blue gradient with thin gold lines; two text buttons `_` `×` at 252,3 | 14 px; options button 6,3; gold ribbed bars; bold pixel `WINAMP`; minimize 244,3, shade 254,3, close 264,3, each 9x9; active and inactive bitmaps |
| Display | one black box 8,20 259x58 | separate boxes drawn in the background art |
| Clutter bar | 9,21 8x56, letters O A I D V as text | 10,22 8x43 bitmap |
| Time | Courier New 26 px green text `00:00` at 31,25 88x26 | four 9x13 digit sprites at 39+(9,21,39,51),26; minus sign 5x1; colon is background art |
| Play indicator | text `▶` 7 px at 21,34 | 9x9 sprite at 26,28 (play, pause, stop) plus 3x9 work indicator at 24,28 |
| Visualizer | canvas 76x32 at 24,52; 16 bars 4 px wide, 1 px gap, 2 px segments; the display box ends at y78 | 76x16 at 24,43; 19 bars 3 px wide, 1 px gap, 16-step colour ramp, grey peak dots; oscilloscope mode |
| Marquee | Courier New 8 px at 125,25 136x14; empty when stopped | 154x6 at 111,24; 5x6 pixel font, upper case |
| kbps / kHz | Courier New 8 px in boxes at 128,63 and 171,63; labels as dim text | 5x6 font, 15x6 at 111,43 and 10x6 at 156,43; labels are background art |
| mono / stereo | Courier New 7 px text at 214,65 | 27x12 and 29x12 sprites at 212,41 and 239,41, lit and unlit |
| Seek bar | range input 8,86 259x10; gold thumb | 248x10 at 16,72; 29x10 thumb, normal and pressed |
| Volume | range input 8,107 130x10; segmented green-yellow-red LED bar; thumb 14x10 | 68x13 at 107,57; background colour shifts with level (28 frames); thumb 14x11 normal and pressed |
| Balance | range input 141,107 87x10; segmented bar | 38x13 at 177,57; 28 frames; thumb 14x11 |
| EQ / PL toggles | 16x15 at 233,104 and 251,104; Arial 6 px text | 23x12 at 219,58 and 242,58; LED; four states each |
| Transport | five 23x18 buttons at y122, x 7,30,53,76,99; icons drawn with CSS | y88, x 16,39,62,85 (23x18) and 108 (22x18); bitmap icons; normal and pressed |
| Eject | 23x18 at 128,122 | 22x16 at 136,89 |
| Shuffle | 55x15 at 157,124 with a checkbox | 47x15 at 164,89 with LED; four states |
| Repeat | 16x15 at 214,124 | 28x15 at 210,89; four states |
| Logo | lightning glyph near 255,128 | 13x15 about button at 253,91 |
| Fonts | Arial, Arial Narrow, Courier New; on Linux these resolve to fallback fonts | no system font in the main window |

### Equalizer

| Item | Current | Reference (2.91) |
|---|---|---|
| Size | 275x155 | 275x116 |
| Title bar | dark-blue gradient, gold lines, no buttons | 14 px bitmap, active and inactive; shade 254,3 and close 264,3 |
| ON | 22x15 at 9,21, green text | 26x12 at 14,18 with LED; four states |
| AUTO | 32x15 at 34,21 | 32x12 at 40,18; four states |
| PRESETS | 47x11 at 219,23 | 44x12 at 217,18; normal and pressed |
| Graph | canvas 115x21 at 85,18; green curve on black | 113x19 at 86,17; grid background, curve colour depends on height, preamp line 113x1 |
| Preamp slider | range input 14x90 at 14,50; red-yellow-green track; gold thumb 16x6 | 14x63 at 21,38; coloured bar background (28 frames); thumb 11x11 normal and pressed |
| Band sliders | ten range inputs, 90 px tall, area 65,43 201x97 | ten 14x63 at x 78+18n, y38 |
| dB labels | small grey text `+12dB`, `0dB`, `-12dB` | gold pixel text `+12 db`, `+0 db`, `-12 db` at 45,36 / 45,64 / 45,95, in background art |
| Frequency labels | grey text `70 180 320 600 1K 3K 6K 12K 14K 16K` along y144 | `60 170 310 600 1K 3K 6K 12K 14K 16K` in background art. The current labels also disagree with the app's own filters (`EQ_FREQUENCIES` in `app.js` is 60, 170, 310, …) |

### Playlist

| Item | Current | Reference (2.91) |
|---|---|---|
| Size | 275x107 (last row clipped by the shell frame) | 275x116 at default size; resizable in 25x29 steps |
| Title bar | 14 px, gradient and gold lines, no buttons | 20 px: corners 25x20, tiles 25x20, centre title 100x20; active and inactive; shade and close 9x9 at right |
| Side frame | 4 px margins | left tile 12 px; right tile 20 px holding the scrollbar (handle 8x18, normal and pressed) |
| Rows | Courier New, 14 px pitch; current track has blue background and white text | proportional system font, 13 px pitch; Arial, normal text `#00FF00`, current track `#FFFFFF`, background `#000000`, selected row `#0000C6` (Webamp's `defaultPlaylistStyle` in `packages/webamp/js/selectors.ts`) |
| Bottom bar | buttons ADD REM SEL MISC as Arial 7 px text, 27x11 etc. at y86; LIST OPTS 22x16 | 38 px: left 125x38 with four 22x18 buttons at x 14,43,72,101, y86; right 150x38 with LIST OPTS 22x18, running time, mini transport and resize grip; 25x38 tile between |
| Info | `15:46` total length and `0:00:00:00` LED clock, Courier New | running time `4:00/12:16` (selected/total) at 7,10 and mini time `00:03` at 66,23 of the right block, 5x6 font |
| Mini transport | 36x6 strip of CSS glyphs | six 10x10 hit areas at 3,22 of the right block, art in background |
| Menus | ADD/REM/SEL/MISC act directly | each opens a vertical sprite menu (3 to 4 buttons of 22x18 plus a 3 px bar). Adding menus is new behaviour and outside this ticket unless the owner asks |
| Visualizer slot | none | 75x38 block between left and right parts when the window is wider than 275 |

## 4. Plan for our own pixel art (path b)

### Sprite inventory

Sizes come from the reference screenshots and the Webamp layout code (section 2). "States" lists every bitmap the sprite needs. Window shade mode (14 px tall windows), the clutter-bar functions and playlist menus are out of scope unless the owner adds them; their sprites are listed under "deferred".

Main window:

| Sprite | Size | States | Count |
|---|---|---|---|
| Background (frame, display boxes, labels `kbps` `kHz`, colon) | 275x116 | 1 | 1 |
| Title bar | 275x14 | active, inactive | 2 |
| Title buttons: options, minimize, shade, close | 9x9 | normal, pressed | 8 |
| Clutter bar | 8x43 | normal, disabled | 2 |
| Play / pause / stop indicator | 9x9 | 3 | 3 |
| Work indicator | 3x9 | on, off | 2 |
| Large digits 0–9, minus, blank | 9x13 | 1 | 12 |
| Mono, stereo | 27x12, 29x12 | lit, unlit | 4 |
| Seek background | 248x10 | 1 | 1 |
| Seek thumb | 29x10 | normal, pressed | 2 |
| Volume background | 68x13 (+2 px pitch) | 28 level frames | 28, generated |
| Volume thumb | 14x11 | normal, pressed | 2 |
| Balance background | 38x13 | 28 frames | 28, generated |
| Balance thumb | 14x11 | normal, pressed | 2 |
| Previous, play, pause, stop | 23x18 | normal, pressed | 8 |
| Next | 22x18 | normal, pressed | 2 |
| Eject | 22x16 | normal, pressed | 2 |
| Shuffle | 47x15 | off, off-pressed, on, on-pressed | 4 |
| Repeat | 28x15 | same four | 4 |
| EQ, PL toggles | 23x12 | same four | 8 |

Equalizer:

| Sprite | Size | States | Count |
|---|---|---|---|
| Background (frame, dB and frequency labels) | 275x116 | 1 | 1 |
| Title bar | 275x14 | active, inactive | 2 |
| Shade, close | 9x9 | normal, pressed | 4 |
| ON | 26x12 | off, off-pressed, on, on-pressed | 4 |
| AUTO | 32x12 | same four | 4 |
| PRESETS | 44x12 | normal, pressed | 2 |
| Graph background | 113x19 | 1 | 1 |
| Graph line colour ramp | 1x19 | 1 | 1 |
| Preamp line | 113x1 | 1 | 1 |
| Slider bar (preamp and 10 bands) | 14x63 | 28 level frames | 28, generated |
| Slider thumb | 11x11 | normal, pressed | 2 |

Playlist:

| Sprite | Size | States | Count |
|---|---|---|---|
| Top-left corner, top tile, top-right corner | 25x20 | active, inactive | 6 |
| Title | 100x20 | active, inactive | 2 |
| Left tile | 12x29 | 1 | 1 |
| Right tile (scroll track) | 20x29 | 1 | 1 |
| Scroll handle | 8x18 | normal, pressed | 2 |
| Bottom-left block (ADD REM SEL MISC art) | 125x38 | 1 | 1 |
| Bottom tile | 25x38 | 1 | 1 |
| Bottom-right block (LIST OPTS, time box, mini transport, grip) | 150x38 | 1 | 1 |
| Bottom button pressed states: ADD, REM, SEL, MISC, LIST OPTS | 22x18 | pressed | 5 |
| Close, shade | 9x9 | pressed | 2 |

Deferred (shade mode, menus, playlist visualizer slot): main shade background 275x14 x2, shade position bar 17x7 and thumbs 3x7 x3, EQ shade 275x14 x2 and its sliders 3x7 x6, playlist shade 25x14/50x14 x4, 16 menu items 22x18 x2 states, 5 menu bars 3x54/3x72, visualizer slot 75x38.

In-scope total: 125 main, 50 EQ and 22 playlist bitmaps, 197 in all, plus 65 font glyphs. 84 of the 197 are level frames that the build script generates from a colour ramp. The other 113 are drawn by hand; 10 of them are large (backgrounds 275x116, title bars 275x14, playlist title 100x20, playlist bottom blocks 125x38 and 150x38).

### Fonts

- Small font, 5x6 cells, upper case only (lower case maps to upper case). Glyph set, as in Winamp's text bitmap layout documented by Webamp's `FONT_LOOKUP`: `A–Z`, `"`, `@`, space; `0–9`, `…`, `.`, `:`, `(`, `)`, `-`, `'`, `!`, `_`, `+`, `\`, `/`, `[`, `]`, `^`, `&`, `%`, `,`, `=`, `$`, `#`; `Å`, `Ö`, `Ä`, `?`, `*`. `<` `>` `{` `}` render as `[` `]`. Any other character renders as a space. 65 glyphs. Used by the marquee, kbps, kHz, the playlist running time and mini time.
- Large digits, 9x13: `0–9`, minus, blank (12 sprites, in the main inventory).
- Playlist rows: Winamp 2.91 draws them with a system font, not a bitmap. See open question 2.
- Labels such as `PRESETS`, `SHUFFLE`, `+12 db`, `60 … 16K` are part of the sprite art, not text.

### Tool and format

- Source of truth: plain-text pixel files under `windoes/public/applications/winamp-player/skin-src/`, one file per sheet. Each file has a palette (one character per colour, `#RRGGBB` or transparent) and named frames as character grids. Text keeps reviews in Git readable (a one-pixel change is a one-character diff) and needs no editor licence.
- Level-frame sets (volume, balance, EQ bars) are defined by a ramp and a frame template, and the build script generates the 28 frames.
- Build: `scripts/build-winamp-skin.mjs`, Node only, using the built-in `zlib` for a small PNG writer (the repo has no image library, and none is needed). Output: `windoes/public/applications/winamp-player/skin/*.png` sprite sheets plus a generated CSS file of sprite classes (`background-position`, width, height). Output is deterministic.
- The generated PNGs and CSS are committed, because the app is served as static files from `public/` with no build step. A check (`node scripts/build-winamp-skin.mjs --check`) fails when the committed output differs from a fresh build; it belongs in the Winamp app test.
- Rendering: absolutely positioned elements with sprite backgrounds, all sizes in whole pixels, `image-rendering: pixelated`. Keep the native range inputs for behaviour and keyboard access and draw their thumbs and tracks with sprites, as Webamp does. Text is a row of 5x6 glyph elements (or a 2D canvas) per text field. The visualizer stays a canvas, 76x16, with the reference geometry.

### How the diff is measured

- Reference: the Skin Museum PNG, fetched at check time by URL and verified against the SHA-256 in section 1, into a git-ignored cache. It is never committed.
- Capture: Playwright, Chromium, device scale factor 1, the shell at 1024x768, screenshot of the app iframe. The app stacks its windows like the reference (main y0, EQ y116, playlist y232), so a capture is 275x348 and crops line up.
- App state before capture, set through the DOM: volume, balance, preamp and ten band values matching the reference thumbs; EQ ON and AUTO matching the reference LEDs; EQ and PL toggles on; shuffle and repeat off; playing.
- Masks (dynamic areas, window-relative): main marquee 111,24 154x6; time 36,26 63x13; indicators 24,28 11x9; visualizer 24,43 76x16; kbps 111,43 15x6; kHz 156,43 10x6; seek thumb track 16,72 248x10. Playlist list area 12,20 243x58 (rows); running time and mini time boxes in the bottom-right block.
- Metric: number of pixels outside the masks whose RGB differs from the reference, tolerance 0. The report gives the count per window and its share of unmasked pixels.
- Diff image per window: our capture in grey, differing pixels in red, masks hatched. It contains no reference pixels, so it can be committed. The comparison runs in Chromium canvas (`getImageData`), so no new dependency.
- The side-by-side images that the ticket's first acceptance line asks for contain reference pixels. See open question 3.

### Effort, fidelity, risk

- Effort: four worker jobs in order. (1) Build script, PNG writer, `--check`, diff harness with masks, 5x6 font and large digits. (2) Main window art and layout. (3) EQ art and layout. (4) Playlist art and layout. Each job is mostly hand pixel work on about 20 to 40 bitmaps, and each one can prove itself with the diff harness from job 1. `index.html` (1631 lines, mostly CSS) is largely rewritten; `app.js` changes where it writes text (marquee, time, kbps), draws the visualizer and labels the EQ.
- Fidelity: geometry, layout and every state can match exactly. Pixel content can reach zero diff against the reference only by copying the reference pixel values one by one. See open question 1.
- Risk: states that no reference shows (pressed, inactive, LED off, 27 of 28 level frames) have to be designed by us, so they are unverified by any diff. Playlist rows in a system font cannot be made identical across operating systems. A shell window at a fractional position, or a display with a device scale factor other than 1, will blur or rescale the art; the check runs at 1x only.

## Open questions for the owner

1. Pixel-exact against a screenshot means our art equals Nullsoft's art pixel for pixel, even if it is redrawn by hand. Is that what "redrawn from the reference screenshots" allows, or should the acceptance allow a tolerance (exact geometry and states, colours within a limit, a capped share of differing pixels)? Recommended: keep exact geometry and states, and set a pixel tolerance that the owner picks.
2. Playlist rows: the 2.91 original uses a system font. The ticket says text renders with a bitmap font. Recommended: draw our own proportional pixel font for rows (about 95 printable ASCII glyphs, 13 px pitch) and keep rows in the dynamic mask.
3. Side-by-side images with the reference cannot be committed under any license found. Recommended: the diff harness writes them to a git-ignored folder for local review, and only our diff images are committed.
