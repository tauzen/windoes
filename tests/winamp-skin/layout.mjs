/**
 * Reference layout of the classic Winamp 2.x base skin, as the diff harness
 * checks it (F005 notes, sections 3 and 4).
 *
 * Coordinates are `[x, y, w, h]` in pixels, relative to the top-left corner of
 * the window the item belongs to; a window's own rect is relative to `#winamp`.
 * `null` in a rect means the reference does not fix that value, so it is not
 * checked.
 *
 * `selector` is the element in the app document that must sit at `rect`.
 * Ids the app does not have yet are the ids the reskinned app is to use.
 * Items without a selector have no element of their own (a range thumb, a
 * pressed state) and are checked for their frames only.
 *
 * `frames` lists the skin frames (`.wa-<frame>` classes from
 * `scripts/build-winamp-skin.mjs`) that every state of the item needs. Frame
 * names follow the classic skin bitmap names (main, titlebar, cbuttons, …).
 * A slice that names its frames differently changes them here in the same
 * commit.
 */

const states = (base, list) => list.map((s) => (s ? `${base}-${s}` : base));
const pressed = (base) => states(base, ['', 'pressed']);
const toggle = (base) => states(base, ['off', 'off-pressed', 'on', 'on-pressed']);
const levels = (base) => Array.from({ length: 28 }, (_, i) => `${base}-${i}`);
const glyphs = (font, chars) => [...chars].map((c) => `${font}-${c.codePointAt(0)}`);

export const WINDOWS = [
  {
    id: 'main',
    selector: '#main-window',
    rect: [0, 0, 275, 116],
    items: [
      { name: 'background', frames: ['main-background'] },
      {
        name: 'title bar',
        selector: '#title-bar',
        rect: [0, 0, 275, 14],
        frames: states('titlebar', ['active', 'inactive']),
      },
      {
        name: 'options',
        selector: '#btn-options',
        rect: [6, 3, 9, 9],
        frames: pressed('titlebar-options'),
      },
      {
        name: 'minimize',
        selector: '#btn-minimize',
        rect: [244, 3, 9, 9],
        frames: pressed('titlebar-minimize'),
      },
      {
        name: 'shade',
        selector: '#btn-shade',
        rect: [254, 3, 9, 9],
        frames: pressed('titlebar-shade'),
      },
      {
        name: 'close',
        selector: '#btn-close',
        rect: [264, 3, 9, 9],
        frames: pressed('titlebar-close'),
      },
      {
        name: 'clutter bar',
        selector: '#clutter-bar',
        rect: [10, 22, 8, 43],
        frames: states('titlebar-clutter', ['', 'disabled']),
      },
      {
        name: 'play indicator',
        selector: '#play-indicator',
        rect: [26, 28, 9, 9],
        frames: states('playpaus', ['play', 'pause', 'stop']),
      },
      {
        name: 'work indicator',
        selector: '#work-indicator',
        rect: [24, 28, 3, 9],
        frames: states('playpaus-work', ['on', 'off']),
      },
      ...[48, 60, 78, 90].map((x, i) => ({
        name: `time digit ${i + 1}`,
        selector: `#time-digit-${i + 1}`,
        rect: [x, 26, 9, 13],
        frames: i === 0 ? glyphs('font-digits', '0123456789- ') : [],
      })),
      { name: 'time minus', selector: '#time-minus', rect: [null, null, 5, 1], frames: [] },
      { name: 'visualizer', selector: '#visualizer', rect: [24, 43, 76, 16], frames: [] },
      {
        name: 'marquee',
        selector: '#scrolling-title',
        rect: [111, 24, 154, 6],
        frames: glyphs(
          'font-small',
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ"@ 0123456789….:()-\'!_+\\/[]^&%,=$#ÅÖÄ?*'
        ),
      },
      { name: 'kbps', selector: '#bitrate-val', rect: [111, 43, 15, 6], frames: [] },
      { name: 'kHz', selector: '#freq-val', rect: [156, 43, 10, 6], frames: [] },
      {
        name: 'mono',
        selector: '#mono-indicator',
        rect: [212, 41, 27, 12],
        frames: states('monoster-mono', ['on', 'off']),
      },
      {
        name: 'stereo',
        selector: '#stereo-indicator',
        rect: [239, 41, 29, 12],
        frames: states('monoster-stereo', ['on', 'off']),
      },
      {
        name: 'seek bar',
        selector: '#seek-bar',
        rect: [16, 72, 248, 10],
        frames: ['posbar-background'],
      },
      { name: 'seek thumb', rect: [null, null, 29, 10], frames: pressed('posbar-thumb') },
      {
        name: 'volume',
        selector: '#volume-slider',
        rect: [107, 57, 68, 13],
        frames: levels('volume-level'),
      },
      { name: 'volume thumb', rect: [null, null, 14, 11], frames: pressed('volume-thumb') },
      {
        name: 'balance',
        selector: '#balance-slider',
        rect: [177, 57, 38, 13],
        frames: levels('balance-level'),
      },
      { name: 'balance thumb', rect: [null, null, 14, 11], frames: pressed('balance-thumb') },
      {
        name: 'EQ toggle',
        selector: '#btn-eq',
        rect: [219, 58, 23, 12],
        frames: toggle('shufrep-eq'),
      },
      {
        name: 'PL toggle',
        selector: '#btn-pl',
        rect: [242, 58, 23, 12],
        frames: toggle('shufrep-pl'),
      },
      ...[
        ['previous', '#btn-prev', 16, 23],
        ['play', '#btn-play', 39, 23],
        ['pause', '#btn-pause', 62, 23],
        ['stop', '#btn-stop', 85, 23],
        ['next', '#btn-next', 108, 22],
      ].map(([name, selector, x, w]) => ({
        name,
        selector,
        rect: [x, 88, w, 18],
        frames: pressed(`cbuttons-${name}`),
      })),
      {
        name: 'eject',
        selector: '#btn-open',
        rect: [136, 89, 22, 16],
        frames: pressed('cbuttons-eject'),
      },
      {
        name: 'shuffle',
        selector: '#btn-shuffle',
        rect: [164, 89, 47, 15],
        frames: toggle('shufrep-shuffle'),
      },
      {
        name: 'repeat',
        selector: '#btn-repeat',
        rect: [210, 89, 28, 15],
        frames: toggle('shufrep-repeat'),
      },
      { name: 'about', selector: '#btn-about', rect: [253, 91, 13, 15], frames: [] },
    ],
    // Areas that change while playing; window-relative.
    masks: [
      [111, 24, 154, 6], // marquee
      [36, 26, 63, 13], // time
      [24, 28, 11, 9], // play and work indicators
      [24, 43, 76, 16], // visualizer
      [111, 43, 15, 6], // kbps
      [156, 43, 10, 6], // kHz
      [16, 72, 248, 10], // seek thumb track
    ],
  },
  {
    id: 'equalizer',
    selector: '#eq-window',
    rect: [0, 116, 275, 116],
    items: [
      { name: 'background', frames: ['eqmain-background'] },
      {
        name: 'title bar',
        selector: '#eq-title-bar',
        rect: [0, 0, 275, 14],
        frames: states('eqmain-title', ['active', 'inactive']),
      },
      {
        name: 'shade',
        selector: '#eq-btn-shade',
        rect: [254, 3, 9, 9],
        frames: pressed('eqmain-shade'),
      },
      {
        name: 'close',
        selector: '#eq-btn-close',
        rect: [264, 3, 9, 9],
        frames: pressed('eqmain-close'),
      },
      { name: 'ON', selector: '#eq-on-btn', rect: [14, 18, 26, 12], frames: toggle('eqmain-on') },
      {
        name: 'AUTO',
        selector: '#eq-auto-btn',
        rect: [40, 18, 32, 12],
        frames: toggle('eqmain-auto'),
      },
      {
        name: 'PRESETS',
        selector: '#eq-presets-btn',
        rect: [217, 18, 44, 12],
        frames: pressed('eqmain-presets'),
      },
      {
        name: 'graph',
        selector: '#eq-graph',
        rect: [86, 17, 113, 19],
        frames: ['eqmain-graph-background', 'eqmain-graph-line-colors', 'eqmain-preamp-line'],
      },
      {
        name: 'preamp',
        selector: '#eq-preamp-slider',
        rect: [21, 38, 14, 63],
        frames: levels('eqmain-slider-level'),
      },
      ...Array.from({ length: 10 }, (_, n) => ({
        name: `band ${n + 1}`,
        selector: `#eq-bands .eq-band:nth-child(${n + 1}) input`,
        rect: [78 + 18 * n, 38, 14, 63],
        frames: [],
      })),
      { name: 'slider thumb', rect: [null, null, 11, 11], frames: pressed('eqmain-thumb') },
    ],
    masks: [],
  },
  {
    id: 'playlist',
    selector: '#playlist-window',
    rect: [0, 232, 275, 116],
    items: [
      {
        name: 'title bar',
        selector: '#playlist-title',
        rect: [0, 0, 275, 20],
        frames: [
          ...states('pledit-top-left', ['active', 'inactive']),
          ...states('pledit-top-tile', ['active', 'inactive']),
          ...states('pledit-top-right', ['active', 'inactive']),
          ...states('pledit-title', ['active', 'inactive']),
        ],
      },
      { name: 'close', frames: ['pledit-close-pressed'] },
      { name: 'shade', frames: ['pledit-shade-pressed'] },
      { name: 'side frame', frames: ['pledit-left-tile', 'pledit-right-tile'] },
      {
        name: 'rows',
        selector: '#playlist-tracks',
        rect: [12, 20, 243, 58],
        frames: glyphs(
          'font-playlist',
          Array.from({ length: 95 }, (_, i) => String.fromCodePoint(0x20 + i)).join('')
        ),
      },
      { name: 'scroll handle', rect: [null, null, 8, 18], frames: pressed('pledit-scroll-handle') },
      {
        name: 'bottom bar',
        frames: ['pledit-bottom-left', 'pledit-bottom-tile', 'pledit-bottom-right'],
      },
      ...[
        ['add', '#pl-add-btn', 14],
        ['rem', '#pl-rem-btn', 43],
        ['sel', '#pl-sel-btn', 72],
        ['misc', '#pl-misc-btn', 101],
      ].map(([name, selector, x]) => ({
        name: name.toUpperCase(),
        selector,
        rect: [x, 86, 22, 18],
        frames: [`pledit-${name}-pressed`],
      })),
      {
        name: 'LIST OPTS',
        selector: '#pl-listopts-btn',
        rect: [null, null, 22, 18],
        frames: ['pledit-list-opts-pressed'],
      },
      {
        name: 'running time',
        selector: '#playlist-running-time',
        rect: [132, 88, null, 6],
        frames: [],
      },
      { name: 'mini time', selector: '#playlist-mini-time', rect: [191, 101, null, 6], frames: [] },
    ],
    masks: [
      [12, 20, 243, 58], // rows
      // Running time and mini time, as wide as the longest text each shows
      // in the 5x6 font ("99:59/99:59" and "-99:59").
      [132, 88, 55, 6],
      [191, 101, 30, 6],
    ],
  },
];
