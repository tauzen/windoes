(function () {
  'use strict';

  /**
   * One square of the minefield.
   * @typedef {object} Cell
   * @property {boolean} mine
   * @property {boolean} revealed
   * @property {boolean} flagged
   * @property {boolean} questioned
   * @property {boolean} wrongFlag
   * @property {number} adjacentMines
   */

  /**
   * A best time for one difficulty.
   * @typedef {object} BestTime
   * @property {number} time
   * @property {string} name
   */

  // ============================================================
  // DOM HELPERS
  // ============================================================
  /**
   * Returns the element with this id. index.html defines every id the game
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

  /**
   * The cell element a cell listener is attached to.
   * @param {Event} e
   * @returns {HTMLElement}
   */
  function eventCell(e) {
    const el = e.currentTarget;
    if (!(el instanceof HTMLElement)) throw new Error('The event has no cell element');
    return el;
  }

  /**
   * The row and column that renderBoard stored on a cell element.
   * @param {HTMLElement} el
   * @returns {[number, number]}
   */
  function cellPosition(el) {
    return [
      parseInt(required(el.dataset.r, 'Cell row')),
      parseInt(required(el.dataset.c, 'Cell column')),
    ];
  }

  // The saved-state store that ../shared/app-storage.js puts on `window`.
  const appStorage = required(
    /** @type {Window & { WindoesAppStorage?: { load(key: string): Promise<string | null>, save(key: string, value: string): Promise<void> } }} */ (
      window
    ).WindoesAppStorage,
    'WindoesAppStorage'
  );

  const boardEl = byId('board', HTMLDivElement);
  const mineCanvas = byId('mineCanvas', HTMLCanvasElement);
  const timerCanvas = byId('timerCanvas', HTMLCanvasElement);
  const faceCanvas = byId('faceCanvas', HTMLCanvasElement);
  const faceBtn = byId('faceBtn', HTMLButtonElement);
  const menuMarks = byId('menuMarks', HTMLDivElement);
  const winName = byId('winName', HTMLInputElement);
  const winDialog = byId('winDialog', HTMLDivElement);
  const customRows = byId('customRows', HTMLInputElement);
  const customCols = byId('customCols', HTMLInputElement);
  const customMines = byId('customMines', HTMLInputElement);
  const customDialog = byId('customDialog', HTMLDivElement);
  const bestDialog = byId('bestDialog', HTMLDivElement);
  const aboutDialog = byId('aboutDialog', HTMLDivElement);

  // ============================================================
  // GAME STATE
  // ============================================================
  const DIFFS = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 },
  };

  const state = {
    diff: 'beginner',
    rows: 9,
    cols: 9,
    mines: 10,
    board: /** @type {Cell[][]} */ ([]),
    gamePhase: 'idle', // idle | playing | won | lost
    firstClick: true,
    flagCount: 0,
    timerVal: 0,
    timerInterval: /** @type {ReturnType<typeof setInterval> | undefined} */ (undefined),
    useMarks: true,
    mouseDown: false,
    pressedCell: /** @type {[number, number] | null} */ (null),
    triggeredMine: /** @type {[number, number] | null} */ (null),
  };

  // The app suites (tests/test-minesweeper.js in this folder and the shell's
  // tests/test-app-sandbox.js) read and call these by name, as they could when
  // this code was an inline script with top-level declarations.
  Object.assign(window, { state, loadBestTimes, checkBestTime, showBestTimes });

  // Best times storage. Saved state may come from the shell (when
  // framed), so it loads once at start and is kept in memory.
  const BEST_TIMES_KEY = 'ms_best';
  /** @type {Record<string, BestTime>} */
  let bestTimes = {};
  appStorage.load(BEST_TIMES_KEY).then(
    (raw) => {
      try {
        const parsed = JSON.parse(raw || '{}');
        if (parsed && typeof parsed === 'object') bestTimes = parsed;
      } catch {
        // Corrupt saved state reads as no best times.
      }
    },
    (error) => console.warn('Best times could not be loaded:', error)
  );
  function loadBestTimes() {
    return { ...bestTimes };
  }
  /** @param {Record<string, BestTime>} bt */
  function saveBestTimes(bt) {
    bestTimes = { ...bt };
    appStorage
      .save(BEST_TIMES_KEY, JSON.stringify(bestTimes))
      .catch((error) => console.warn('Best times could not be saved:', error));
  }

  // ============================================================
  // 7-SEGMENT LED RENDERING
  // ============================================================
  // Segment map for digits 0-9 and '-'
  // Segments: a=top, b=top-right, c=bot-right, d=bottom, e=bot-left, f=top-left, g=middle
  /** @type {Record<string, number[]>} */
  const SEG_MAP = {
    0: [1, 1, 1, 1, 1, 1, 0],
    1: [0, 1, 1, 0, 0, 0, 0],
    2: [1, 1, 0, 1, 1, 0, 1],
    3: [1, 1, 1, 1, 0, 0, 1],
    4: [0, 1, 1, 0, 0, 1, 1],
    5: [1, 0, 1, 1, 0, 1, 1],
    6: [1, 0, 1, 1, 1, 1, 1],
    7: [1, 1, 1, 0, 0, 0, 0],
    8: [1, 1, 1, 1, 1, 1, 1],
    9: [1, 1, 1, 1, 0, 1, 1],
    '-': [0, 0, 0, 0, 0, 0, 1],
  };

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} ch
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  function drawSegDigit(ctx, ch, x, y, w, h) {
    const ON = '#ff2200';
    const OFF = '#3d0800';
    const sw = 2; // segment width
    const gap = 1; // gap between segments and border

    const segs = SEG_MAP[ch] || [0, 0, 0, 0, 0, 0, 0];
    const [a, b, c, d, e, f, g] = segs;

    const x1 = x + gap + sw;
    const x2 = x + w - gap - sw;
    const y1 = y + gap;
    const y2 = y + h / 2;
    const y3 = y + h - gap;

    /**
     * @param {number} on
     * @param {[number, number][]} pts
     */
    const drawSeg = (on, pts) => {
      ctx.fillStyle = on ? ON : OFF;
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(...pts[i]);
      ctx.closePath();
      ctx.fill();
    };

    // a - top horizontal
    drawSeg(a, [
      [x1, y1],
      [x2, y1],
      [x2 - sw / 2, y1 + sw],
      [x1 + sw / 2, y1 + sw],
    ]);
    // b - top-right vertical
    drawSeg(b, [
      [x2, y1 + gap],
      [x2, y2 - gap],
      [x2 - sw, y2 - gap - sw / 2],
      [x2 - sw, y1 + gap + sw / 2],
    ]);
    // c - bot-right vertical
    drawSeg(c, [
      [x2, y2 + gap],
      [x2, y3 - gap],
      [x2 - sw, y3 - gap - sw / 2],
      [x2 - sw, y2 + gap + sw / 2],
    ]);
    // d - bottom horizontal
    drawSeg(d, [
      [x1, y3],
      [x2, y3],
      [x2 - sw / 2, y3 - sw],
      [x1 + sw / 2, y3 - sw],
    ]);
    // e - bot-left vertical
    drawSeg(e, [
      [x + gap, y2 + gap],
      [x + gap, y3 - gap],
      [x + gap + sw, y3 - gap - sw / 2],
      [x + gap + sw, y2 + gap + sw / 2],
    ]);
    // f - top-left vertical
    drawSeg(f, [
      [x + gap, y1 + gap],
      [x + gap, y2 - gap],
      [x + gap + sw, y2 - gap - sw / 2],
      [x + gap + sw, y1 + gap + sw / 2],
    ]);
    // g - middle horizontal
    drawSeg(g, [
      [x1, y2 - sw / 2],
      [x2, y2 - sw / 2],
      [x2 - sw / 2, y2 + sw / 2],
      [x1 + sw / 2, y2 + sw / 2],
    ]);
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} value
   * @param {number} [minDigits]
   */
  function renderLED(canvas, value, minDigits = 3) {
    const ctx = required(canvas.getContext('2d'), 'LED 2D context');
    const W = canvas.width,
      H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    let str = String(Math.abs(Math.min(999, Math.max(-99, value))));
    if (value < 0) {
      str = '-' + str;
      if (str.length < minDigits) str = str.padStart(minDigits, '-');
    } else {
      str = str.padStart(minDigits, '0');
    }
    str = str.slice(-minDigits); // clamp to 3 chars

    const dw = Math.floor((W - 2) / minDigits);
    const dh = H - 2;
    for (let i = 0; i < minDigits; i++) {
      drawSegDigit(ctx, str[i] || '0', 1 + i * dw, 1, dw, dh);
    }
  }

  // ============================================================
  // FACE DRAWING
  // ============================================================
  /** @type {Record<string, { eyes: string, mouth: string, glasses: boolean, x: boolean }>} */
  const FACE_STATES = {
    smile: { eyes: 'open', mouth: 'smile', glasses: false, x: false },
    wow: { eyes: 'open', mouth: 'wow', glasses: false, x: false },
    cool: { eyes: 'open', mouth: 'smile', glasses: true, x: false },
    dead: { eyes: 'open', mouth: 'frown', glasses: false, x: true },
  };

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {string} faceType
   */
  function drawFace(canvas, faceType) {
    const ctx = required(canvas.getContext('2d'), 'Face 2D context');
    const W = canvas.width,
      H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2,
      cy = H / 2,
      r = W / 2 - 1;

    // Face circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffff00';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    const f = FACE_STATES[faceType] || FACE_STATES.smile;

    // Eyes
    if (f.x) {
      // X eyes
      /**
       * @param {number} ex
       * @param {number} ey
       */
      const drawX = (ex, ey) => {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ex - 2, ey - 2);
        ctx.lineTo(ex + 2, ey + 2);
        ctx.moveTo(ex + 2, ey - 2);
        ctx.lineTo(ex - 2, ey + 2);
        ctx.stroke();
      };
      drawX(cx - 3.5, cy - 2.5);
      drawX(cx + 3.5, cy - 2.5);
    } else if (f.glasses) {
      // Cool sunglasses
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.roundRect(cx - 7, cy - 4.5, 5.5, 4, 1);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(cx + 1.5, cy - 4.5, 5.5, 4, 1);
      ctx.fill();
      // Bridge
      ctx.beginPath();
      ctx.moveTo(cx - 1.5, cy - 2.5);
      ctx.lineTo(cx + 1.5, cy - 2.5);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Sides
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy - 2.5);
      ctx.lineTo(cx - 8.5, cy - 1);
      ctx.moveTo(cx + 7, cy - 2.5);
      ctx.lineTo(cx + 8.5, cy - 1);
      ctx.stroke();
    } else {
      // Normal eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(cx - 3.5, cy - 2.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 3.5, cy - 2.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    if (f.mouth === 'smile') {
      ctx.beginPath();
      ctx.arc(cx, cy + 0.5, 4.5, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (f.mouth === 'wow') {
      ctx.beginPath();
      ctx.arc(cx, cy + 3, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
    } else if (f.mouth === 'frown') {
      ctx.beginPath();
      ctx.arc(cx, cy + 6, 4.5, Math.PI + 0.2, -0.2);
      ctx.stroke();
    }
  }

  // ============================================================
  // MINE & FLAG SPRITES (drawn on cells)
  // ============================================================
  /** @param {boolean} exploded */
  function createMineCanvas(exploded) {
    const c = document.createElement('canvas');
    c.width = 12;
    c.height = 12;
    const ctx = required(c.getContext('2d'), 'Mine 2D context');
    if (exploded) {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 12, 12);
    }
    // Mine body
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(6, 6, 4, 0, Math.PI * 2);
    ctx.fill();
    // Spikes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    const spikes = [
      [6, 1],
      [6, 11],
      [1, 6],
      [11, 6],
      [2, 2],
      [10, 10],
      [10, 2],
      [2, 10],
    ];
    spikes.forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.moveTo(6, 6);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    });
    // Shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(4.5, 4, 1.2, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  function createFlagCanvas() {
    const c = document.createElement('canvas');
    c.width = 12;
    c.height = 12;
    const ctx = required(c.getContext('2d'), 'Flag 2D context');
    // Pole
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(6, 2);
    ctx.stroke();
    // Base
    ctx.beginPath();
    ctx.moveTo(3, 10);
    ctx.lineTo(9, 10);
    ctx.stroke();
    // Flag
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(10, 4.5);
    ctx.lineTo(6, 7);
    ctx.closePath();
    ctx.fill();
    return c;
  }

  function createWrongFlagCanvas() {
    const c = document.createElement('canvas');
    c.width = 12;
    c.height = 12;
    const ctx = required(c.getContext('2d'), 'Wrong-flag 2D context');
    // Draw mine first (dimmed)
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(6, 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Red X
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(11, 11);
    ctx.moveTo(11, 1);
    ctx.lineTo(1, 11);
    ctx.stroke();
    return c;
  }

  // Cache canvases
  const MINE_CANVAS = createMineCanvas(false);
  const MINE_EXPLODED_CANVAS = createMineCanvas(true);
  const FLAG_CANVAS = createFlagCanvas();
  const WRONG_FLAG_CANVAS = createWrongFlagCanvas();

  /**
   * A copy of a cached sprite canvas, with its pixels.
   * @param {HTMLCanvasElement} src
   */
  function cloneCanvas(src) {
    const img = document.createElement('canvas');
    copyCanvas(src, img);
    return img;
  }

  /**
   * @param {HTMLElement} cellEl
   * @param {Cell} cellData
   * @param {boolean} isTriggered
   */
  function drawCellContent(cellEl, cellData, isTriggered) {
    // Clear previous content
    cellEl.innerHTML = '';
    cellEl.className = 'cell';
    cellEl.removeAttribute('data-num');

    if (!cellData.revealed) {
      if (cellData.wrongFlag) {
        cellEl.appendChild(cloneCanvas(WRONG_FLAG_CANVAS));
        cellEl.classList.add('revealed');
      } else if (cellData.flagged) {
        cellEl.appendChild(cloneCanvas(FLAG_CANVAS));
      } else if (cellData.questioned) {
        cellEl.textContent = '?';
        cellEl.style.color = '#000';
      }
      return;
    }

    cellEl.classList.add('revealed');

    if (cellData.mine) {
      cellEl.appendChild(cloneCanvas(isTriggered ? MINE_EXPLODED_CANVAS : MINE_CANVAS));
      if (isTriggered) cellEl.style.background = '#ff0000';
    } else if (cellData.adjacentMines > 0) {
      cellEl.textContent = String(cellData.adjacentMines);
      cellEl.setAttribute('data-num', String(cellData.adjacentMines));
      cellEl.classList.add('n' + cellData.adjacentMines);
    }
  }

  /**
   * @param {HTMLCanvasElement} src
   * @param {HTMLCanvasElement} dst
   */
  function copyCanvas(src, dst) {
    dst.width = src.width;
    dst.height = src.height;
    required(dst.getContext('2d'), 'Sprite 2D context').drawImage(src, 0, 0);
  }

  // ============================================================
  // BOARD RENDERING
  // ============================================================
  function renderBoard() {
    boardEl.style.gridTemplateColumns = `repeat(${state.cols}, 16px)`;
    boardEl.innerHTML = '';

    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const cell = document.createElement('div');
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.className = 'cell';
        cell.addEventListener('mousedown', onCellMouseDown);
        cell.addEventListener('mouseup', onCellMouseUp);
        cell.addEventListener('contextmenu', onCellRightClick);
        cell.addEventListener('mouseenter', onCellEnter);
        cell.addEventListener('touchstart', onCellTouchStart, { passive: true });
        cell.addEventListener('touchmove', onCellTouchMove, { passive: true });
        cell.addEventListener('touchend', onCellTouchEnd);
        cell.addEventListener('touchcancel', onCellTouchCancel);
        boardEl.appendChild(cell);
      }
    }
    updateAllCells();
  }

  /**
   * @param {number} [triggeredR]
   * @param {number} [triggeredC]
   */
  function updateAllCells(triggeredR, triggeredC) {
    const cells = /** @type {NodeListOf<HTMLElement>} */ (boardEl.querySelectorAll('.cell'));
    cells.forEach((cellEl) => {
      const [r, c] = cellPosition(cellEl);
      const isTriggered = r === triggeredR && c === triggeredC;
      drawCellContent(cellEl, state.board[r][c], isTriggered);
    });
  }

  /**
   * @param {number} r
   * @param {number} c
   * @param {number} [triggeredR]
   * @param {number} [triggeredC]
   */
  function updateCell(r, c, triggeredR, triggeredC) {
    const cellEl = boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
    if (cellEl instanceof HTMLElement) {
      const isTriggered = r === triggeredR && c === triggeredC;
      drawCellContent(cellEl, state.board[r][c], isTriggered);
    }
  }

  // ============================================================
  // GAME LOGIC
  // ============================================================
  /**
   * @param {number} rows
   * @param {number} cols
   * @param {number} mines
   * @param {string} [diffName]
   */
  function initGame(rows, cols, mines, diffName) {
    clearInterval(state.timerInterval);
    state.rows = rows;
    state.cols = cols;
    state.mines = mines;
    state.diff = diffName || 'custom';
    state.board = [];
    state.gamePhase = 'idle';
    state.firstClick = true;
    state.flagCount = 0;
    state.timerVal = 0;
    state.pressedCell = null;
    state.triggeredMine = null;

    for (let r = 0; r < rows; r++) {
      state.board.push([]);
      for (let c = 0; c < cols; c++) {
        state.board[r].push({
          mine: false,
          revealed: false,
          flagged: false,
          questioned: false,
          wrongFlag: false,
          adjacentMines: 0,
        });
      }
    }

    renderBoard();
    renderLED(mineCanvas, mines);
    renderLED(timerCanvas, 0);
    updateDifficultyCheck();
    drawFace(faceCanvas, 'smile');
    notifyParentSize();
  }

  /**
   * @param {number} safeR
   * @param {number} safeC
   */
  function placeMines(safeR, safeC) {
    const { rows, cols, mines } = state;
    let placed = 0;
    while (placed < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!state.board[r][c].mine && !(Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)) {
        state.board[r][c].mine = true;
        placed++;
      }
    }
    // Count adjacents
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!state.board[r][c].mine) {
          state.board[r][c].adjacentMines = countAdj(r, c);
        }
      }
    }
  }

  /**
   * @param {number} r
   * @param {number} c
   */
  function countAdj(r, c) {
    let cnt = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr,
          nc = c + dc;
        if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols)
          if (state.board[nr][nc].mine) cnt++;
      }
    return cnt;
  }

  /**
   * @param {number} r
   * @param {number} c
   */
  function getNeighbors(r, c) {
    /** @type {[number, number][]} */
    const result = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr,
          nc = c + dc;
        if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) result.push([nr, nc]);
      }
    return result;
  }

  /**
   * @param {number} r
   * @param {number} c
   */
  function revealCell(r, c) {
    if (state.gamePhase === 'won' || state.gamePhase === 'lost') return;
    const cell = state.board[r][c];
    if (cell.revealed || cell.flagged) return;

    if (state.firstClick) {
      state.firstClick = false;
      placeMines(r, c);
      state.gamePhase = 'playing';
      startTimer();
    }

    if (cell.mine) {
      cell.revealed = true;
      state.gamePhase = 'lost';
      state.triggeredMine = [r, c];
      stopTimer();
      revealAllMines(r, c);
      drawFace(faceCanvas, 'dead');
      return;
    }

    floodReveal(r, c);
    checkWin();
  }

  /**
   * @param {number} startR
   * @param {number} startC
   */
  function floodReveal(startR, startC) {
    /** @type {[number, number][]} */
    const stack = [[startR, startC]];
    while (stack.length > 0) {
      const [r, c] = required(stack.pop(), 'Flood stack entry');
      const cell = state.board[r][c];
      if (cell.revealed || cell.flagged || cell.mine) continue;
      cell.revealed = true;
      if (cell.adjacentMines === 0) {
        getNeighbors(r, c).forEach(([nr, nc]) => {
          if (!state.board[nr][nc].revealed) stack.push([nr, nc]);
        });
      }
    }
  }

  /**
   * @param {number} r
   * @param {number} c
   */
  function toggleFlag(r, c) {
    if (state.gamePhase === 'won' || state.gamePhase === 'lost') return;
    const cell = state.board[r][c];
    if (cell.revealed) return;

    if (!cell.flagged && !cell.questioned) {
      cell.flagged = true;
      state.flagCount++;
    } else if (cell.flagged) {
      cell.flagged = false;
      state.flagCount--;
      if (state.useMarks !== false) cell.questioned = true;
    } else if (cell.questioned) {
      cell.questioned = false;
    }

    renderLED(mineCanvas, state.mines - state.flagCount);
    updateCell(r, c);
  }

  /**
   * @param {number} r
   * @param {number} c
   */
  function chordReveal(r, c) {
    if (state.gamePhase === 'won' || state.gamePhase === 'lost') return;
    const cell = state.board[r][c];
    if (!cell.revealed || cell.adjacentMines === 0) return;

    const neighbors = getNeighbors(r, c);
    const flagsAround = neighbors.filter(([nr, nc]) => state.board[nr][nc].flagged).length;
    if (flagsAround !== cell.adjacentMines) return;

    for (const [nr, nc] of neighbors) {
      if (!state.board[nr][nc].flagged && !state.board[nr][nc].revealed) {
        revealCell(nr, nc);
        if (state.gamePhase === 'lost') return;
      }
    }
  }

  /**
   * @param {number} triggeredR
   * @param {number} triggeredC
   */
  function revealAllMines(triggeredR, triggeredC) {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const cell = state.board[r][c];
        if (cell.mine && !cell.flagged) cell.revealed = true;
        if (cell.flagged && !cell.mine) {
          cell.wrongFlag = true;
          cell.flagged = false;
        }
      }
    }
    updateAllCells(triggeredR, triggeredC);
  }

  function checkWin() {
    for (let r = 0; r < state.rows; r++)
      for (let c = 0; c < state.cols; c++) {
        const cell = state.board[r][c];
        if (!cell.mine && !cell.revealed) return;
      }
    // Won
    state.gamePhase = 'won';
    stopTimer();
    drawFace(faceCanvas, 'cool');
    // Auto-flag remaining mines
    for (let r = 0; r < state.rows; r++)
      for (let c = 0; c < state.cols; c++)
        if (state.board[r][c].mine) state.board[r][c].flagged = true;
    renderLED(mineCanvas, 0);
    updateAllCells();
    checkBestTime();
  }

  function checkBestTime() {
    const diff = state.diff;
    if (!['beginner', 'intermediate', 'expert'].includes(diff)) return;
    const bt = loadBestTimes();
    const key = diff;
    if (!bt[key] || state.timerVal < bt[key].time) {
      // New record
      byId('winMsg', HTMLDivElement).textContent =
        `You have the fastest time for ${diff.charAt(0).toUpperCase() + diff.slice(1)} level. Please enter your name.`;
      winName.value = (bt[key] && bt[key].name) || 'Anonymous';
      winDialog.classList.add('visible');
      byId('winOk', HTMLButtonElement).onclick = () => {
        const name = winName.value || 'Anonymous';
        bt[key] = { time: state.timerVal, name };
        saveBestTimes(bt);
        winDialog.classList.remove('visible');
      };
    }
  }

  // ============================================================
  // TIMER
  // ============================================================
  function startTimer() {
    clearInterval(state.timerInterval);
    state.timerVal = 0;
    renderLED(timerCanvas, 0);
    state.timerInterval = setInterval(() => {
      state.timerVal = Math.min(999, state.timerVal + 1);
      renderLED(timerCanvas, state.timerVal);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = undefined;
  }

  // ============================================================
  // MOUSE EVENTS
  // ============================================================
  /** @param {MouseEvent} e */
  function onCellMouseDown(e) {
    e.preventDefault();
    if (state.gamePhase === 'won' || state.gamePhase === 'lost') return;
    const cellEl = eventCell(e);
    const [r, c] = cellPosition(cellEl);

    if (e.button === 0) {
      state.mouseDown = true;
      const cell = state.board[r][c];
      if (!cell.revealed && !cell.flagged) {
        state.pressedCell = [r, c];
        cellEl.classList.add('pressed-look');
      } else if (cell.revealed && cell.adjacentMines > 0) {
        // Chord press - highlight neighbors
        state.pressedCell = [r, c];
        highlightNeighbors(r, c, true);
      }
      drawFace(faceCanvas, 'wow');
    } else if (e.button === 2) {
      toggleFlag(r, c);
    }
  }

  /** @param {MouseEvent} e */
  function onCellMouseUp(e) {
    if (e.button !== 0) return;
    if (state.gamePhase === 'won' || state.gamePhase === 'lost') {
      state.mouseDown = false;
      state.pressedCell = null;
      return;
    }
    const cellEl = eventCell(e);
    const [r, c] = cellPosition(cellEl);

    if (state.pressedCell) {
      const [pr, pc] = state.pressedCell;
      // Unhighlight
      if (state.board[pr][pc].revealed) {
        highlightNeighbors(pr, pc, false);
      } else {
        cellEl.classList.remove('pressed-look');
      }

      if (pr === r && pc === c) {
        const cell = state.board[r][c];
        if (cell.revealed) {
          chordReveal(r, c);
        } else {
          revealCell(r, c);
        }
      }
      state.pressedCell = null;
    }

    state.mouseDown = false;
    if (state.gamePhase === 'playing' || state.gamePhase === 'idle') {
      drawFace(faceCanvas, 'smile');
    }
    updateAllCells(state.triggeredMine?.[0], state.triggeredMine?.[1]);
  }

  /** @param {MouseEvent} e */
  function onCellEnter(e) {
    if (!state.mouseDown || !state.pressedCell) return;
    if (state.gamePhase === 'won' || state.gamePhase === 'lost') return;
    const cellEl = eventCell(e);
    const [r, c] = cellPosition(cellEl);
    const [pr, pc] = state.pressedCell;

    // If moved to a different cell while pressing, un-press old, press new
    const oldCell = state.board[pr][pc];
    if (!oldCell.revealed) {
      const oldEl = document.querySelector(`[data-r="${pr}"][data-c="${pc}"]`);
      if (oldEl) oldEl.classList.remove('pressed-look');
    }

    const newCell = state.board[r][c];
    if (!newCell.revealed && !newCell.flagged) {
      cellEl.classList.add('pressed-look');
    }
    state.pressedCell = [r, c];
  }

  /** @param {MouseEvent} e */
  function onCellRightClick(e) {
    e.preventDefault();
  }

  // ============================================================
  // TOUCH EVENTS (mobile: long-press to flag, tap to reveal)
  // ============================================================
  const LONG_PRESS_MS = 350;
  const TOUCH_MOVE_CANCEL_PX = 10;
  /**
   * @type {{ r: number, c: number, el: HTMLElement, timer: ReturnType<typeof setTimeout>,
   *   longPressFired: boolean, startX: number, startY: number } | null}
   */
  let touchState = null;

  function clearTouchState() {
    if (!touchState) return;
    clearTimeout(touchState.timer);
    touchState.el.classList.remove('pressed-look');
    touchState = null;
    if (state.gamePhase === 'playing' || state.gamePhase === 'idle') {
      drawFace(faceCanvas, 'smile');
    }
  }

  /** @param {TouchEvent} e */
  function onCellTouchStart(e) {
    if (e.touches.length > 1) {
      clearTouchState();
      return;
    }
    if (state.gamePhase === 'won' || state.gamePhase === 'lost') return;
    const el = eventCell(e);
    const [r, c] = cellPosition(el);
    const touch = e.touches[0];
    const cell = state.board[r][c];

    touchState = {
      r,
      c,
      el,
      longPressFired: false,
      startX: touch.clientX,
      startY: touch.clientY,
      timer: setTimeout(() => {
        if (!touchState) return;
        touchState.longPressFired = true;
        el.classList.remove('pressed-look');
        toggleFlag(r, c);
        if (navigator.vibrate) navigator.vibrate(50);
      }, LONG_PRESS_MS),
    };

    if (!cell.revealed && !cell.flagged) el.classList.add('pressed-look');
    drawFace(faceCanvas, 'wow');
  }

  /** @param {TouchEvent} e */
  function onCellTouchMove(e) {
    if (!touchState) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchState.startX;
    const dy = touch.clientY - touchState.startY;
    // Finger moved too far: treat as scroll, not a tap or long-press
    if (Math.hypot(dx, dy) > TOUCH_MOVE_CANCEL_PX) clearTouchState();
  }

  /** @param {TouchEvent} e */
  function onCellTouchEnd(e) {
    if (!touchState) return;
    // Suppress the synthesized mouse events so the cell isn't handled twice
    e.preventDefault();
    clearTimeout(touchState.timer);
    touchState.el.classList.remove('pressed-look');

    const { r, c, longPressFired } = touchState;
    touchState = null;

    if (!longPressFired && state.gamePhase !== 'won' && state.gamePhase !== 'lost') {
      const cell = state.board[r][c];
      if (cell.revealed) {
        chordReveal(r, c);
      } else {
        revealCell(r, c);
      }
      updateAllCells(state.triggeredMine?.[0], state.triggeredMine?.[1]);
    }

    if (state.gamePhase === 'playing' || state.gamePhase === 'idle') {
      drawFace(faceCanvas, 'smile');
    }
  }

  function onCellTouchCancel() {
    clearTouchState();
  }

  /**
   * @param {number} r
   * @param {number} c
   * @param {boolean} pressed
   */
  function highlightNeighbors(r, c, pressed) {
    getNeighbors(r, c).forEach(([nr, nc]) => {
      const cell = state.board[nr][nc];
      if (!cell.revealed && !cell.flagged) {
        const el = document.querySelector(`[data-r="${nr}"][data-c="${nc}"]`);
        if (el) {
          if (pressed) el.classList.add('pressed-look');
          else el.classList.remove('pressed-look');
        }
      }
    });
  }

  // Global mouse up (in case released outside cell)
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0 && state.mouseDown) {
      state.mouseDown = false;
      if (state.pressedCell) {
        const [pr, pc] = state.pressedCell;
        if (state.board[pr][pc] && !state.board[pr][pc].revealed) {
          const oldEl = document.querySelector(`[data-r="${pr}"][data-c="${pc}"]`);
          if (oldEl) oldEl.classList.remove('pressed-look');
        } else if (state.board[pr][pc] && state.board[pr][pc].revealed) {
          highlightNeighbors(pr, pc, false);
        }
        state.pressedCell = null;
      }
      if (state.gamePhase === 'playing' || state.gamePhase === 'idle') {
        drawFace(faceCanvas, 'smile');
      }
    }
  });

  // ============================================================
  // FACE BUTTON
  // ============================================================
  faceBtn.addEventListener('mousedown', () => {
    faceBtn.classList.add('pressed');
  });
  faceBtn.addEventListener('mouseup', () => {
    faceBtn.classList.remove('pressed');
    const { rows, cols, mines, diff } = state;
    initGame(rows, cols, mines, diff);
  });
  faceBtn.addEventListener('mouseleave', () => {
    faceBtn.classList.remove('pressed');
  });

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
      const { rows, cols, mines, diff } = state;
      initGame(rows, cols, mines, diff);
    }
  });

  // ============================================================
  // MENU LOGIC
  // ============================================================
  function closeAllMenus() {
    document.querySelectorAll('.menu-item').forEach((m) => m.classList.remove('open'));
  }

  byId('menuBar', HTMLDivElement).addEventListener('click', (e) => {
    const menuItem = e.target instanceof Element ? e.target.closest('.menu-item') : null;
    if (!menuItem) {
      closeAllMenus();
      return;
    }
    const wasOpen = menuItem.classList.contains('open');
    closeAllMenus();
    if (!wasOpen) menuItem.classList.add('open');
    e.stopPropagation();
  });

  document.addEventListener('click', closeAllMenus);

  byId('menuNew', HTMLDivElement).addEventListener('click', () => {
    closeAllMenus();
    const { rows, cols, mines, diff } = state;
    initGame(rows, cols, mines, diff);
  });

  /** @param {keyof typeof DIFFS} name */
  function setDiff(name) {
    closeAllMenus();
    const d = DIFFS[name];
    initGame(d.rows, d.cols, d.mines, name);
  }

  byId('menuBeginner', HTMLDivElement).addEventListener('click', () => setDiff('beginner'));
  byId('menuIntermediate', HTMLDivElement).addEventListener('click', () => setDiff('intermediate'));
  byId('menuExpert', HTMLDivElement).addEventListener('click', () => setDiff('expert'));

  byId('menuCustom', HTMLDivElement).addEventListener('click', () => {
    closeAllMenus();
    customRows.value = String(state.rows);
    customCols.value = String(state.cols);
    customMines.value = String(state.mines);
    customDialog.classList.add('visible');
  });

  menuMarks.addEventListener('click', () => {
    closeAllMenus();
    state.useMarks = !state.useMarks;
    menuMarks.classList.toggle('checked', state.useMarks);
  });

  byId('menuBestTimes', HTMLDivElement).addEventListener('click', () => {
    closeAllMenus();
    showBestTimes();
  });

  byId('menuAbout', HTMLDivElement).addEventListener('click', () => {
    closeAllMenus();
    aboutDialog.classList.add('visible');
  });

  function updateDifficultyCheck() {
    ['beginner', 'intermediate', 'expert'].forEach((d) => {
      byId('menu' + d.charAt(0).toUpperCase() + d.slice(1), HTMLDivElement).classList.toggle(
        'checked',
        state.diff === d
      );
    });
  }

  // Custom dialog
  byId('customOk', HTMLButtonElement).addEventListener('click', () => {
    let rows = parseInt(customRows.value) || 9;
    let cols = parseInt(customCols.value) || 9;
    let mines = parseInt(customMines.value) || 10;
    rows = Math.max(9, Math.min(24, rows));
    cols = Math.max(9, Math.min(30, cols));
    mines = Math.max(10, Math.min(rows * cols - 9, mines));
    customDialog.classList.remove('visible');
    initGame(rows, cols, mines, 'custom');
  });
  byId('customCancel', HTMLButtonElement).addEventListener('click', () => {
    customDialog.classList.remove('visible');
  });
  byId('customClose', HTMLDivElement).addEventListener('click', () => {
    customDialog.classList.remove('visible');
  });

  // Best times dialog
  function showBestTimes() {
    const bt = loadBestTimes();
    ['beginner', 'intermediate', 'expert'].forEach((d) => {
      const prefix = d.charAt(0).toUpperCase() + d.slice(1).slice(0, 2);
      const data = bt[d];
      byId('best' + prefix + 'Time', HTMLSpanElement).textContent = String(data ? data.time : 999);
      byId('best' + prefix + 'Name', HTMLSpanElement).textContent = data ? data.name : 'Anonymous';
    });
    bestDialog.classList.add('visible');
  }

  byId('bestOk', HTMLButtonElement).addEventListener('click', () => {
    bestDialog.classList.remove('visible');
  });
  byId('bestClose', HTMLDivElement).addEventListener('click', () => {
    bestDialog.classList.remove('visible');
  });
  byId('bestReset', HTMLButtonElement).addEventListener('click', () => {
    saveBestTimes({});
    showBestTimes();
  });

  // About dialog
  byId('aboutOk', HTMLButtonElement).addEventListener('click', () => {
    aboutDialog.classList.remove('visible');
  });
  byId('aboutClose', HTMLDivElement).addEventListener('click', () => {
    aboutDialog.classList.remove('visible');
  });

  // Close button (minimize to hint)
  byId('closeBtn', HTMLDivElement).addEventListener('click', () => {
    window.history.back();
  });

  // ============================================================
  // NOTIFY PARENT OF SIZE
  // ============================================================
  function notifyParentSize() {
    if (window.self !== window.top) {
      requestAnimationFrame(() => {
        const win = document.querySelector('.window');
        if (win) {
          const width = win.scrollWidth;
          const height = win.scrollHeight;
          window.parent.postMessage(
            {
              type: 'minesweeper-resize',
              width: width,
              height: height,
            },
            '*'
          );
        }
      });
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  // Init marks menu state
  menuMarks.classList.add('checked');
  state.useMarks = true;

  initGame(DIFFS.beginner.rows, DIFFS.beginner.cols, DIFFS.beginner.mines, 'beginner');

  // Iframe mode: hide the game's own window chrome so only the game content shows
  if (window.self !== window.top) {
    document.body.style.background = '#C0C0C0';
    document.body.style.display = 'block';
    document.body.style.minHeight = '0';
    document.body.style.overflow = 'hidden';
    const titleBar = document.querySelector('.title-bar');
    if (titleBar instanceof HTMLElement) titleBar.style.display = 'none';
    const win = document.querySelector('.window');
    if (win instanceof HTMLElement) {
      win.style.border = 'none';
      win.style.boxShadow = 'none';
      win.style.display = 'block';
      win.style.width = 'fit-content';
    }
  }
})();
