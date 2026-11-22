(function () {
  'use strict';

  // ===== DOM HELPERS =====
  /**
   * Returns the element with this id. index.html defines every id Paint
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

  // ============================================================
  // STATE
  // ============================================================
  const state = {
    tool: 'pencil',
    fgColor: '#000000',
    bgColor: '#ffffff',
    /** The color of the stroke in progress: fgColor, or bgColor for a right-button stroke. */
    activeColor: '#000000',
    drawing: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    history: /** @type {ImageData[]} */ ([]),
    historyIndex: -1,
    maxHistory: 20,
  };

  // The app suite (tests/test-paint.js) reads and sets `state` from the page.
  Object.assign(window, { state });

  const PALETTE_COLORS = [
    '#000000',
    '#808080',
    '#800000',
    '#808000',
    '#008000',
    '#008080',
    '#000080',
    '#800080',
    '#808040',
    '#004040',
    '#0080ff',
    '#004080',
    '#8000ff',
    '#804000',
    '#ffffff',
    '#c0c0c0',
    '#ff0000',
    '#ffff00',
    '#00ff00',
    '#00ffff',
    '#0000ff',
    '#ff00ff',
    '#ffff80',
    '#00ff80',
    '#80ffff',
    '#8080ff',
    '#ff0080',
    '#ff8040',
  ];

  const canvas = byId('canvas', HTMLCanvasElement);
  const ctx = required(canvas.getContext('2d', { willReadFrequently: true }), 'canvas 2D context');
  const preview = byId('previewCanvas', HTMLCanvasElement);
  const previewCtx = required(preview.getContext('2d'), 'preview 2D context');
  const paintTitleText = byId('paintTitleText', HTMLElement);
  /** @type {string | null} */
  let currentFilePath = null;

  /** @param {string | null} path */
  function basenameFromPath(path) {
    const normalized = String(path || '').replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);
    return segments.length ? segments[segments.length - 1] : 'untitled';
  }

  /** @param {string | null} path */
  function setPaintWindowTitle(path) {
    const fileName = path ? basenameFromPath(path) : 'untitled';
    const title = `${fileName} - Paint`;
    paintTitleText.textContent = title;
    // When embedded in Windoes the in-app title bar is hidden and the shell
    // window provides the title, so mirror the change to the parent shell.
    if (window.self !== window.top) {
      window.parent.postMessage({ type: 'paint-title', title }, window.location.origin);
    }
  }

  setPaintWindowTitle(null);

  // Initialize white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ============================================================
  // TOOL ICONS (drawn programmatically)
  // ============================================================
  /**
   * @param {HTMLElement} btn
   * @param {string} tool
   */
  function drawToolIcon(btn, tool) {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const x = required(c.getContext('2d'), 'tool icon 2D context');
    x.lineWidth = 1;
    x.strokeStyle = '#000';
    x.fillStyle = '#000';

    switch (tool) {
      case 'pencil':
        x.beginPath();
        x.moveTo(2, 13);
        x.lineTo(11, 4);
        x.lineTo(13, 6);
        x.lineTo(4, 15);
        x.closePath();
        x.fillStyle = '#ffff00';
        x.fill();
        x.stroke();
        x.beginPath();
        x.moveTo(11, 4);
        x.lineTo(13, 6);
        x.strokeStyle = '#000';
        x.stroke();
        break;
      case 'brush':
        x.fillStyle = '#000';
        x.beginPath();
        x.arc(8, 11, 3, 0, Math.PI * 2);
        x.fill();
        x.beginPath();
        x.moveTo(10, 9);
        x.lineTo(13, 3);
        x.strokeStyle = '#000';
        x.lineWidth = 2;
        x.stroke();
        break;
      case 'eraser':
        x.fillStyle = '#ff80ff';
        x.fillRect(3, 6, 9, 6);
        x.strokeStyle = '#000';
        x.lineWidth = 1;
        x.strokeRect(3, 6, 9, 6);
        x.beginPath();
        x.moveTo(3, 6);
        x.lineTo(6, 3);
        x.lineTo(15, 3);
        x.lineTo(12, 6);
        x.fillStyle = '#fff';
        x.fill();
        x.stroke();
        break;
      case 'fill':
        x.fillStyle = '#c0c0c0';
        x.beginPath();
        x.moveTo(2, 11);
        x.lineTo(8, 5);
        x.lineTo(13, 10);
        x.lineTo(7, 16);
        x.closePath();
        x.fill();
        x.stroke();
        x.fillStyle = '#0000ff';
        x.beginPath();
        x.arc(13, 13, 2, 0, Math.PI * 2);
        x.fill();
        break;
      case 'picker':
        x.strokeStyle = '#000';
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(3, 13);
        x.lineTo(10, 6);
        x.stroke();
        x.fillStyle = '#000';
        x.fillRect(10, 3, 4, 4);
        x.beginPath();
        x.moveTo(2, 14);
        x.lineTo(4, 14);
        x.lineTo(3, 16);
        x.closePath();
        x.fill();
        break;
      case 'line':
        x.strokeStyle = '#000';
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(2, 13);
        x.lineTo(13, 2);
        x.stroke();
        break;
      case 'rect':
        x.strokeStyle = '#000';
        x.lineWidth = 1;
        x.strokeRect(2, 4, 12, 8);
        break;
      case 'ellipse':
        x.strokeStyle = '#000';
        x.lineWidth = 1;
        x.beginPath();
        x.ellipse(8, 8, 6, 4, 0, 0, Math.PI * 2);
        x.stroke();
        break;
    }
    btn.appendChild(c);
  }

  /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.tool-btn')).forEach((btn) => {
    const tool = required(btn.dataset.tool, 'data-tool of a .tool-btn');
    drawToolIcon(btn, tool);
    btn.addEventListener('click', () => {
      state.tool = tool;
      document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ============================================================
  // PALETTE
  // ============================================================
  const paletteEl = byId('palette', HTMLElement);
  PALETTE_COLORS.forEach((color) => {
    const cell = document.createElement('div');
    cell.className = 'color-cell';
    cell.style.background = color;
    cell.dataset.color = color;
    cell.addEventListener('click', () => {
      state.fgColor = color;
      byId('swatchFg', HTMLElement).style.background = color;
    });
    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      state.bgColor = color;
      byId('swatchBg', HTMLElement).style.background = color;
    });
    paletteEl.appendChild(cell);
  });

  // ============================================================
  // HISTORY (undo/redo)
  // ============================================================
  function pushHistory() {
    // Drop redo branch
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (state.history.length > state.maxHistory) {
      state.history.shift();
    } else {
      state.historyIndex++;
    }
  }

  function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex--;
    ctx.putImageData(state.history[state.historyIndex], 0, 0);
  }

  function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex++;
    ctx.putImageData(state.history[state.historyIndex], 0, 0);
  }

  // Initial snapshot
  pushHistory();

  // ============================================================
  // DRAWING
  // ============================================================
  /** @param {PointerEvent} e */
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY),
    };
  }

  /**
   * @param {number} fromX
   * @param {number} fromY
   * @param {number} toX
   * @param {number} toY
   * @param {string} color
   * @param {number} width
   */
  function drawLineSegment(fromX, fromY, toX, toY, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(fromX + 0.5, fromY + 0.5);
    ctx.lineTo(toX + 0.5, toY + 0.5);
    ctx.stroke();
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  function pickColor(x, y) {
    const data = ctx.getImageData(x, y, 1, 1).data;
    const hex =
      '#' + [data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    return hex;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} replacementColor
   */
  function floodFill(x, y, replacementColor) {
    const w = canvas.width;
    const h = canvas.height;
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    const idx = (y * w + x) * 4;
    const target = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];

    // Parse replacement color from #rrggbb
    const r = parseInt(replacementColor.slice(1, 3), 16);
    const g = parseInt(replacementColor.slice(3, 5), 16);
    const b = parseInt(replacementColor.slice(5, 7), 16);

    if (target[0] === r && target[1] === g && target[2] === b && target[3] === 255) return;

    /** @type {[number, number][]} */
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = /** @type {[number, number]} */ (stack.pop());
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      const i = (cy * w + cx) * 4;
      if (
        data[i] !== target[0] ||
        data[i + 1] !== target[1] ||
        data[i + 2] !== target[2] ||
        data[i + 3] !== target[3]
      )
        continue;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    ctx.putImageData(img, 0, 0);
  }

  function clearPreview() {
    previewCtx.clearRect(0, 0, preview.width, preview.height);
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  function resizeCanvas(width, height) {
    const nextWidth = Math.max(64, Math.round(width));
    const nextHeight = Math.max(64, Math.round(height));
    if (nextWidth === canvas.width && nextHeight === canvas.height) return false;

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    preview.width = nextWidth;
    preview.height = nextHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, nextWidth, nextHeight);
    ctx.putImageData(image, 0, 0);
    clearPreview();
    return true;
  }

  const canvasResizeHandle = byId('canvasResizeHandle', HTMLElement);
  /**
   * @type {{ pointerId: number, startX: number, startY: number,
   *   startWidth: number, startHeight: number, changed: boolean } | null}
   */
  let canvasResizeDrag = null;

  canvasResizeHandle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    canvasResizeDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: canvas.width,
      startHeight: canvas.height,
      changed: false,
    };
    canvasResizeHandle.setPointerCapture?.(event.pointerId);
  });

  canvasResizeHandle.addEventListener('pointermove', (event) => {
    if (!canvasResizeDrag || canvasResizeDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const changed = resizeCanvas(
      canvasResizeDrag.startWidth + event.clientX - canvasResizeDrag.startX,
      canvasResizeDrag.startHeight + event.clientY - canvasResizeDrag.startY
    );
    canvasResizeDrag.changed = canvasResizeDrag.changed || changed;
  });

  /** @param {PointerEvent} event */
  function finishCanvasResize(event) {
    if (!canvasResizeDrag || canvasResizeDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (canvasResizeHandle.hasPointerCapture?.(event.pointerId)) {
      canvasResizeHandle.releasePointerCapture(event.pointerId);
    }
    if (canvasResizeDrag.changed) {
      pushHistory();
    }
    canvasResizeDrag = null;
  }

  canvasResizeHandle.addEventListener('pointerup', finishCanvasResize);
  canvasResizeHandle.addEventListener('pointercancel', finishCanvasResize);

  // ============================================================
  // POINTER EVENTS
  // ============================================================
  /** @param {PointerEvent} e */
  function startStroke(e) {
    e.preventDefault();
    const { x, y } = getPos(e);
    state.startX = x;
    state.startY = y;
    state.lastX = x;
    state.lastY = y;
    state.drawing = true;

    const color = e.button === 2 ? state.bgColor : state.fgColor;
    state.activeColor = color;

    if (state.tool === 'pencil') {
      drawLineSegment(x, y, x, y, color, 1);
    } else if (state.tool === 'brush') {
      drawLineSegment(x, y, x, y, color, 6);
    } else if (state.tool === 'eraser') {
      ctx.fillStyle = state.bgColor;
      ctx.fillRect(x - 4, y - 4, 9, 9);
    } else if (state.tool === 'fill') {
      floodFill(x, y, color);
      state.drawing = false;
      pushHistory();
    } else if (state.tool === 'picker') {
      const picked = pickColor(x, y);
      if (e.button === 2) {
        state.bgColor = picked;
        byId('swatchBg', HTMLElement).style.background = picked;
      } else {
        state.fgColor = picked;
        byId('swatchFg', HTMLElement).style.background = picked;
      }
      state.drawing = false;
    }
  }

  /** @param {PointerEvent} e */
  function continueStroke(e) {
    const { x, y } = getPos(e);
    updateStatusCoords(x, y);

    if (!state.drawing) return;
    const color = state.activeColor;

    if (state.tool === 'pencil') {
      drawLineSegment(state.lastX, state.lastY, x, y, color, 1);
    } else if (state.tool === 'brush') {
      drawLineSegment(state.lastX, state.lastY, x, y, color, 6);
    } else if (state.tool === 'eraser') {
      ctx.fillStyle = state.bgColor;
      // Draw eraser line as overlapping squares
      const dx = x - state.lastX;
      const dy = y - state.lastY;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      for (let i = 0; i <= dist; i++) {
        const t = dist === 0 ? 0 : i / dist;
        const ex = Math.round(state.lastX + dx * t);
        const ey = Math.round(state.lastY + dy * t);
        ctx.fillRect(ex - 4, ey - 4, 9, 9);
      }
    } else if (state.tool === 'line') {
      clearPreview();
      previewCtx.strokeStyle = color;
      previewCtx.lineWidth = 1;
      previewCtx.beginPath();
      previewCtx.moveTo(state.startX + 0.5, state.startY + 0.5);
      previewCtx.lineTo(x + 0.5, y + 0.5);
      previewCtx.stroke();
    } else if (state.tool === 'rect') {
      clearPreview();
      previewCtx.strokeStyle = color;
      previewCtx.lineWidth = 1;
      previewCtx.strokeRect(
        Math.min(state.startX, x) + 0.5,
        Math.min(state.startY, y) + 0.5,
        Math.abs(x - state.startX),
        Math.abs(y - state.startY)
      );
    } else if (state.tool === 'ellipse') {
      clearPreview();
      previewCtx.strokeStyle = color;
      previewCtx.lineWidth = 1;
      const cx = (state.startX + x) / 2;
      const cy = (state.startY + y) / 2;
      const rx = Math.abs(x - state.startX) / 2;
      const ry = Math.abs(y - state.startY) / 2;
      previewCtx.beginPath();
      previewCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      previewCtx.stroke();
    }

    state.lastX = x;
    state.lastY = y;
  }

  /** @param {PointerEvent} e */
  function endStroke(e) {
    if (!state.drawing) return;
    const { x, y } = getPos(e);
    const color = state.activeColor;

    if (state.tool === 'line') {
      clearPreview();
      drawLineSegment(state.startX, state.startY, x, y, color, 1);
    } else if (state.tool === 'rect') {
      clearPreview();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.min(state.startX, x) + 0.5,
        Math.min(state.startY, y) + 0.5,
        Math.abs(x - state.startX),
        Math.abs(y - state.startY)
      );
    } else if (state.tool === 'ellipse') {
      clearPreview();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      const cx = (state.startX + x) / 2;
      const cy = (state.startY + y) / 2;
      const rx = Math.abs(x - state.startX) / 2;
      const ry = Math.abs(y - state.startY) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    state.drawing = false;
    pushHistory();
  }

  /** @param {PointerEvent} e */
  function handlePointerDown(e) {
    // Only primary/secondary button interactions
    if (e.button !== 0 && e.button !== 2) return;
    if (typeof canvas.setPointerCapture === 'function') {
      canvas.setPointerCapture(e.pointerId);
    }
    startStroke(e);
  }

  /** @param {PointerEvent} e */
  function handlePointerMove(e) {
    continueStroke(e);
  }

  /** @param {PointerEvent} e */
  function handlePointerUp(e) {
    if (
      typeof canvas.releasePointerCapture === 'function' &&
      canvas.hasPointerCapture?.(e.pointerId)
    ) {
      canvas.releasePointerCapture(e.pointerId);
    }
    endStroke(e);
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
  canvas.addEventListener('pointerleave', () => {
    if (!state.drawing) {
      byId('statusCoords', HTMLElement).textContent = '';
    }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ============================================================
  // STATUS BAR
  // ============================================================
  /**
   * @param {number} x
   * @param {number} y
   */
  function updateStatusCoords(x, y) {
    byId('statusCoords', HTMLElement).textContent = `${x},${y}`;
  }

  // ============================================================
  // MENU LOGIC
  // ============================================================
  function closeAllMenus() {
    document.querySelectorAll('.menu-item').forEach((m) => m.classList.remove('open'));
  }

  /**
   * @param {string | null | undefined} path
   * @returns {string | null}
   */
  function normalizePaintPath(path) {
    const trimmed = String(path || '').trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase().endsWith('.png')) return trimmed;
    return `${trimmed}.png`;
  }

  const filePathDialog = byId('filePathDialog', HTMLElement);
  const filePathDialogTitle = byId('filePathDialogTitle', HTMLElement);
  const filePathDialogMessage = byId('filePathDialogMessage', HTMLElement);
  const filePathDialogInput = byId('filePathDialogInput', HTMLInputElement);
  const filePathDialogConfirm = byId('filePathDialogConfirm', HTMLElement);
  const filePathDialogCancel = byId('filePathDialogCancel', HTMLElement);
  const filePathDialogClose = byId('filePathDialogClose', HTMLElement);
  /** @type {((path: string | null) => void) | null} */
  let filePathDialogResolver = null;

  /**
   * What Open or Save As asks the user for.
   * @typedef {object} FilePathRequest
   * @property {'open' | 'save'} [mode]
   * @property {string} title
   * @property {string} [message]
   * @property {string} defaultPath
   * @property {string} [confirmLabel]
   */

  /** @param {string | null} resultPath */
  function closeFilePathDialog(resultPath = null) {
    filePathDialog.classList.remove('visible');
    if (filePathDialogResolver) {
      const resolve = filePathDialogResolver;
      filePathDialogResolver = null;
      resolve(resultPath);
    }
  }

  /**
   * @param {FilePathRequest} request
   * @returns {Promise<string | null>}
   */
  function requestFilePath({ title, message, defaultPath, confirmLabel = 'OK' }) {
    if (filePathDialogResolver) {
      closeFilePathDialog(null);
    }

    filePathDialogTitle.textContent = title || 'Save As';
    filePathDialogMessage.textContent = message || 'Choose a file path.';
    filePathDialogConfirm.textContent = confirmLabel;
    filePathDialogInput.value = defaultPath || '/C:/My Documents/untitled.png';
    filePathDialog.classList.add('visible');

    requestAnimationFrame(() => {
      filePathDialogInput.focus();
      filePathDialogInput.select();
    });

    return new Promise((resolve) => {
      filePathDialogResolver = resolve;
    });
  }

  function wireFilePathDialog() {
    const onConfirm = () => {
      closeFilePathDialog(normalizePaintPath(filePathDialogInput.value));
    };
    const onCancel = () => closeFilePathDialog(null);

    filePathDialogConfirm.addEventListener('click', onConfirm);
    filePathDialogCancel.addEventListener('click', onCancel);
    filePathDialogClose.addEventListener('click', onCancel);
    filePathDialog.addEventListener('click', (event) => {
      if (event.target === filePathDialog) {
        onCancel();
      }
    });
    filePathDialogInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onConfirm();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    });
  }
  wireFilePathDialog();

  const isEmbedded = window.self !== window.top;

  // When running inside Windoes, defer Open/Save file picking to the shared
  // shell file chooser (which can browse folders and create new ones). The
  // internal text-input dialog remains the fallback for standalone mode.
  let paintFilePathCounter = 0;
  /**
   * @param {FilePathRequest} request
   * @returns {Promise<string | null>}
   */
  function requestFilePathFromShell({ title, defaultPath, confirmLabel, mode }) {
    const requestId = `paint-fc-${Date.now()}-${paintFilePathCounter++}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('File chooser request timed out.'));
      }, 600000);

      /** @param {MessageEvent} event */
      function onMessage(event) {
        if (event.origin !== window.location.origin || event.source !== window.parent) return;
        if (!event.data || event.data.type !== 'paint-request-file-path-result') return;
        if (event.data.requestId !== requestId) return;
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        if (event.data.ok) {
          resolve(event.data.path || null);
        } else {
          reject(new Error(event.data.error || 'File chooser failed.'));
        }
      }

      window.addEventListener('message', onMessage);
      window.parent.postMessage(
        { type: 'paint-request-file-path', requestId, title, defaultPath, confirmLabel, mode },
        window.location.origin
      );
    });
  }

  // Pick a file path either through the shell chooser (embedded) or the
  // built-in dialog (standalone), normalizing the result to a .png path.
  /**
   * @param {FilePathRequest} options
   * @returns {Promise<string | null>}
   */
  function chooseFilePath(options) {
    if (isEmbedded) {
      return requestFilePathFromShell({
        title: options.title,
        defaultPath: options.defaultPath,
        confirmLabel: options.confirmLabel,
        mode: options.mode,
      }).then((path) => (path ? normalizePaintPath(path) : null));
    }
    return requestFilePath({
      title: options.title,
      message: options.message,
      defaultPath: options.defaultPath,
      confirmLabel: options.confirmLabel,
    });
  }

  /**
   * The shell's answer to a paint-vfs-save or paint-vfs-load request. A load
   * answer carries the image as a data URL.
   * @typedef {object} VfsReply
   * @property {boolean} [ok]
   * @property {string} [path]
   * @property {string} [dataUrl]
   */

  let paintRequestCounter = 0;
  /**
   * @param {string} type
   * @param {object} payload
   * @returns {Promise<VfsReply>}
   */
  function requestParentVfs(type, payload) {
    // The app suite stands in for the shell by setting this hook on the page.
    /** @type {((type: string, payload: object) => Promise<VfsReply>) | undefined} */
    const bridge = /** @type {any} */ (window).__paintVfsBridge;
    if (typeof bridge === 'function') {
      return bridge(type, payload);
    }

    if (window.self === window.top) {
      return Promise.reject(
        new Error('VirtualFS save/load is only available in Windoes app mode.')
      );
    }

    const requestId = `paint-vfs-${Date.now()}-${paintRequestCounter++}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('VirtualFS request timed out.'));
      }, 5000);

      /** @param {MessageEvent} event */
      function onMessage(event) {
        if (event.origin !== window.location.origin || event.source !== window.parent) return;
        if (!event.data || event.data.requestId !== requestId) return;

        if (event.data.type !== `${type}-result`) return;
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        if (event.data.ok) {
          resolve(event.data);
        } else {
          reject(new Error(event.data.error || 'VirtualFS operation failed.'));
        }
      }

      window.addEventListener('message', onMessage);
      window.parent.postMessage({ type, requestId, ...payload }, window.location.origin);
    });
  }

  /** @param {string} path */
  async function saveCanvasToVirtualFs(path) {
    const dataUrl = canvas.toDataURL('image/png');
    await requestParentVfs('paint-vfs-save', { path, dataUrl });
  }

  /** @param {string | null} path */
  async function loadCanvasFromVirtualFs(path) {
    const result = await requestParentVfs('paint-vfs-load', { path });
    /** @type {Promise<void>} */
    const decoded = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        pushHistory();
        resolve();
      };
      img.onerror = () => reject(new Error('Could not decode image data.'));
      // The `src` setter turns a missing data URL into "undefined", which
      // fails to decode and rejects.
      img.src = String(result.dataUrl);
    });
    await decoded;
  }

  /**
   * @param {unknown} error
   * @param {string} fallback
   */
  function errorMessage(error, fallback) {
    return /** @type {{ message?: string } | null | undefined} */ (error)?.message || fallback;
  }

  byId('menuBar', HTMLElement).addEventListener('click', (e) => {
    const target = /** @type {Element} */ (e.target);
    const menuItem = target.closest('.menu-item');
    if (!menuItem) {
      closeAllMenus();
      return;
    }
    // Clicking an option inside a dropdown (e.g. Open.../Save As... which
    // opens the FileChooser) should close the menu, not re-toggle the
    // parent menu back open behind the dialog.
    if (target.closest('.menu-dropdown')) {
      closeAllMenus();
      return;
    }
    const wasOpen = menuItem.classList.contains('open');
    closeAllMenus();
    if (!wasOpen) menuItem.classList.add('open');
    e.stopPropagation();
  });

  document.addEventListener('click', closeAllMenus);

  function clearCanvas() {
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pushHistory();
  }

  byId('menuNew', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    clearCanvas();
    currentFilePath = null;
    setPaintWindowTitle(null);
  });

  byId('menuClear', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    clearCanvas();
  });

  byId('menuUndo', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    undo();
  });

  byId('menuRedo', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    redo();
  });

  byId('menuOpen', HTMLElement).addEventListener('click', async () => {
    closeAllMenus();
    const path = await chooseFilePath({
      mode: 'open',
      title: 'Open',
      message: 'Choose an image file to open from VirtualFS.',
      defaultPath: currentFilePath || '/C:/My Documents/untitled.png',
      confirmLabel: 'Open',
    });
    if (!path) return;
    try {
      await loadCanvasFromVirtualFs(path);
      currentFilePath = path;
      setPaintWindowTitle(path);
    } catch (error) {
      window.alert(errorMessage(error, 'Could not open image.'));
    }
  });

  // Prompt for a destination and save there (File > Save As...).
  async function saveImageAs() {
    const path = await chooseFilePath({
      mode: 'save',
      title: 'Save As',
      message: 'Choose where to save this image in VirtualFS.',
      defaultPath: currentFilePath || '/C:/My Documents/untitled.png',
      confirmLabel: 'Save',
    });
    if (!path) return;
    try {
      await saveCanvasToVirtualFs(path);
      currentFilePath = path;
      setPaintWindowTitle(path);
    } catch (error) {
      window.alert(errorMessage(error, 'Could not save image.'));
    }
  }

  // Save to the current file if there is one, otherwise behave like Save As.
  async function saveImage() {
    if (!currentFilePath) {
      await saveImageAs();
      return;
    }
    try {
      await saveCanvasToVirtualFs(currentFilePath);
      setPaintWindowTitle(currentFilePath);
    } catch (error) {
      window.alert(errorMessage(error, 'Could not save image.'));
    }
  }

  byId('menuSaveFile', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    saveImage();
  });

  byId('menuSave', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    saveImageAs();
  });

  byId('menuExit', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    if (window.self !== window.top) {
      window.parent.postMessage({ type: 'paint-close' }, '*');
    } else {
      window.history.back();
    }
  });

  byId('menuFlipH', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    required(tmp.getContext('2d'), 'flip 2D context').putImageData(img, 0, 0);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
    pushHistory();
  });

  byId('menuFlipV', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(1, -1);
    ctx.translate(0, -canvas.height);
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    required(tmp.getContext('2d'), 'flip 2D context').putImageData(img, 0, 0);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
    pushHistory();
  });

  byId('menuInvert', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i];
      d[i + 1] = 255 - d[i + 1];
      d[i + 2] = 255 - d[i + 2];
    }
    ctx.putImageData(img, 0, 0);
    pushHistory();
  });

  byId('menuToolBox', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    const tb = byId('toolbox', HTMLElement);
    const visible = tb.style.display !== 'none';
    tb.style.display = visible ? 'none' : '';
    byId('menuToolBox', HTMLElement).classList.toggle('checked', !visible);
    notifyParentSize();
  });

  byId('menuColorBox', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    const cb = byId('paletteBar', HTMLElement);
    const visible = cb.style.display !== 'none';
    cb.style.display = visible ? 'none' : '';
    byId('menuColorBox', HTMLElement).classList.toggle('checked', !visible);
    notifyParentSize();
  });

  byId('menuStatusBar', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    const sb = byId('statusBar', HTMLElement);
    const visible = sb.style.display !== 'none';
    sb.style.display = visible ? 'none' : '';
    byId('menuStatusBar', HTMLElement).classList.toggle('checked', !visible);
    notifyParentSize();
  });

  byId('menuAbout', HTMLElement).addEventListener('click', () => {
    closeAllMenus();
    byId('aboutDialog', HTMLElement).classList.add('visible');
  });

  byId('aboutOk', HTMLElement).addEventListener('click', () => {
    byId('aboutDialog', HTMLElement).classList.remove('visible');
  });
  byId('aboutClose', HTMLElement).addEventListener('click', () => {
    byId('aboutDialog', HTMLElement).classList.remove('visible');
  });

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      undo();
    } else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      redo();
    } else if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      byId('menuSaveFile', HTMLElement).click();
    }
  });

  // Close button
  byId('closeBtn', HTMLElement).addEventListener('click', () => {
    if (window.self !== window.top) {
      window.parent.postMessage({ type: 'paint-close' }, '*');
    } else {
      window.history.back();
    }
  });

  // ============================================================
  // NOTIFY PARENT OF SIZE
  // ============================================================
  function notifyParentSize() {
    if (window.self !== window.top) {
      requestAnimationFrame(() => {
        const win = document.querySelector('.window');
        if (win) {
          window.parent.postMessage(
            {
              type: 'paint-resize',
              width: win.scrollWidth,
              height: win.scrollHeight,
            },
            '*'
          );
        }
      });
    }
  }

  // ============================================================
  // INIT - iframe mode
  // ============================================================
  if (window.self !== window.top) {
    document.documentElement.classList.add('iframe-embedded-root');
    document.body.classList.add('iframe-embedded');
    const titleBar = document.querySelector('.title-bar');
    if (titleBar instanceof HTMLElement) titleBar.style.display = 'none';
    notifyParentSize();

    const launchFilePath = new URLSearchParams(window.location.search).get('filePath');
    if (launchFilePath) {
      const normalizedLaunchPath = normalizePaintPath(launchFilePath);
      loadCanvasFromVirtualFs(normalizedLaunchPath)
        .then(() => {
          currentFilePath = normalizedLaunchPath;
          setPaintWindowTitle(normalizedLaunchPath);
        })
        .catch((error) => {
          window.alert(errorMessage(error, 'Could not open image.'));
        });
    }
  }
})();
