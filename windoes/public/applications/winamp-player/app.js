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

  // ===== STATE =====
  const state = {
    playlist: /** @type {Track[]} */ ([]),
    currentTrack: -1,
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
  const EQ_LABELS = ['70', '180', '320', '600', '1K', '3K', '6K', '12K', '14K', '16K'];

  function initAudio() {
    if (audioContext) return;

    /** @type {typeof AudioContext} */
    const AudioContextClass = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    const context = new AudioContextClass();
    audioContext = context;
    audioElement = new Audio();
    audioElement.crossOrigin = 'anonymous';

    gainNode = context.createGain();
    gainNode.gain.value = state.volume;

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

    /** @type {AudioNode} */
    let chain = sourceNode;

    if (state.eqEnabled) {
      eqFilters.forEach((filter) => {
        chain.connect(filter);
        chain = filter;
      });
    }

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

    byId('time-display', HTMLElement).textContent = formatTime(current);
    if (duration > 0) {
      const pct = (current / duration) * 100;
      byId('seek-bar', HTMLInputElement).value = String(pct);
      byId('seek-fill', HTMLElement).style.width = pct + '%';
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
    byId('scrolling-title', HTMLElement).textContent = '*** Error loading track ***';
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
    const el = byId('scrolling-title', HTMLElement);
    el.textContent = `${index + 1}. ${track.name} (${durationStr})`;
  }

  function renderPlaylist() {
    const container = byId('playlist-tracks', HTMLElement);
    container.innerHTML = '';

    state.playlist.forEach((track, i) => {
      const el = document.createElement('div');
      el.className = 'track-item' + (i === state.currentTrack ? ' active' : '');
      el.innerHTML = `
              <span class="track-num">${i + 1}.</span>
              <span class="track-name">${escapeHtml(track.name)}</span>
              <span class="track-duration">${track.duration ? formatTimeDuration(track.duration) : '--:--'}</span>
          `;
      el.addEventListener('dblclick', () => playTrack(i));
      el.addEventListener('click', () => {
        document.querySelectorAll('.track-item').forEach((t) => t.classList.remove('active'));
        el.classList.add('active');
      });
      container.appendChild(el);
    });

    updatePlaylistInfo();
  }

  /** @param {number} index */
  function highlightTrack(index) {
    document.querySelectorAll('.track-item').forEach((el, i) => {
      el.classList.toggle('active', i === index);
      el.classList.toggle('playing', i === index && state.isPlaying);
    });
  }

  function updateUI() {
    byId('btn-play', HTMLElement).classList.toggle('active', state.isPlaying);
    byId('btn-pause', HTMLElement).classList.toggle('active', state.isPaused);
    highlightTrack(state.currentTrack);

    const indicator = byId('play-indicator', HTMLElement);
    if (state.isPlaying) {
      indicator.textContent = '\u25B6';
    } else if (state.isPaused) {
      indicator.textContent = '\u275A\u275A';
    } else {
      indicator.textContent = '';
    }

    if (!state.isPlaying && !state.isPaused && audioElement && audioElement.src) {
      byId('time-display', HTMLElement).textContent = '00:00';
      byId('seek-bar', HTMLInputElement).value = '0';
      byId('seek-fill', HTMLElement).style.width = '0%';
    }
  }

  function updatePlaylistInfo() {
    const total = state.playlist.reduce((sum, t) => sum + (t.duration || 0), 0);
    byId('playlist-total-length', HTMLElement).textContent = formatTimeLong(total);
  }

  function updatePlaylistTimeDisplay() {
    if (audioElement && audioElement.currentTime) {
      byId('playlist-total-time', HTMLElement).textContent = formatTimeWithHours(
        audioElement.currentTime
      );
    }
  }

  // ===== EQUALIZER =====
  const eqGraphCanvas = byId('eq-graph', HTMLCanvasElement);
  const eqGraphCtx = required(eqGraphCanvas.getContext('2d'), 'EQ graph 2D context');

  function drawEqGraph() {
    const w = eqGraphCanvas.width;
    const h = eqGraphCanvas.height;
    eqGraphCtx.fillStyle = '#000';
    eqGraphCtx.fillRect(0, 0, w, h);

    eqGraphCtx.fillStyle = '#3a3a1e';
    eqGraphCtx.fillRect(0, Math.floor(h / 2), w, 1);

    const sliders = /** @type {NodeListOf<HTMLInputElement>} */ (
      document.querySelectorAll('#eq-bands .eq-slider')
    );
    if (!sliders.length) return;
    const values = Array.from(sliders).map((s) => parseFloat(s.value));

    eqGraphCtx.strokeStyle = '#00cc00';
    eqGraphCtx.lineWidth = 1;
    eqGraphCtx.beginPath();
    for (let x = 0; x < w; x++) {
      const pos = (x / (w - 1)) * (values.length - 1);
      const i = Math.min(Math.floor(pos), values.length - 2);
      const t = pos - i;
      const v = values[i] * (1 - t) + values[i + 1] * t;
      const y = h / 2 - (v / 12) * (h / 2 - 2);
      if (x === 0) {
        eqGraphCtx.moveTo(x + 0.5, y);
      } else {
        eqGraphCtx.lineTo(x + 0.5, y);
      }
    }
    eqGraphCtx.stroke();
  }

  function buildEQ() {
    const container = byId('eq-bands', HTMLElement);
    container.innerHTML = '';

    // Add dB labels between preamp and sliders
    const eqBody = required(container.parentElement, 'EQ body');
    let dbLabels = eqBody.querySelector('.eq-db-labels');
    if (!dbLabels) {
      dbLabels = document.createElement('div');
      dbLabels.className = 'eq-db-labels';
      dbLabels.innerHTML = '<span>+12dB</span><span>0dB</span><span>-12dB</span>';
      eqBody.insertBefore(dbLabels, container);
    }

    // Initial slider positions for a natural curve
    const initValues = [3, 5, 4, 2, 0, -1, -2, -1, 1, 2];

    EQ_LABELS.forEach((label, i) => {
      const band = document.createElement('div');
      band.className = 'eq-band';
      band.innerHTML = `
              <input type="range" class="eq-slider" min="-12" max="12" value="${initValues[i]}"
                     data-band="${i}" title="${label}">
          `;
      const slider = required(band.querySelector('input'), 'EQ band slider');
      slider.addEventListener('input', () => {
        if (eqFilters[i]) {
          eqFilters[i].gain.value = parseFloat(slider.value);
        }
        drawEqGraph();
      });
      container.appendChild(band);
    });

    const labelsContainer = byId('eq-freq-labels', HTMLElement);
    labelsContainer.innerHTML = '';
    EQ_LABELS.forEach((label) => {
      const span = document.createElement('span');
      span.textContent = label;
      labelsContainer.appendChild(span);
    });
  }

  // ===== VISUALIZER =====
  const visCanvas = byId('visualizer', HTMLCanvasElement);
  visCanvas.width = 76;
  visCanvas.height = 32;
  const visCtx = required(visCanvas.getContext('2d'), 'visualizer 2D context');
  let visMode = 0;

  // Visualizer bar rendering config
  const VIS_BAR_COUNT = 16;
  const VIS_BAR_WIDTH = 4;
  const VIS_BAR_GAP = 1;
  const VIS_SEG_HEIGHT = 2;
  const VIS_SEG_GAP = 1;
  const VIS_SEG_STEP = VIS_SEG_HEIGHT + VIS_SEG_GAP;
  const VIS_MAX_SEGS = Math.floor(visCanvas.height / VIS_SEG_STEP);

  /**
   * @param {number} seg
   * @param {number} totalSegs
   */
  function getSegColor(seg, totalSegs) {
    const ratio = seg / totalSegs;
    if (ratio < 0.55) {
      return '#22cc22';
    } else if (ratio < 0.75) {
      return '#88cc22';
    } else if (ratio < 0.88) {
      return '#cccc22';
    } else {
      return '#cc6622';
    }
  }

  /** @param {number[]} heights */
  function drawBars(heights) {
    visCtx.fillStyle = '#000';
    visCtx.fillRect(0, 0, visCanvas.width, visCanvas.height);
    for (let i = 0; i < heights.length; i++) {
      const segs = Math.round((heights[i] / 32) * VIS_MAX_SEGS);
      const x = i * (VIS_BAR_WIDTH + VIS_BAR_GAP);
      for (let s = 0; s < segs; s++) {
        const y = visCanvas.height - s * VIS_SEG_STEP - VIS_SEG_HEIGHT;
        visCtx.fillStyle = getSegColor(s, VIS_MAX_SEGS);
        visCtx.fillRect(x, y, VIS_BAR_WIDTH, VIS_SEG_HEIGHT);
      }
    }
  }

  const staticBarHeights = new Array(VIS_BAR_COUNT).fill(0);

  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);

    if (!analyserNode || !state.isPlaying) {
      drawBars(staticBarHeights);
      return;
    }

    const bufferLength = analyserNode.frequencyBinCount;

    if (visMode === 0) {
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      const heights = [];
      for (let i = 0; i < VIS_BAR_COUNT; i++) {
        const dataIndex = Math.floor((i * bufferLength) / VIS_BAR_COUNT);
        heights.push((dataArray[dataIndex] / 255) * visCanvas.height);
      }
      drawBars(heights);
    } else {
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteTimeDomainData(dataArray);

      visCtx.fillStyle = '#000';
      visCtx.fillRect(0, 0, visCanvas.width, visCanvas.height);

      visCtx.lineWidth = 1;
      visCtx.strokeStyle = '#00cc00';
      visCtx.beginPath();

      const sliceWidth = visCanvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * visCanvas.height) / 2;

        if (i === 0) {
          visCtx.moveTo(x, y);
        } else {
          visCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      visCtx.stroke();
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

  // Volume (track art is a static gradient bar like the classic skin)
  const volumeSlider = byId('volume-slider', HTMLInputElement);
  volumeSlider.addEventListener('input', () => {
    state.volume = Number(volumeSlider.value) / 100;
    if (gainNode) gainNode.gain.value = state.volume;
  });

  // Balance
  const balanceSlider = byId('balance-slider', HTMLInputElement);
  balanceSlider.addEventListener('input', () => {
    if (pannerNode) pannerNode.pan.value = Number(balanceSlider.value) / 100;
  });

  // Seek
  const seekBar = byId('seek-bar', HTMLInputElement);
  const seekFill = byId('seek-fill', HTMLElement);
  function updateSeekFill() {
    seekFill.style.width = seekBar.value + '%';
  }
  updateSeekFill();
  seekBar.addEventListener('mousedown', () => {
    state.seekDragging = true;
  });
  seekBar.addEventListener('input', () => {
    if (audioElement && audioElement.duration) {
      audioElement.currentTime = (Number(seekBar.value) / 100) * audioElement.duration;
    }
    updateSeekFill();
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
    byId('shuffle-check', HTMLElement).classList.toggle('checked', state.shuffle);
  });

  byId('btn-repeat', HTMLElement).addEventListener('click', function () {
    state.repeat = !state.repeat;
    this.classList.toggle('active', state.repeat);
    byId('repeat-check', HTMLElement).classList.toggle('checked', state.repeat);
  });

  // EQ toggle
  byId('btn-eq', HTMLElement).addEventListener('click', function () {
    const eq = byId('eq-window', HTMLElement);
    const isVisible = eq.style.display !== 'none';
    eq.style.display = isVisible ? 'none' : 'block';
    this.classList.toggle('active', !isVisible);
  });

  // PL toggle
  byId('btn-pl', HTMLElement).addEventListener('click', function () {
    const pl = byId('playlist-window', HTMLElement);
    const isVisible = pl.style.display !== 'none';
    pl.style.display = isVisible ? 'none' : 'block';
    this.classList.toggle('active', !isVisible);
  });

  // EQ on/off
  byId('eq-on-btn', HTMLElement).addEventListener('click', function () {
    state.eqEnabled = !state.eqEnabled;
    this.classList.toggle('active', state.eqEnabled);
  });

  // EQ auto (reset to defaults)
  byId('eq-auto-btn', HTMLElement).addEventListener('click', function () {
    // Reset all EQ band sliders to 0
    /** @type {NodeListOf<HTMLInputElement>} */ (
      document.querySelectorAll('.eq-sliders-section .eq-slider')
    ).forEach((slider, i) => {
      slider.value = '0';
      if (eqFilters[i]) {
        eqFilters[i].gain.value = 0;
      }
    });
    // Reset preamp
    byId('eq-preamp-slider', HTMLInputElement).value = '0';
    if (gainNode) {
      gainNode.gain.value = state.volume;
    }
    drawEqGraph();
  });

  // EQ preamp
  const preampSlider = byId('eq-preamp-slider', HTMLInputElement);
  preampSlider.addEventListener('input', () => {
    if (gainNode) {
      const preampGain = Math.pow(10, parseFloat(preampSlider.value) / 20);
      gainNode.gain.value = state.volume * preampGain;
    }
  });

  // Playlist buttons
  byId('pl-add-btn', HTMLElement).addEventListener('click', () => {
    byId('file-input', HTMLInputElement).click();
  });
  byId('pl-rem-btn', HTMLElement).addEventListener('click', () => {
    const active = document.querySelector('.track-item.active');
    if (active) {
      const idx = Array.from(required(active.parentNode, 'track list').children).indexOf(active);
      removeTrack(idx);
    }
  });

  // Playlist mini transport
  byId('pl-mini-prev', HTMLElement).addEventListener('click', prevTrack);
  byId('pl-mini-play', HTMLElement).addEventListener('click', togglePlay);
  byId('pl-mini-pause', HTMLElement).addEventListener('click', pause);
  byId('pl-mini-stop', HTMLElement).addEventListener('click', stop);
  byId('pl-mini-next', HTMLElement).addEventListener('click', nextTrack);

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
        if (gainNode) gainNode.gain.value = state.volume;
        volumeSlider.value = String(state.volume * 100);
        break;
      case 'ArrowDown':
        state.volume = Math.max(0, state.volume - 0.05);
        if (gainNode) gainNode.gain.value = state.volume;
        volumeSlider.value = String(state.volume * 100);
        break;
    }
  });

  // ===== ABOUT =====
  // The about dialog's close buttons call `closeAbout()` from inline
  // `onclick` attributes in index.html.
  Object.assign(window, {
    showAbout: function () {
      byId('about-overlay', HTMLElement).classList.add('visible');
    },
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

  /** @param {number} seconds */
  function formatTimeWithHours(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return (
      h +
      ':' +
      m.toString().padStart(2, '0') +
      ':' +
      s.toString().padStart(2, '0') +
      ':' +
      ms.toString().padStart(2, '0')
    );
  }

  /** @param {string} text */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== INIT =====
  buildEQ();
  drawEqGraph();
  drawVisualizer();

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

  // Wire close buttons to notify parent
  /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.title-btn')).forEach(
    (btn) => {
      if (btn.title === 'Close') {
        btn.style.visibility = 'visible';
        btn.addEventListener('click', () => {
          window.parent.postMessage({ type: 'winamp-close' }, '*');
        });
      }
    }
  );

  // Report size to parent so iframe window can match
  function reportSize() {
    const winampEl = document.getElementById('winamp');
    if (winampEl) {
      const rect = winampEl.getBoundingClientRect();
      window.parent.postMessage(
        {
          type: 'winamp-resize',
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height) - 1,
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
