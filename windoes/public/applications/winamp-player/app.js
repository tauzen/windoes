(function () {
  'use strict';

  /**
   * A playlist entry. A local file has a blob `url`; a track from
   * tracks.json has a `key` and gets its `url` when it is signed.
   * @typedef {object} Track
   * @property {string} name
   * @property {string | null} url
   * @property {string} [key]
   * @property {number} duration
   * @property {number} [signedExpiresAt]
   */

  // ===== DOM HELPERS =====
  /**
   * Returns the element with this id. index.html defines every id the player
   * asks for, so a missing element or one of another kind is a markup bug.
   * @template {HTMLElement} T
   * @param {string} id
   * @param {{ new (): T }} type
   * @returns {T}
   */
  function byId(id, type) {
    const el = document.getElementById(id);
    if (!(el instanceof type)) throw new Error(`#${id} is missing or not a ${type.name}`);
    return el;
  }

  /**
   * @template T
   * @param {T | null | undefined} value
   * @param {string} what
   * @returns {T}
   */
  function required(value, what) {
    if (value == null) throw new Error(`${what} is missing`);
    return value;
  }

  // ===== SKIN SPRITES =====
  // skin/skin.css has one `.wa-<sheet>-<frame>` class per frame of the main
  // window art; an element shows one frame at a time.

  /**
   * Shows `frame` (`<sheet>-<frame>`, e.g. `cbuttons-play-pressed`) on `el`.
   * @param {Element} el
   * @param {string} frame
   */
  function setSprite(el, frame) {
    const name = 'wa-' + frame;
    if (el.classList.contains(name)) return;
    for (const c of Array.from(el.classList)) {
      if (c.startsWith('wa-')) el.classList.remove(c);
    }
    el.classList.add(name);
  }

  // Glyphs of the 5x6 small font (skin-src/font-small.txt).
  const SMALL_FONT = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ"@ 0123456789….:()-\'!_+\\/[]^&%,=$#ÅÖÄ?*');
  /** @type {Record<string, string>} */
  const SMALL_FONT_ALIASES = { '<': '[', '>': ']', '{': '[', '}': ']' };
  const GLYPH_WIDTH = 5;

  /**
   * The small-font glyph that draws `char`: upper case, `<>{}` as brackets,
   * any other character as a space.
   * @param {string} char
   */
  function smallFontGlyph(char) {
    const upper = char.toUpperCase();
    const glyph = SMALL_FONT_ALIASES[upper] ?? upper;
    return SMALL_FONT.has(glyph) ? glyph : ' ';
  }

  /**
   * Draws text in `el` as small-font glyph sprites, with the plain text for
   * screen readers beside them. Returns the row of glyphs.
   * @param {HTMLElement} el
   * @param {string} text what screen readers get
   * @param {string} [shown] what the glyphs draw, when it is not `text`
   */
  function writeSmallText(el, text, shown = text) {
    const label = document.createElement('span');
    label.className = 'sr-only';
    label.textContent = text;
    const row = document.createElement('span');
    row.className = 'glyphs';
    row.setAttribute('aria-hidden', 'true');
    for (const char of shown) {
      const glyph = document.createElement('span');
      setSprite(glyph, 'font-small-' + smallFontGlyph(char).codePointAt(0));
      row.append(glyph);
    }
    el.replaceChildren(label, row);
    return row;
  }

  // ===== STATE =====
  const state = {
    playlist: /** @type {Track[]} */ ([]),
    currentTrack: -1,
    selectedTrack: -1,
    isPlaying: false,
    isPaused: false,
    shuffle: false,
    repeat: false,
    eqEnabled: true,
    volume: 0.75,
    seekDragging: false,
  };

  // ===== AUDIO ENGINE =====
  /** @type {AudioContext | null} */
  let audioContext = null;
  /** @type {HTMLAudioElement | null} */
  let audioElement = null;
  /** @type {MediaElementAudioSourceNode | null} */
  let sourceNode = null;
  /** @type {GainNode | null} */
  let gainNode = null;
  /** @type {AnalyserNode | null} */
  let analyserNode = null;
  /** @type {StereoPannerNode | null} */
  let pannerNode = null;
  /** @type {BiquadFilterNode[]} */
  let eqFilters = [];
  let audioConnected = false;

  const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

  function initAudio() {
    if (audioContext) return;

    /** @type {typeof AudioContext} */
    const AudioContextClass = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    const context = new AudioContextClass();
    audioContext = context;
    audioElement = new Audio();
    audioElement.crossOrigin = 'anonymous';

    gainNode = context.createGain();

    analyserNode = context.createAnalyser();
    analyserNode.fftSize = 256;

    pannerNode = context.createStereoPanner();

    // Create EQ filters
    EQ_FREQUENCIES.forEach((freq, i) => {
      const filter = context.createBiquadFilter();
      filter.type =
        i === 0 ? 'lowshelf' : i === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.gain.value = 0;
      filter.Q.value = 1;
      eqFilters.push(filter);
    });
    applyEq();

    audioElement.addEventListener('timeupdate', onTimeUpdate);
    audioElement.addEventListener('ended', onTrackEnded);
    audioElement.addEventListener('loadedmetadata', onMetadataLoaded);
    audioElement.addEventListener('error', onAudioError);
  }

  function connectAudioGraph() {
    if (audioConnected) return;
    if (!audioContext || !audioElement || !gainNode || !pannerNode || !analyserNode) return;
    try {
      sourceNode = audioContext.createMediaElementSource(audioElement);
    } catch {
      return;
    }

    // The filters stay in the chain; with EQ off, applyEq sets them flat.
    /** @type {AudioNode} */
    let chain = sourceNode;
    eqFilters.forEach((filter) => {
      chain.connect(filter);
      chain = filter;
    });

    chain.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(analyserNode);
    analyserNode.connect(audioContext.destination);

    audioConnected = true;
  }

  // ===== REMOTE TRACK SIGNING =====
  // Tracks loaded from tracks.json carry a `key` (R2 object path) instead
  // of a direct `url`. We fetch a short-lived signed URL from the Worker
  // just before playback and cache it until it's about to expire.
  //
  // Inside the Windoes shell the player runs in an opaque-origin sandbox,
  // and the Worker accepts only the shell's origin. There the shell signs
  // and downloads the track and hands over its bytes; the player plays
  // them from a blob: URL it owns. Only the current track's blob is kept.
  const SIGN_REFRESH_MARGIN_MS = 30_000;
  const SHELL_FETCH_TIMEOUT_MS = 120_000;
  const framed = window.self !== window.top;
  let signEndpoint = '';
  /** @type {{ track: Track, url: string } | null} */
  let shellTrack = null;
  let nextShellRequestId = 0;

  /**
   * @param {Track} track
   * @returns {Promise<string | null>}
   */
  async function resolveTrackUrl(track) {
    if (framed && track.key && signEndpoint) {
      return resolveTrackViaShell(track);
    }
    const stillValid =
      track.url &&
      track.signedExpiresAt &&
      Date.now() + SIGN_REFRESH_MARGIN_MS < track.signedExpiresAt;
    if (track.url && (!track.key || stillValid)) {
      return track.url;
    }
    if (!track.key || !signEndpoint) {
      return track.url || null;
    }
    const endpoint = signEndpoint.replace(/\/+$/, '');
    const res = await fetch(`${endpoint}/sign?key=${encodeURIComponent(track.key)}`, {
      credentials: 'omit',
    });
    if (!res.ok) throw new Error(`sign request failed: ${res.status}`);
    const { url, expiresAt } = await res.json();
    track.url = url;
    track.signedExpiresAt = expiresAt;
    return url;
  }

  /** @param {Track} track */
  async function resolveTrackViaShell(track) {
    if (shellTrack && shellTrack.track === track) return shellTrack.url;
    const { buffer, mimeType } = await fetchTrackFromShell(track.key);
    if (shellTrack) URL.revokeObjectURL(shellTrack.url);
    const url = URL.createObjectURL(new Blob([buffer], { type: mimeType }));
    shellTrack = { track, url };
    return url;
  }

  /**
   * @param {string | undefined} key
   * @returns {Promise<{ buffer: ArrayBuffer, mimeType: string }>}
   */
  function fetchTrackFromShell(key) {
    return new Promise((resolve, reject) => {
      const requestId = `winamp-track-${++nextShellRequestId}`;
      const timer = setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('The shell did not deliver the track.'));
      }, SHELL_FETCH_TIMEOUT_MS);

      /** @param {MessageEvent} event */
      function onMessage(event) {
        if (event.source !== window.parent || !event.data) return;
        if (event.data.type !== 'winamp-track-fetch-result') return;
        if (event.data.requestId !== requestId) return;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        if (event.data.ok && event.data.buffer instanceof ArrayBuffer) {
          resolve({ buffer: event.data.buffer, mimeType: event.data.mimeType });
        } else {
          reject(new Error(event.data.error || 'track fetch failed'));
        }
      }

      window.addEventListener('message', onMessage);
      window.parent.postMessage(
        { type: 'winamp-track-fetch', requestId, key },
        window.location.origin
      );
    });
  }

  // ===== PLAYBACK =====
  /** @param {number} index */
  async function playTrack(index) {
    if (index < 0 || index >= state.playlist.length) return;

    initAudio();
    if (!audioContext || !audioElement) return;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    state.currentTrack = index;
    const track = state.playlist[index];

    updateScrollingTitle(track, index);
    highlightTrack(index);

    let url;
    try {
      url = await resolveTrackUrl(track);
    } catch (err) {
      console.error('Failed to resolve track URL:', err);
      return;
    }
    if (!url) return;
    // User skipped to a different track while we were signing.
    if (state.currentTrack !== index) return;

    audioElement.src = url;
    audioElement.load();

    connectAudioGraph();

    try {
      await audioElement.play();
      state.isPlaying = true;
      state.isPaused = false;
      updateUI();
    } catch (err) {
      console.error('Playback error:', err);
    }
  }

  function togglePlay() {
    if (state.playlist.length === 0) return;

    initAudio();
    if (!audioContext || !audioElement) return;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    if (!state.isPlaying && !state.isPaused) {
      playTrack(state.currentTrack >= 0 ? state.currentTrack : 0);
    } else if (state.isPaused) {
      audioElement.play();
      state.isPlaying = true;
      state.isPaused = false;
      updateUI();
    }
  }

  function pause() {
    if (!state.isPlaying || !audioElement) return;
    audioElement.pause();
    state.isPaused = true;
    state.isPlaying = false;
    updateUI();
  }

  function stop() {
    if (!audioElement) return;
    audioElement.pause();
    audioElement.currentTime = 0;
    state.isPlaying = false;
    state.isPaused = false;
    updateUI();
  }

  function prevTrack() {
    if (state.playlist.length === 0) return;
    let idx = state.currentTrack - 1;
    if (idx < 0) idx = state.playlist.length - 1;
    playTrack(idx);
  }

  function nextTrack() {
    if (state.playlist.length === 0) return;
    let idx;
    if (state.shuffle) {
      idx = Math.floor(Math.random() * state.playlist.length);
    } else {
      idx = state.currentTrack + 1;
      if (idx >= state.playlist.length) {
        if (state.repeat) {
          idx = 0;
        } else {
          stop();
          return;
        }
      }
    }
    playTrack(idx);
  }

  // ===== EVENT HANDLERS =====
  function onTimeUpdate() {
    if (state.seekDragging || !audioElement) return;
    const current = audioElement.currentTime;
    const duration = audioElement.duration || 0;

    renderTime(current);
    if (duration > 0) {
      seekBar.value = String((current / duration) * 100);
      paintSeek();
    }

    updatePlaylistTimeDisplay();
  }

  function onTrackEnded() {
    nextTrack();
  }

  function onMetadataLoaded() {
    if (!audioElement) return;
    const duration = audioElement.duration;
    if (state.currentTrack >= 0 && state.playlist[state.currentTrack]) {
      state.playlist[state.currentTrack].duration = duration;
      renderPlaylist();
      updateScrollingTitle(state.playlist[state.currentTrack], state.currentTrack);
    }
  }

  /** @param {Event} e */
  function onAudioError(e) {
    console.error('Audio error:', e);
    setMarquee('*** Error loading track ***');
  }

  // ===== PLAYLIST MANAGEMENT =====
  /**
   * @param {string} name
   * @param {string} url
   */
  function addTrack(name, url) {
    state.playlist.push({ name, url, duration: 0 });
    renderPlaylist();
    if (state.playlist.length === 1) {
      state.currentTrack = 0;
      highlightTrack(0);
      updateScrollingTitle(state.playlist[0], 0);
    }
  }

  /** @param {number} index */
  function removeTrack(index) {
    state.playlist.splice(index, 1);
    if (state.currentTrack === index) {
      stop();
      state.currentTrack = Math.min(index, state.playlist.length - 1);
    } else if (state.currentTrack > index) {
      state.currentTrack--;
    }
    if (state.selectedTrack === index) {
      state.selectedTrack = -1;
    } else if (state.selectedTrack > index) {
      state.selectedTrack--;
    }
    renderPlaylist();
  }

  /** @param {FileList} files */
  function handleFiles(files) {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|flac|m4a|aac|wma)$/i)) {
        const url = URL.createObjectURL(file);
        const name = file.name.replace(/\.[^.]+$/, '');
        addTrack(name, url);
      }
    });
  }

  // ===== RENDERING =====
  /**
   * @param {Track} track
   * @param {number} index
   */
  function updateScrollingTitle(track, index) {
    const durationStr = track.duration ? formatTime(track.duration) : '--:--';
    setMarquee(`${index + 1}. ${track.name} (${durationStr})`);
  }

  // ===== PLAYLIST =====
  // Rows are glyphs of the playlist font (skin-src/font-playlist.txt), an
  // alpha mask that CSS fills with the row colour. Each row has its text as
  // its accessible name.
  const trackList = byId('playlist-tracks', HTMLElement);
  const scrollHandle = byId('playlist-scroll-handle', HTMLElement);
  // The handle travels the 58 px scroll column less its own 18 px.
  const SCROLL_TOP = 20;
  const SCROLL_TRAVEL = 40;

  /**
   * The playlist-font code point that draws `char`: accents dropped, any
   * other character outside printable ASCII as `?`.
   * @param {string} char
   */
  function playlistGlyph(char) {
    const code = char.normalize('NFD').codePointAt(0) ?? 0x3f;
    return code >= 0x20 && code <= 0x7e ? code : 0x3f;
  }

  /**
   * A span of playlist-font glyphs drawing `text`.
   * @param {string} className
   * @param {string} text
   */
  function playlistText(className, text) {
    const row = document.createElement('span');
    row.className = className;
    for (const char of text) {
      const glyph = document.createElement('span');
      setSprite(glyph, 'font-playlist-' + playlistGlyph(char));
      row.append(glyph);
    }
    return row;
  }

  function renderPlaylist() {
    const rows = state.playlist.map((track, i) => {
      const name = `${i + 1}. ${track.name}`;
      const duration = formatTimeDuration(track.duration);
      const el = document.createElement('div');
      el.className = 'track-item';
      el.id = `pl-track-${i}`;
      el.setAttribute('role', 'option');
      el.setAttribute('aria-label', `${name} ${duration}`);
      el.append(playlistText('track-name', name), playlistText('track-duration', duration));
      el.addEventListener('click', () => selectTrack(i));
      el.addEventListener('dblclick', () => {
        selectTrack(i);
        playTrack(i);
      });
      return el;
    });
    trackList.replaceChildren(...rows);
    highlightTrack(state.currentTrack);
    selectTrack(state.selectedTrack);
    placeScrollHandle();
  }

  /**
   * Marks the current track (white text) and shows the playing track's time.
   * @param {number} index
   */
  function highlightTrack(index) {
    Array.from(trackList.children).forEach((el, i) => {
      el.classList.toggle('current', i === index);
    });
    updatePlaylistTimeDisplay();
  }

  /**
   * Selects a row (blue background); -1 selects none.
   * @param {number} index
   */
  function selectTrack(index) {
    state.selectedTrack = index;
    Array.from(trackList.children).forEach((el, i) => {
      el.classList.toggle('selected', i === index);
      el.setAttribute('aria-selected', String(i === index));
    });
    const row = trackList.children[index];
    if (row) {
      trackList.setAttribute('aria-activedescendant', row.id);
    } else {
      trackList.removeAttribute('aria-activedescendant');
    }
    updatePlaylistInfo();
  }

  /**
   * Scrolls the list so row `index` is in view. Rows are scrolled here, not
   * with scrollIntoView, which would also scroll the shell around the frame.
   * @param {number} index
   */
  function revealTrack(index) {
    const row = trackList.children[index];
    if (!(row instanceof HTMLElement)) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < trackList.scrollTop) trackList.scrollTop = top;
    else if (bottom > trackList.scrollTop + trackList.clientHeight) {
      trackList.scrollTop = bottom - trackList.clientHeight;
    }
  }

  function placeScrollHandle() {
    const max = trackList.scrollHeight - trackList.clientHeight;
    const offset = max > 0 ? Math.round((trackList.scrollTop / max) * SCROLL_TRAVEL) : 0;
    scrollHandle.style.top = `${SCROLL_TOP + offset}px`;
  }

  function updateUI() {
    byId('btn-play', HTMLElement).classList.toggle('active', state.isPlaying);
    byId('btn-pause', HTMLElement).classList.toggle('active', state.isPaused);
    highlightTrack(state.currentTrack);

    const status = state.isPlaying ? 'play' : state.isPaused ? 'pause' : 'stop';
    const loaded = status !== 'stop';
    setSprite(byId('play-indicator', HTMLElement), 'playpaus-' + status);
    setSprite(
      byId('work-indicator', HTMLElement),
      state.isPlaying ? 'playpaus-work-on' : 'playpaus-work-off'
    );
    // The player cannot read a stream's bit rate; it shows the nominal rate
    // of the tracks, and the rate the browser plays at.
    writeSmallText(byId('bitrate-val', HTMLElement), loaded ? NOMINAL_KBPS : '');
    const khz = audioContext ? String(Math.round(audioContext.sampleRate / 1000)).slice(-2) : '';
    writeSmallText(byId('freq-val', HTMLElement), loaded ? khz : '');
    setSprite(byId('mono-indicator', HTMLElement), 'monoster-mono-off');
    setSprite(
      byId('stereo-indicator', HTMLElement),
      loaded ? 'monoster-stereo-on' : 'monoster-stereo-off'
    );
    seekThumb.hidden = !loaded;

    if (!loaded && audioElement && audioElement.src) {
      renderTime(0);
      seekBar.value = '0';
      paintSeek();
    }
  }

  // Running time: the selected track's length over the playlist's total.
  function updatePlaylistInfo() {
    const total = state.playlist.reduce((sum, t) => sum + (t.duration || 0), 0);
    const selected = state.playlist[state.selectedTrack]?.duration || 0;
    writeSmallText(
      byId('playlist-running-time', HTMLElement),
      `${formatTimeLong(selected)}/${formatTimeLong(total)}`
    );
  }

  // Mini time: the playing or paused track's elapsed time; blank when stopped.
  function updatePlaylistTimeDisplay() {
    const loaded = state.isPlaying || state.isPaused;
    writeSmallText(
      byId('playlist-mini-time', HTMLElement),
      loaded && audioElement ? formatTime(audioElement.currentTime) : ''
    );
  }

  // ===== EQUALIZER =====
  // The preamp and the ten bands are vertical native range inputs (-12 to
  // +12 dB): each shows the level frame of its value and a sprite thumb that
  // follows it, as the main window's sliders do. The graph is drawn from the
  // eqmain sheet: its background, the preamp line, and a curve through the
  // bands whose pixels take the colour of their row.
  const EQ_BAND_PITCH = 18;
  const EQ_SLIDER_TRAVEL = 52; // 63 px slider minus the 11 px thumb
  // Initial band values in dB: a gentle loudness curve.
  const EQ_INITIAL = [3, 5, 4, 2, 0, -1, -2, -1, 1, 2];

  const eqGraphCanvas = byId('eq-graph', HTMLCanvasElement);
  const eqGraphCtx = required(eqGraphCanvas.getContext('2d'), 'EQ graph 2D context');
  const preampSlider = byId('eq-preamp-slider', HTMLInputElement);
  const preampThumb = byId('eq-preamp-thumb', HTMLElement);
  const eqTitleBar = byId('eq-title-bar', HTMLElement);
  /** @type {{ input: HTMLInputElement, thumb: HTMLElement }[]} */
  const eqBands = [];

  /**
   * Where `frame` sits in its sprite sheet, as skin.css places it.
   * @param {string} frame
   */
  function spriteSource(frame) {
    const probe = document.createElement('span');
    probe.className = 'wa-' + frame;
    probe.hidden = true;
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const [x, y] = style.backgroundPosition.split(' ').map((v) => -parseFloat(v));
    const url = required(/url\("?([^")]*)"?\)/.exec(style.backgroundImage), `${frame} sheet`)[1];
    probe.remove();
    return { url, x, y };
  }

  const EQ_GRAPH = {
    background: spriteSource('eqmain-graph-background'),
    colors: spriteSource('eqmain-graph-line-colors'),
    preamp: spriteSource('eqmain-preamp-line'),
  };
  const eqSheet = new Image();
  eqSheet.addEventListener('load', drawEqGraph);
  eqSheet.src = EQ_GRAPH.background.url;

  /**
   * Graph row of a value in dB: 0 at +12, the bottom row at -12.
   * @param {number} db
   */
  function graphRow(db) {
    const last = eqGraphCanvas.height - 1;
    return Math.max(0, Math.min(last, Math.round(((12 - db) / 24) * last)));
  }

  /**
   * Catmull-Rom curve through `values` at position `pos` (0 to length - 1).
   * @param {number[]} values
   * @param {number} pos
   */
  function curveAt(values, pos) {
    const i = Math.min(Math.floor(pos), values.length - 2);
    const t = pos - i;
    const at = (/** @type {number} */ k) => values[Math.max(0, Math.min(values.length - 1, k))];
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    return (
      0.5 *
      (2 * p1 +
        (p2 - p0) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
        (3 * p1 - p0 - 3 * p2 + p3) * t * t * t)
    );
  }

  function drawEqGraph() {
    if (!eqSheet.complete || !eqSheet.naturalWidth || !eqBands.length) return;
    const { width: w, height: h } = eqGraphCanvas;
    const { background, colors, preamp } = EQ_GRAPH;
    eqGraphCtx.drawImage(eqSheet, background.x, background.y, w, h, 0, 0, w, h);
    const preampRow = graphRow(Number(preampSlider.value));
    eqGraphCtx.drawImage(eqSheet, preamp.x, preamp.y, w, 1, 0, preampRow, w, 1);
    const values = eqBands.map(({ input }) => Number(input.value));
    /** @type {number | null} */
    let prev = null;
    for (let x = 0; x < w; x++) {
      const row = graphRow(curveAt(values, (x / (w - 1)) * (values.length - 1)));
      // Fill the column up to the previous row so the curve stays unbroken.
      const top = prev === null ? row : Math.min(row, prev + 1);
      const bottom = prev === null ? row : Math.max(row, prev - 1);
      for (let y = top; y <= bottom; y++) {
        eqGraphCtx.drawImage(eqSheet, colors.x, colors.y + y, 1, 1, x, y, 1, 1);
      }
      prev = row;
    }
  }

  /**
   * @param {HTMLInputElement} input
   * @param {HTMLElement} thumb
   */
  function paintEqSlider(input, thumb) {
    const min = Number(input.min);
    const fraction = (Number(input.value) - min) / (Number(input.max) - min);
    setSprite(input, 'eqmain-slider-level-' + level(fraction));
    thumb.style.top = input.offsetTop + Math.round((1 - fraction) * EQ_SLIDER_TRAVEL) + 'px';
  }

  /** Filters and preamp from the sliders; with EQ off the sound stays flat. */
  function applyEq() {
    eqBands.forEach(({ input }, i) => {
      if (eqFilters[i]) eqFilters[i].gain.value = state.eqEnabled ? Number(input.value) : 0;
    });
    applyGain();
  }

  /** Output gain: the volume, times the preamp while EQ is on. Every control that changes them calls this. */
  function applyGain() {
    if (!gainNode) return;
    const preamp = state.eqEnabled ? Math.pow(10, Number(preampSlider.value) / 20) : 1;
    gainNode.gain.value = state.volume * preamp;
  }

  function eqSliders() {
    return [{ input: preampSlider, thumb: preampThumb }, ...eqBands];
  }

  function paintEq() {
    for (const { input, thumb } of eqSliders()) paintEqSlider(input, thumb);
    applyEq();
    drawEqGraph();
  }

  function paintEqTitleBar() {
    setSprite(eqTitleBar, document.hasFocus() ? 'eqmain-title-active' : 'eqmain-title-inactive');
  }

  function buildEQ() {
    const container = byId('eq-bands', HTMLElement);
    EQ_FREQUENCIES.forEach((freq, i) => {
      const band = document.createElement('div');
      band.className = 'eq-band';
      band.style.left = i * EQ_BAND_PITCH + 'px';
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '-12';
      input.max = '12';
      input.value = String(EQ_INITIAL[i]);
      input.title = freq < 1000 ? `${freq} Hz` : `${freq / 1000} kHz`;
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.dataset.sprite = 'eqmain-thumb';
      band.append(input, thumb);
      container.append(band);
      eqBands.push({ input, thumb });
    });

    for (const { input, thumb } of eqSliders()) {
      input.addEventListener('input', () => {
        paintEqSlider(input, thumb);
        applyEq();
        drawEqGraph();
      });
      // Arrow keys move the focused slider only, not the player's volume and seek keys.
      input.addEventListener('keydown', (e) => {
        if (e.key.startsWith('Arrow')) e.stopPropagation();
      });
      pressOnPointer(input, thumb);
      paint(thumb);
    }
    /** @type {NodeListOf<HTMLElement>} */ (
      document.querySelectorAll('#eq-window button[data-sprite], #eq-window [data-toggle]')
    ).forEach((el) => {
      pressOnPointer(el, el);
      paint(el);
    });
    window.addEventListener('focus', paintEqTitleBar);
    window.addEventListener('blur', paintEqTitleBar);
    paintEqTitleBar();
    paintEq();
  }

  // ===== MAIN WINDOW DISPLAY =====
  const NOMINAL_KBPS = '128';

  // Marquee: a title wider than the field scrolls one glyph per step.
  const MARQUEE_STEP_MS = 200;
  const MARQUEE_GAP = '  ***  ';
  const marquee = byId('scrolling-title', HTMLElement);
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let marqueeTimer;

  /** @param {string} text */
  function setMarquee(text) {
    clearInterval(marqueeTimer);
    const length = [...text].length;
    if (length * GLYPH_WIDTH <= marquee.clientWidth) {
      writeSmallText(marquee, text);
      return;
    }
    const loop = text + MARQUEE_GAP;
    const period = [...loop].length;
    const row = writeSmallText(marquee, text, loop + loop);
    let step = 0;
    marqueeTimer = setInterval(() => {
      step = (step + 1) % period;
      row.style.transform = `translateX(${-step * GLYPH_WIDTH}px)`;
    }, MARQUEE_STEP_MS);
  }

  // Time: four 9x13 digits; a click switches between elapsed and remaining.
  const timeDigits = [1, 2, 3, 4].map((n) => byId(`time-digit-${n}`, HTMLElement));
  let showRemaining = false;

  /** @param {number} elapsed seconds into the track */
  function renderTime(elapsed) {
    const duration = audioElement?.duration || 0;
    const remaining = showRemaining && duration > 0;
    const text = formatTime(remaining ? Math.max(0, duration - elapsed) : elapsed);
    const digits = text.replace(':', '').slice(-4);
    timeDigits.forEach((el, i) => setSprite(el, 'font-digits-' + digits.codePointAt(i)));
    byId('time-minus', HTMLElement).hidden = !remaining;
    byId('time-text', HTMLElement).textContent = (remaining ? '-' : '') + text;
  }

  byId('time-display', HTMLElement).addEventListener('click', () => {
    showRemaining = !showRemaining;
    renderTime(state.isPlaying || state.isPaused ? audioElement?.currentTime || 0 : 0);
  });

  // Sliders: the native range input takes the input; the sprite thumb and the
  // level frame of the track follow its value.
  const LEVEL_FRAMES = 28;
  const seekBar = byId('seek-bar', HTMLInputElement);
  const seekThumb = byId('seek-thumb', HTMLElement);
  const volumeSlider = byId('volume-slider', HTMLInputElement);
  const volumeThumb = byId('volume-thumb', HTMLElement);
  const balanceSlider = byId('balance-slider', HTMLInputElement);
  const balanceThumb = byId('balance-thumb', HTMLElement);

  /**
   * @param {HTMLInputElement} input
   * @param {HTMLElement} thumb
   */
  function placeThumb(input, thumb) {
    const min = Number(input.min);
    const fraction = (Number(input.value) - min) / (Number(input.max) - min);
    const travel = input.offsetWidth - thumb.offsetWidth;
    thumb.style.left = input.offsetLeft + Math.round(fraction * travel) + 'px';
  }

  /** @param {number} fraction 0 to 1 */
  function level(fraction) {
    return Math.round(fraction * (LEVEL_FRAMES - 1));
  }

  function paintSeek() {
    placeThumb(seekBar, seekThumb);
  }

  function paintVolume() {
    setSprite(volumeSlider, 'volume-level-' + level(Number(volumeSlider.value) / 100));
    placeThumb(volumeSlider, volumeThumb);
  }

  function paintBalance() {
    setSprite(balanceSlider, 'balance-level-' + level(Math.abs(Number(balanceSlider.value)) / 100));
    placeThumb(balanceSlider, balanceThumb);
  }

  // Buttons and thumbs: `data-sprite` names the frame, `data-toggle` the
  // frames of an on/off button (state in its `active` class); either shows
  // its `-pressed` frame while the pointer is down on it. A button whose
  // normal look is part of the window art names only its `data-pressed` frame.
  /** @type {Set<HTMLElement>} */
  const pressed = new Set();

  /** @param {HTMLElement} el */
  function paint(el) {
    const suffix = pressed.has(el) ? '-pressed' : '';
    const toggle = el.dataset.toggle;
    if (toggle) {
      const on = el.classList.contains('active');
      setSprite(el, `${toggle}-${on ? 'on' : 'off'}${suffix}`);
      el.setAttribute('aria-pressed', String(on));
    } else if (el.dataset.pressed) {
      if (suffix) setSprite(el, el.dataset.pressed);
      else el.classList.remove(...Array.from(el.classList).filter((c) => c.startsWith('wa-')));
    } else {
      setSprite(el, el.dataset.sprite + suffix);
    }
  }

  /**
   * Shows `el` pressed while a pointer that went down on `target` is down.
   * @param {HTMLElement} target
   * @param {HTMLElement} el
   */
  function pressOnPointer(target, el) {
    target.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const release = () => {
        pressed.delete(el);
        paint(el);
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
      };
      pressed.add(el);
      paint(el);
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
    });
  }

  /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll('#main-window button[data-sprite], #main-window [data-toggle]')
  ).forEach((el) => {
    pressOnPointer(el, el);
    paint(el);
  });
  pressOnPointer(seekBar, seekThumb);
  pressOnPointer(volumeSlider, volumeThumb);
  pressOnPointer(balanceSlider, balanceThumb);

  // Title bar: lit while the player has focus.
  const titleBar = byId('title-bar', HTMLElement);
  function paintTitleBar() {
    setSprite(titleBar, document.hasFocus() ? 'titlebar-active' : 'titlebar-inactive');
  }
  window.addEventListener('focus', paintTitleBar);
  window.addEventListener('blur', paintTitleBar);

  // Playlist title bar: lit while the player has focus, as the main one.
  /** @type {NodeListOf<HTMLElement>} */
  const playlistTitlePieces = document.querySelectorAll('#playlist-title [data-frame]');
  function paintPlaylistTitle() {
    const lit = document.hasFocus() ? 'active' : 'inactive';
    playlistTitlePieces.forEach((el) => setSprite(el, `${el.dataset.frame}-${lit}`));
  }
  window.addEventListener('focus', paintPlaylistTitle);
  window.addEventListener('blur', paintPlaylistTitle);

  /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll('#playlist-window [data-pressed]')
  ).forEach((el) => {
    pressOnPointer(el, el);
    paint(el);
  });
  pressOnPointer(scrollHandle, scrollHandle);

  // ===== VISUALIZER =====
  // 19 bars, 3 px wide with a 1 px gap, over a dotted grid; a click switches
  // to the oscilloscope.
  const VIS_COLORS = {
    background: '#000000',
    dots: '#182129',
    // Bar colour per pixel row, top (loud) to bottom.
    bars: [
      '#ef3110',
      '#ce2910',
      '#d65a00',
      '#d66600',
      '#d67300',
      '#c67b08',
      '#dea518',
      '#d6b521',
      '#bdde29',
      '#94de21',
      '#29ce10',
      '#32be10',
      '#39b510',
      '#319c08',
      '#299400',
      '#188408',
    ],
    // Oscilloscope dot colour, by distance from the centre line.
    scope: ['#ffffff', '#d6d6de', '#b5bdbd', '#a0aaaf', '#949ca5'],
    peak: '#969696',
  };
  const VIS_BARS = 19;
  const VIS_BAR_WIDTH = 3;
  const VIS_BAR_STEP = 4;
  const VIS_PEAK_FALL = 0.2; // pixels per frame

  const visCanvas = byId('visualizer', HTMLCanvasElement);
  const visCtx = required(visCanvas.getContext('2d'), 'visualizer 2D context');
  const visWidth = visCanvas.width;
  const visHeight = visCanvas.height;
  const visGrid = document.createElement('canvas');
  visGrid.width = visWidth;
  visGrid.height = visHeight;
  const gridCtx = required(visGrid.getContext('2d'), 'visualizer grid 2D context');
  gridCtx.fillStyle = VIS_COLORS.background;
  gridCtx.fillRect(0, 0, visWidth, visHeight);
  gridCtx.fillStyle = VIS_COLORS.dots;
  for (let y = 1; y < visHeight; y += 2) {
    for (let x = 1; x < visWidth; x += 2) gridCtx.fillRect(x, y, 1, 1);
  }
  const peaks = new Float32Array(VIS_BARS);
  let visData = new Uint8Array(0);
  let visMode = 0;

  /** @param {Uint8Array} spectrum */
  function drawBars(spectrum) {
    const bins = spectrum.length;
    for (let i = 0; i < VIS_BARS; i++) {
      // Bars spread over the bins on a log scale, as pitch is heard.
      const from = Math.floor(Math.pow(bins, i / VIS_BARS));
      const to = Math.max(from + 1, Math.floor(Math.pow(bins, (i + 1) / VIS_BARS)));
      let loudest = 0;
      for (let b = from; b < to && b < bins; b++) loudest = Math.max(loudest, spectrum[b]);
      const height = Math.round((loudest / 255) * visHeight);
      const x = i * VIS_BAR_STEP;
      for (let y = visHeight - height; y < visHeight; y++) {
        visCtx.fillStyle = VIS_COLORS.bars[y];
        visCtx.fillRect(x, y, VIS_BAR_WIDTH, 1);
      }
      peaks[i] = Math.max(peaks[i] - VIS_PEAK_FALL, height);
      if (peaks[i] >= 1) {
        visCtx.fillStyle = VIS_COLORS.peak;
        visCtx.fillRect(x, visHeight - Math.ceil(peaks[i]), VIS_BAR_WIDTH, 1);
      }
    }
  }

  /** @param {Uint8Array} wave */
  function drawScope(wave) {
    const centre = (visHeight - 1) / 2;
    for (let x = 0; x < visWidth; x++) {
      const sample = wave[Math.floor((x * wave.length) / visWidth)];
      const y = Math.min(visHeight - 1, Math.floor((sample / 256) * visHeight));
      const shade = Math.min(VIS_COLORS.scope.length - 1, Math.floor(Math.abs(y - centre) / 2));
      visCtx.fillStyle = VIS_COLORS.scope[shade];
      visCtx.fillRect(x, y, 1, 1);
    }
  }

  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    visCtx.drawImage(visGrid, 0, 0);
    if (!analyserNode || !state.isPlaying) {
      peaks.fill(0);
      return;
    }
    if (visData.length !== analyserNode.frequencyBinCount) {
      visData = new Uint8Array(analyserNode.frequencyBinCount);
    }
    if (visMode === 0) {
      analyserNode.getByteFrequencyData(visData);
      drawBars(visData);
    } else {
      analyserNode.getByteTimeDomainData(visData);
      drawScope(visData);
    }
  }

  // ===== WIRE UP CONTROLS =====

  // Transport
  byId('btn-play', HTMLElement).addEventListener('click', togglePlay);
  byId('btn-pause', HTMLElement).addEventListener('click', pause);
  byId('btn-stop', HTMLElement).addEventListener('click', stop);
  byId('btn-prev', HTMLElement).addEventListener('click', prevTrack);
  byId('btn-next', HTMLElement).addEventListener('click', nextTrack);
  byId('btn-open', HTMLElement).addEventListener('click', () => {
    byId('file-input', HTMLInputElement).click();
  });

  const fileInput = byId('file-input', HTMLInputElement);
  fileInput.addEventListener('change', () => {
    if (fileInput.files) handleFiles(fileInput.files);
    fileInput.value = '';
  });

  // Volume
  volumeSlider.addEventListener('input', () => {
    state.volume = Number(volumeSlider.value) / 100;
    applyGain();
    paintVolume();
  });

  // Balance
  balanceSlider.addEventListener('input', () => {
    if (pannerNode) pannerNode.pan.value = Number(balanceSlider.value) / 100;
    paintBalance();
  });

  // Seek
  seekBar.addEventListener('mousedown', () => {
    state.seekDragging = true;
  });
  seekBar.addEventListener('input', () => {
    if (audioElement && audioElement.duration) {
      audioElement.currentTime = (Number(seekBar.value) / 100) * audioElement.duration;
    }
    paintSeek();
  });
  seekBar.addEventListener('mouseup', () => {
    state.seekDragging = false;
  });
  seekBar.addEventListener('touchstart', () => {
    state.seekDragging = true;
  });
  seekBar.addEventListener('touchend', () => {
    state.seekDragging = false;
  });

  // Shuffle / Repeat
  byId('btn-shuffle', HTMLElement).addEventListener('click', function () {
    state.shuffle = !state.shuffle;
    this.classList.toggle('active', state.shuffle);
    paint(this);
  });

  byId('btn-repeat', HTMLElement).addEventListener('click', function () {
    state.repeat = !state.repeat;
    this.classList.toggle('active', state.repeat);
    paint(this);
  });

  // EQ toggle
  byId('btn-eq', HTMLElement).addEventListener('click', function () {
    const eq = byId('eq-window', HTMLElement);
    const isVisible = eq.style.display !== 'none';
    eq.style.display = isVisible ? 'none' : 'block';
    this.classList.toggle('active', !isVisible);
    paint(this);
  });

  // PL toggle
  byId('btn-pl', HTMLElement).addEventListener('click', function () {
    const pl = byId('playlist-window', HTMLElement);
    const isVisible = pl.style.display !== 'none';
    pl.style.display = isVisible ? 'none' : 'block';
    this.classList.toggle('active', !isVisible);
    paint(this);
  });

  // EQ on/off: off leaves the sound flat and keeps the slider values.
  byId('eq-on-btn', HTMLElement).addEventListener('click', function () {
    state.eqEnabled = !state.eqEnabled;
    this.classList.toggle('active', state.eqEnabled);
    paint(this);
    applyEq();
  });

  // EQ auto: resets the bands and the preamp to 0 dB.
  byId('eq-auto-btn', HTMLElement).addEventListener('click', () => {
    for (const { input } of eqSliders()) input.value = '0';
    paintEq();
  });

  // The equalizer's close button hides it, as the main window's EQ toggle does.
  byId('eq-btn-close', HTMLElement).addEventListener('click', () => {
    byId('btn-eq', HTMLElement).click();
  });

  // Playlist buttons
  byId('pl-add-btn', HTMLElement).addEventListener('click', () => {
    byId('file-input', HTMLInputElement).click();
  });
  byId('pl-rem-btn', HTMLElement).addEventListener('click', () => {
    if (state.selectedTrack >= 0) removeTrack(state.selectedTrack);
  });
  // Closing the playlist is the main window's PL toggle turned off.
  byId('pl-btn-close', HTMLElement).addEventListener('click', () => {
    byId('btn-pl', HTMLElement).click();
  });

  // Playlist keys: arrows, Home and End select, Enter plays, Delete removes.
  trackList.addEventListener('keydown', (e) => {
    const last = state.playlist.length - 1;
    const current = state.selectedTrack;
    let next = current;
    switch (e.key) {
      case 'ArrowUp':
        next = Math.max(0, current - 1);
        break;
      case 'ArrowDown':
        next = Math.min(last, current + 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Enter':
        if (current >= 0) playTrack(current);
        break;
      case 'Delete':
        if (current >= 0) removeTrack(current);
        break;
      default:
        return;
    }
    // Keep the arrows from also changing the volume.
    e.preventDefault();
    e.stopPropagation();
    if (next !== current && last >= 0) {
      selectTrack(next);
      revealTrack(next);
    }
  });

  // Scrolling: the wheel and keys scroll the list; the handle follows, and
  // dragging the handle scrolls the list.
  trackList.addEventListener('scroll', placeScrollHandle);
  scrollHandle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const grab = e.clientY - scrollHandle.offsetTop;
    /** @param {PointerEvent} move */
    const drag = (move) => {
      const max = trackList.scrollHeight - trackList.clientHeight;
      const offset = Math.min(SCROLL_TRAVEL, Math.max(0, move.clientY - grab - SCROLL_TOP));
      trackList.scrollTop = (offset / SCROLL_TRAVEL) * max;
    };
    const release = () => {
      window.removeEventListener('pointermove', drag);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
    window.addEventListener('pointermove', drag);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  });

  // Playlist mini transport
  byId('pl-mini-prev', HTMLElement).addEventListener('click', prevTrack);
  byId('pl-mini-play', HTMLElement).addEventListener('click', togglePlay);
  byId('pl-mini-pause', HTMLElement).addEventListener('click', pause);
  byId('pl-mini-stop', HTMLElement).addEventListener('click', stop);
  byId('pl-mini-next', HTMLElement).addEventListener('click', nextTrack);
  byId('pl-mini-open', HTMLElement).addEventListener('click', () => {
    byId('file-input', HTMLInputElement).click();
  });

  // Visualizer click to toggle mode
  visCanvas.addEventListener('click', () => {
    visMode = (visMode + 1) % 2;
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        state.isPlaying ? pause() : togglePlay();
        break;
      case 'ArrowRight':
        if (audioElement) audioElement.currentTime += 5;
        break;
      case 'ArrowLeft':
        if (audioElement) audioElement.currentTime -= 5;
        break;
      case 'ArrowUp':
        state.volume = Math.min(1, state.volume + 0.05);
        applyGain();
        volumeSlider.value = String(state.volume * 100);
        paintVolume();
        break;
      case 'ArrowDown':
        state.volume = Math.max(0, state.volume - 0.05);
        applyGain();
        volumeSlider.value = String(state.volume * 100);
        paintVolume();
        break;
    }
  });

  // ===== ABOUT =====
  function showAbout() {
    byId('about-overlay', HTMLElement).classList.add('visible');
  }
  byId('btn-about', HTMLElement).addEventListener('click', showAbout);
  // The about dialog's close buttons call `closeAbout()` from inline
  // `onclick` attributes in index.html.
  Object.assign(window, {
    showAbout,
    closeAbout: function () {
      byId('about-overlay', HTMLElement).classList.remove('visible');
    },
  });

  // ===== UTILITIES =====
  /** @param {number} seconds */
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
  }

  /** @param {number} seconds */
  function formatTimeDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + s.toString().padStart(2, '0');
  }

  /** @param {number} seconds */
  function formatTimeLong(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + s.toString().padStart(2, '0');
  }

  // ===== INIT =====
  buildEQ();
  drawVisualizer();
  paintTitleBar();
  paintVolume();
  paintBalance();
  updateUI();
  renderTime(0);

  paintPlaylistTitle();
  renderPlaylist();

  // Load external tracks manifest (metadata only; MP3s live behind a
  // Cloudflare Worker that hands out short-lived signed URLs).
  fetch('tracks.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((manifest) => {
      if (!manifest) return;
      signEndpoint = manifest.signEndpoint || '';
      if (!signEndpoint || !Array.isArray(manifest.tracks)) return;
      let added = 0;
      for (const t of manifest.tracks) {
        if (!t || !t.key || !t.name) continue;
        state.playlist.push({
          name: t.name,
          key: t.key,
          url: null,
          duration: Number(t.duration) || 0,
        });
        added++;
      }
      if (added > 0) {
        state.currentTrack = 0;
        renderPlaylist();
        updateScrollingTitle(state.playlist[0], 0);
      }
    })
    .catch((err) => console.warn('tracks.json load failed:', err));
})();

// Iframe mode
if (window.self !== window.top) {
  document.body.style.background = 'transparent';
  document.body.style.minHeight = '0';
  document.body.style.overflow = 'hidden';
  const winampEl = document.getElementById('winamp');
  if (winampEl) {
    winampEl.style.position = 'relative';
    winampEl.style.top = '0';
    winampEl.style.left = '0';
  }

  // The close button asks the shell to close the window.
  document.getElementById('btn-close')?.addEventListener('click', () => {
    window.parent.postMessage({ type: 'winamp-close' }, '*');
  });

  // Report size to parent so iframe window can match
  function reportSize() {
    const winampEl = document.getElementById('winamp');
    if (winampEl) {
      const rect = winampEl.getBoundingClientRect();
      window.parent.postMessage(
        {
          type: 'winamp-resize',
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
        },
        '*'
      );
    }
  }

  // Report whenever the player's size changes — the playlist grows
  // after tracks.json loads asynchronously, and the EQ/PL windows
  // can be toggled at any time.
  if (winampEl && 'ResizeObserver' in window) {
    new ResizeObserver(() => reportSize()).observe(winampEl);
  }
  setTimeout(reportSize, 100);
}
