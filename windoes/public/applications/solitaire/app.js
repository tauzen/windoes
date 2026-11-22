(function () {
  'use strict';

  /** @typedef {'spades' | 'hearts' | 'diamonds' | 'clubs'} Suit */
  /**
   * A card before it has an element: `rank` is 0 (ace) to 12 (king).
   * @typedef {object} NewCard
   * @property {Suit} suit
   * @property {number} rank
   * @property {boolean} faceUp
   */
  /** @typedef {NewCard & { el: HTMLElement }} Card */
  /**
   * Where a card lies: the pile number within its zone and its index in it.
   * @typedef {object} CardLocation
   * @property {'tableau' | 'foundation' | 'waste' | 'stock'} zone
   * @property {number} pile
   * @property {number} index
   */

  // ===== DOM HELPERS =====
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

  // ===== CONSTANTS =====
  /** @type {Suit[]} */
  const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
  /** @type {Record<Suit, string>} */
  const SUIT_SYMBOLS = {
    spades: '\u2660',
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
  };
  /** @type {Record<Suit, string>} */
  const SUIT_COLORS = { spades: 'black', hearts: 'red', diamonds: 'red', clubs: 'black' };
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const CARD_W = 65;
  const CARD_H = 90;
  const TABLEAU_X_START = 15;
  const TABLEAU_Y = 120;
  const TABLEAU_SPACING = 93;
  const FACE_DOWN_OFFSET = 4;
  const FACE_UP_OFFSET = 18;
  const STOCK_X = 15;
  const STOCK_Y = 10;
  const WASTE_X = 108;
  const WASTE_Y = 10;
  const FOUNDATION_X_START = 295;
  const FOUNDATION_Y = 10;
  const FOUNDATION_SPACING = 93;

  // ===== STATE =====
  /** @type {Card[]} */
  let stock = [];
  /** @type {Card[]} */
  let waste = [];
  /** @type {Card[][]} */
  let foundations = [[], [], [], []];
  /** @type {Card[][]} */
  let tableau = [[], [], [], [], [], [], []];
  let score = 0;
  let moves = 0;
  let timer = 0;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let timerInterval = undefined;
  /** @type {Card | null} */
  let selectedCard = null;
  let gameWon = false;

  const gameArea = byId('gameArea', HTMLElement);

  // ===== SEND RESIZE =====
  function sendResize() {
    window.parent.postMessage({ type: 'solitaire-resize', width: 680, height: 524 }, '*');
  }

  // ===== DECK =====
  /** @returns {NewCard[]} */
  function createDeck() {
    /** @type {NewCard[]} */
    let deck = [];
    for (let s of SUITS) {
      for (let r = 0; r < 13; r++) {
        deck.push({ suit: s, rank: r, faceUp: false });
      }
    }
    return deck;
  }

  /**
   * @template T
   * @param {T[]} arr
   * @returns {T[]}
   */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** @param {number} r */
  function rankName(r) {
    return RANKS[r];
  }
  /** @param {Suit} s */
  function suitSymbol(s) {
    return SUIT_SYMBOLS[s];
  }
  /** @param {Suit} s */
  function suitColor(s) {
    return SUIT_COLORS[s];
  }
  /** @param {Suit} s */
  function isRed(s) {
    return s === 'hearts' || s === 'diamonds';
  }

  // Pip layouts: [x%, y%, flipped] for each number card (2-10)
  /** @type {Record<number, number[][]>} */
  const PIP_LAYOUTS = {
    2: [
      [50, 8, 0],
      [50, 92, 1],
    ],
    3: [
      [50, 8, 0],
      [50, 50, 0],
      [50, 92, 1],
    ],
    4: [
      [30, 8, 0],
      [70, 8, 0],
      [30, 92, 1],
      [70, 92, 1],
    ],
    5: [
      [30, 8, 0],
      [70, 8, 0],
      [50, 50, 0],
      [30, 92, 1],
      [70, 92, 1],
    ],
    6: [
      [30, 8, 0],
      [70, 8, 0],
      [30, 50, 0],
      [70, 50, 0],
      [30, 92, 1],
      [70, 92, 1],
    ],
    7: [
      [30, 8, 0],
      [70, 8, 0],
      [30, 50, 0],
      [70, 50, 0],
      [30, 92, 1],
      [70, 92, 1],
      [50, 29, 0],
    ],
    8: [
      [30, 8, 0],
      [70, 8, 0],
      [30, 50, 0],
      [70, 50, 0],
      [30, 92, 1],
      [70, 92, 1],
      [50, 29, 0],
      [50, 71, 1],
    ],
    9: [
      [30, 8, 0],
      [70, 8, 0],
      [30, 36, 0],
      [70, 36, 0],
      [50, 50, 0],
      [30, 64, 1],
      [70, 64, 1],
      [30, 92, 1],
      [70, 92, 1],
    ],
    10: [
      [30, 8, 0],
      [70, 8, 0],
      [50, 22, 0],
      [30, 36, 0],
      [70, 36, 0],
      [30, 64, 1],
      [70, 64, 1],
      [50, 78, 1],
      [30, 92, 1],
      [70, 92, 1],
    ],
  };

  /**
   * @param {number} rank
   * @param {string} sym
   */
  function generatePipsHTML(rank, sym) {
    // Ace: single large symbol
    if (rank === 0) {
      return `<div class="card-center">${sym}</div>`;
    }
    // Face cards (J=10, Q=11, K=12): large rank letter
    if (rank >= 10) {
      return `<div class="card-center">${RANKS[rank]}</div>`;
    }
    // Number cards (2-10)
    var count = rank + 1;
    var positions = PIP_LAYOUTS[count];
    var html = '<div class="card-pips">';
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      var cls = p[2] ? 'pip pip-flip' : 'pip';
      html +=
        '<span class="' + cls + '" style="left:' + p[0] + '%;top:' + p[1] + '%">' + sym + '</span>';
    }
    html += '</div>';
    return html;
  }

  // ===== CANVAS CARD SPRITE =====
  // Renders a face-up card to a 65x90 canvas matching the DOM layout.
  // Used by the ending animation to leave trails without spawning
  // thousands of DOM nodes.
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {number} r
   */
  function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** @param {NewCard} card */
  function createCardSprite(card) {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = required(canvas.getContext('2d'), 'canvas 2d context');
    const sym = SUIT_SYMBOLS[card.suit];
    const rn = RANKS[card.rank];
    const red = isRed(card.suit);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    drawRoundedRect(ctx, 1, 1, CARD_W - 1, CARD_H - 1, 4);
    ctx.fill();

    // White face with border
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 0.5, 0.5, CARD_W - 2, CARD_H - 2, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = red ? '#cc0000' : '#000';

    // Top-left corner
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Georgia, "Times New Roman", serif';
    ctx.fillText(rn, 4, 4);
    ctx.font = '11px Georgia, "Times New Roman", serif';
    ctx.fillText(sym, 4, 18);

    // Bottom-right corner (rotated 180)
    ctx.save();
    ctx.translate(CARD_W - 4, CARD_H - 4);
    ctx.rotate(Math.PI);
    ctx.font = 'bold 13px Georgia, "Times New Roman", serif';
    ctx.fillText(rn, 0, 0);
    ctx.font = '11px Georgia, "Times New Roman", serif';
    ctx.fillText(sym, 0, 14);
    ctx.restore();

    // Center
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (card.rank === 0) {
      ctx.font = '24px Georgia, "Times New Roman", serif';
      ctx.fillText(sym, CARD_W / 2, CARD_H / 2);
    } else if (card.rank >= 10) {
      ctx.font = '24px Georgia, "Times New Roman", serif';
      ctx.fillText(rn, CARD_W / 2, CARD_H / 2);
    } else {
      const positions = PIP_LAYOUTS[card.rank + 1];
      const areaX = 4,
        areaY = 16;
      const areaW = CARD_W - 8,
        areaH = CARD_H - 32;
      ctx.font = '12px Georgia, "Times New Roman", serif';
      for (const p of positions) {
        const px = areaX + (areaW * p[0]) / 100;
        const py = areaY + (areaH * p[1]) / 100;
        if (p[2]) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.PI);
          ctx.fillText(sym, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(sym, px, py);
        }
      }
    }

    return canvas;
  }

  // ===== CARD ELEMENT =====
  /**
   * Gives the card its element and adds the element to the game area.
   * @param {NewCard} card
   * @returns {Card}
   */
  function createCardElement(card) {
    let el = document.createElement('div');
    el.className = 'card';
    el.dataset.suit = card.suit;
    el.dataset.rank = String(card.rank);
    const placed = Object.assign(card, { el });
    updateCardElement(placed);
    gameArea.appendChild(el);
    return placed;
  }

  /** @param {Card} card */
  function updateCardElement(card) {
    let el = card.el;
    if (card.faceUp) {
      let color = suitColor(card.suit);
      let sym = suitSymbol(card.suit);
      let rn = rankName(card.rank);
      let pipsHTML = generatePipsHTML(card.rank, sym);
      el.innerHTML = `<div class="card-face ${color}">
              <div class="card-top"><span class="card-rank">${rn}</span><span class="card-suit-small">${sym}</span></div>
              ${pipsHTML}
              <div class="card-bottom"><span class="card-rank">${rn}</span><span class="card-suit-small">${sym}</span></div>
          </div>`;
    } else {
      el.innerHTML = `<div class="card-back"><div class="card-back-pattern"></div><div class="card-back-inner"></div></div>`;
    }
  }

  // ===== POSITIONING =====
  function positionCards() {
    // Stock
    stock.forEach((c, i) => {
      c.el.style.left = STOCK_X + 'px';
      c.el.style.top = STOCK_Y + 'px';
      c.el.style.zIndex = String(i + 1);
    });

    // Waste
    waste.forEach((c, i) => {
      c.el.style.left = WASTE_X + 'px';
      c.el.style.top = WASTE_Y + 'px';
      c.el.style.zIndex = String(i + 1);
    });

    // Foundations
    foundations.forEach((pile, fi) => {
      pile.forEach((c, i) => {
        c.el.style.left = FOUNDATION_X_START + fi * FOUNDATION_SPACING + 'px';
        c.el.style.top = FOUNDATION_Y + 'px';
        c.el.style.zIndex = String(i);
      });
    });

    // Tableau
    tableau.forEach((pile, ti) => {
      let y = TABLEAU_Y;
      pile.forEach((c, i) => {
        c.el.style.left = TABLEAU_X_START + ti * TABLEAU_SPACING + 'px';
        c.el.style.top = y + 'px';
        c.el.style.zIndex = String(i + 10);
        y += c.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET;
      });
    });
  }

  // ===== PLACEHOLDERS =====
  function createPlaceholders() {
    // Remove old placeholders
    gameArea.querySelectorAll('.pile-placeholder').forEach((e) => e.remove());

    // Stock placeholder
    let sp = document.createElement('div');
    sp.className = 'pile-placeholder stock-placeholder';
    sp.style.left = STOCK_X + 'px';
    sp.style.top = STOCK_Y + 'px';
    sp.addEventListener('click', onStockClick);
    sp.addEventListener('touchend', (e) => {
      e.preventDefault();
      onStockClick();
    });
    gameArea.appendChild(sp);

    // Waste placeholder
    let wp = document.createElement('div');
    wp.className = 'pile-placeholder';
    wp.style.left = WASTE_X + 'px';
    wp.style.top = WASTE_Y + 'px';
    gameArea.appendChild(wp);

    // Foundation placeholders
    let foundSuits = ['\u2660', '\u2665', '\u2666', '\u2663'];
    for (let i = 0; i < 4; i++) {
      let fp = document.createElement('div');
      fp.className = 'pile-placeholder foundation-placeholder';
      fp.style.left = FOUNDATION_X_START + i * FOUNDATION_SPACING + 'px';
      fp.style.top = FOUNDATION_Y + 'px';
      fp.dataset.suit = foundSuits[i];
      fp.dataset.foundationIndex = String(i);
      fp.addEventListener('click', () => onFoundationPlaceholderClick(i));
      gameArea.appendChild(fp);
    }

    // Tableau placeholders
    for (let i = 0; i < 7; i++) {
      let tp = document.createElement('div');
      tp.className = 'pile-placeholder';
      tp.style.left = TABLEAU_X_START + i * TABLEAU_SPACING + 'px';
      tp.style.top = TABLEAU_Y + 'px';
      tp.dataset.tableauIndex = String(i);
      tp.addEventListener('click', () => onTableauPlaceholderClick(i));
      gameArea.appendChild(tp);
    }
  }

  // ===== GAME INIT =====
  function newGame() {
    gameWon = false;
    score = 0;
    moves = 0;
    timer = 0;
    selectedCard = null;
    clearInterval(timerInterval);
    timerInterval = undefined;
    updateStatusBar();

    byId('winOverlay', HTMLElement).classList.remove('show');

    // Remove old cards and any ending-animation trail canvas
    gameArea.querySelectorAll('.card').forEach((e) => e.remove());
    const oldTrail = gameArea.querySelector('.ending-canvas');
    if (oldTrail) oldTrail.remove();

    let deck = shuffle(createDeck());

    stock = [];
    waste = [];
    foundations = [[], [], [], []];
    tableau = [[], [], [], [], [], [], []];

    // Deal tableau
    let idx = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        let card = deck[idx++];
        card.faceUp = row === col;
        tableau[col].push(createCardElement(card));
      }
    }

    // Remaining go to stock
    for (let i = idx; i < 52; i++) {
      let card = deck[i];
      card.faceUp = false;
      stock.push(createCardElement(card));
    }

    createPlaceholders();
    positionCards();
    attachCardEvents();
  }

  // ===== TIMER =====
  function startTimerIfNeeded() {
    if (!timerInterval && !gameWon) {
      timerInterval = setInterval(() => {
        timer++;
        updateStatusBar();
      }, 1000);
    }
  }

  function updateStatusBar() {
    byId('statusScore', HTMLElement).textContent = 'Score: ' + score;
    byId('statusMoves', HTMLElement).textContent = 'Moves: ' + moves;
    let m = Math.floor(timer / 60);
    let s = timer % 60;
    byId('statusTime', HTMLElement).textContent = 'Time: ' + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ===== FIND CARD LOCATION =====
  /**
   * @param {Card} card
   * @returns {CardLocation | null}
   */
  function findCard(card) {
    for (let i = 0; i < 7; i++) {
      let idx = tableau[i].indexOf(card);
      if (idx !== -1) return { zone: 'tableau', pile: i, index: idx };
    }
    for (let i = 0; i < 4; i++) {
      let idx = foundations[i].indexOf(card);
      if (idx !== -1) return { zone: 'foundation', pile: i, index: idx };
    }
    let wi = waste.indexOf(card);
    if (wi !== -1) return { zone: 'waste', pile: 0, index: wi };
    let si = stock.indexOf(card);
    if (si !== -1) return { zone: 'stock', pile: 0, index: si };
    return null;
  }

  // ===== MOVE VALIDATION =====
  /**
   * @param {Card} card
   * @param {number} targetCol
   */
  function canMoveToTableau(card, targetCol) {
    let pile = tableau[targetCol];
    if (pile.length === 0) {
      return card.rank === 12; // King
    }
    let top = pile[pile.length - 1];
    if (!top.faceUp) return false;
    return isRed(card.suit) !== isRed(top.suit) && card.rank === top.rank - 1;
  }

  /**
   * @param {Card} card
   * @param {number} fi
   */
  function canMoveToFoundation(card, fi) {
    let pile = foundations[fi];
    if (pile.length === 0) {
      return card.rank === 0; // Ace
    }
    let top = pile[pile.length - 1];
    return card.suit === top.suit && card.rank === top.rank + 1;
  }

  // ===== SCORING =====
  /** @param {number} pts */
  function addScore(pts) {
    score = Math.max(0, score + pts);
    updateStatusBar();
  }

  // ===== STOCK CLICK =====
  function onStockClick() {
    startTimerIfNeeded();
    if (stock.length === 0) {
      // Recycle waste to stock
      if (waste.length === 0) return;
      while (waste.length > 0) {
        let card = required(waste.pop(), 'waste card');
        card.faceUp = false;
        updateCardElement(card);
        stock.push(card);
      }
      addScore(-100);
    } else {
      // Draw one card
      let card = required(stock.pop(), 'stock card');
      card.faceUp = true;
      updateCardElement(card);
      waste.push(card);
      addScore(0);
    }
    clearSelection();
    moves++;
    positionCards();
    attachCardEvents();
    updateStatusBar();
  }

  // ===== MOVE CARDS =====
  /**
   * @param {Card[]} cards
   * @param {CardLocation} loc
   * @param {number} targetCol
   */
  function moveCardsToTableau(cards, loc, targetCol) {
    // Remove from source
    if (loc.zone === 'tableau') {
      tableau[loc.pile].splice(loc.index);
    } else if (loc.zone === 'waste') {
      waste.splice(loc.index, 1);
    } else if (loc.zone === 'foundation') {
      foundations[loc.pile].splice(loc.index, 1);
    }

    // Add to target
    cards.forEach((c) => tableau[targetCol].push(c));

    // Scoring
    if (loc.zone === 'waste') addScore(5);
    else if (loc.zone === 'foundation') addScore(-15);

    flipTopCards();
    moves++;
    positionCards();
    attachCardEvents();
    updateStatusBar();
    checkWin();
  }

  /**
   * @param {Card} card
   * @param {CardLocation} loc
   * @param {number} fi
   */
  function moveCardToFoundation(card, loc, fi) {
    // Remove from source
    if (loc.zone === 'tableau') {
      tableau[loc.pile].splice(loc.index);
    } else if (loc.zone === 'waste') {
      waste.splice(loc.index, 1);
    }

    foundations[fi].push(card);

    // Scoring
    addScore(10);

    flipTopCards();
    moves++;
    positionCards();
    attachCardEvents();
    updateStatusBar();
    checkWin();
  }

  function flipTopCards() {
    for (let i = 0; i < 7; i++) {
      let pile = tableau[i];
      if (pile.length > 0) {
        let top = pile[pile.length - 1];
        if (!top.faceUp) {
          top.faceUp = true;
          updateCardElement(top);
          addScore(5);
        }
      }
    }
  }

  // ===== AUTO MOVE TO FOUNDATION =====
  /** @param {Card} card */
  function autoMoveToFoundation(card) {
    let loc = findCard(card);
    if (!loc) return false;

    // Only top cards (or single from waste)
    if (loc.zone === 'tableau') {
      if (loc.index !== tableau[loc.pile].length - 1) return false;
    } else if (loc.zone === 'waste') {
      if (loc.index !== waste.length - 1) return false;
    } else {
      return false;
    }

    for (let fi = 0; fi < 4; fi++) {
      if (canMoveToFoundation(card, fi)) {
        moveCardToFoundation(card, loc, fi);
        return true;
      }
    }
    return false;
  }

  // ===== SELECTION LOGIC =====
  function clearSelection() {
    if (selectedCard) {
      selectedCard.el.classList.remove('selected');
      // Also clear selection on stacked cards
      let loc = findCard(selectedCard);
      if (loc && loc.zone === 'tableau') {
        for (let i = loc.index; i < tableau[loc.pile].length; i++) {
          tableau[loc.pile][i].el.classList.remove('selected');
        }
      }
      selectedCard = null;
    }
  }

  /** @param {Card} card */
  function selectCard(card) {
    clearSelection();
    selectedCard = card;
    card.el.classList.add('selected');
    let loc = findCard(card);
    if (loc && loc.zone === 'tableau') {
      for (let i = loc.index + 1; i < tableau[loc.pile].length; i++) {
        tableau[loc.pile][i].el.classList.add('selected');
      }
    }
  }

  // ===== CLICK HANDLER =====
  /**
   * @param {Event} e
   * @param {Card} card
   */
  function onCardClick(e, card) {
    if (gameWon) return;
    startTimerIfNeeded();

    let loc = findCard(card);
    if (!loc) return;

    // Stock cards
    if (loc.zone === 'stock') {
      onStockClick();
      return;
    }

    // Face-down cards can't be selected
    if (!card.faceUp) return;

    // If we already have a selection, try to move
    if (selectedCard && selectedCard !== card) {
      let selLoc = findCard(selectedCard);
      if (!selLoc) {
        clearSelection();
        return;
      }

      // Try move to tableau col containing this card
      if (loc.zone === 'tableau') {
        let targetCol = loc.pile;
        let topCard = tableau[targetCol][tableau[targetCol].length - 1];
        if (
          card === topCard ||
          (loc.zone === 'tableau' && loc.index === tableau[loc.pile].length - 1)
        ) {
          let cardsToMove = [selectedCard];
          if (selLoc.zone === 'tableau') {
            cardsToMove = tableau[selLoc.pile].slice(selLoc.index);
          }
          if (canMoveToTableau(selectedCard, targetCol)) {
            moveCardsToTableau(cardsToMove, selLoc, targetCol);
            clearSelection();
            return;
          }
        }
      }

      // Try foundation
      if (loc.zone === 'foundation') {
        if (canMoveToFoundation(selectedCard, loc.pile)) {
          moveCardToFoundation(selectedCard, selLoc, loc.pile);
          clearSelection();
          return;
        }
      }

      // Otherwise, select new card
      clearSelection();
    }

    // Select this card
    if (loc.zone === 'waste' && loc.index === waste.length - 1) {
      selectCard(card);
    } else if (loc.zone === 'tableau' && card.faceUp) {
      selectCard(card);
    } else if (loc.zone === 'foundation' && loc.index === foundations[loc.pile].length - 1) {
      selectCard(card);
    }
  }

  /** @param {number} fi */
  function onFoundationPlaceholderClick(fi) {
    if (!selectedCard) return;
    let loc = findCard(selectedCard);
    if (!loc) {
      clearSelection();
      return;
    }
    if (canMoveToFoundation(selectedCard, fi)) {
      moveCardToFoundation(selectedCard, loc, fi);
    }
    clearSelection();
  }

  /** @param {number} ti */
  function onTableauPlaceholderClick(ti) {
    if (!selectedCard) return;
    let loc = findCard(selectedCard);
    if (!loc) {
      clearSelection();
      return;
    }
    let cardsToMove = [selectedCard];
    if (loc.zone === 'tableau') {
      cardsToMove = tableau[loc.pile].slice(loc.index);
    }
    if (canMoveToTableau(selectedCard, ti)) {
      moveCardsToTableau(cardsToMove, loc, ti);
    }
    clearSelection();
  }

  // ===== DOUBLE CLICK =====
  /**
   * @param {Event} e
   * @param {Card} card
   */
  function onCardDblClick(e, card) {
    if (gameWon) return;
    startTimerIfNeeded();
    clearSelection();
    if (card.faceUp) {
      autoMoveToFoundation(card);
    }
  }

  // ===== DRAG AND DROP =====
  /**
   * @param {MouseEvent | TouchEvent} e
   * @param {Card} card
   */
  function onCardPointerDown(e, card) {
    if (gameWon) return;

    const isTouch = e.type === 'touchstart';

    const loc = findCard(card);
    if (!loc) return;
    // The drop handler is a hoisted function, where `loc` is not narrowed.
    const from = loc;
    if (loc.zone === 'stock') {
      if (isTouch) onCardClick(e, card);
      return;
    }

    if (!card.faceUp) return;

    // Only top of waste/foundation, any face-up in tableau
    if (loc.zone === 'waste' && loc.index !== waste.length - 1) return;
    if (loc.zone === 'foundation' && loc.index !== foundations[loc.pile].length - 1) return;

    let cardsToMove = [card];
    if (loc.zone === 'tableau') {
      cardsToMove = tableau[loc.pile].slice(loc.index);
    }

    const touch0 = 'touches' in e ? e.touches[0] : e;
    let startX = touch0.clientX;
    let startY = touch0.clientY;
    let hasMoved = false;

    // Store original positions
    let origPositions = cardsToMove.map((c) => ({
      left: parseInt(c.el.style.left),
      top: parseInt(c.el.style.top),
      zIndex: c.el.style.zIndex,
    }));

    /** @param {MouseEvent | TouchEvent} ev */
    function getCoords(ev) {
      return 'touches' in ev ? ev.touches[0] : ev;
    }

    /** @param {MouseEvent | TouchEvent} ev */
    function onPointerMove(ev) {
      const pt = getCoords(ev);
      let dx = pt.clientX - startX;
      let dy = pt.clientY - startY;

      if (!hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        hasMoved = true;
        cardsToMove.forEach((c) => c.el.classList.add('dragging'));
        startTimerIfNeeded();
      }

      if (hasMoved) {
        if (ev.cancelable) ev.preventDefault();
        cardsToMove.forEach((c, i) => {
          c.el.style.left = origPositions[i].left + dx + 'px';
          c.el.style.top = origPositions[i].top + dy + 'px';
          c.el.style.zIndex = String(9999 + i);
        });
      }
    }

    /** @param {MouseEvent | TouchEvent} ev */
    function onPointerUp(ev) {
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);

      cardsToMove.forEach((c) => c.el.classList.remove('dragging'));

      if (!hasMoved) {
        if (isTouch) onCardClick(ev, card);
        return;
      }

      // Find drop target
      let dropCard = cardsToMove[0];
      let cx = parseInt(dropCard.el.style.left) + CARD_W / 2;
      let cy = parseInt(dropCard.el.style.top) + CARD_H / 2;

      let moved = false;

      // Check foundations (single card only)
      if (cardsToMove.length === 1) {
        for (let fi = 0; fi < 4; fi++) {
          let fx = FOUNDATION_X_START + fi * FOUNDATION_SPACING;
          let fy = FOUNDATION_Y;
          if (cx > fx && cx < fx + CARD_W && cy > fy && cy < fy + CARD_H + 20) {
            if (canMoveToFoundation(card, fi)) {
              moveCardToFoundation(card, from, fi);
              moved = true;
              break;
            }
          }
        }
      }

      // Check tableau columns
      if (!moved) {
        for (let ti = 0; ti < 7; ti++) {
          let tx = TABLEAU_X_START + ti * TABLEAU_SPACING;
          let pile = tableau[ti];
          // Filter out cards being dragged
          let staticPile = pile.filter((c) => !cardsToMove.includes(c));
          let maxY = TABLEAU_Y;
          if (staticPile.length > 0) {
            maxY = parseInt(staticPile[staticPile.length - 1].el.style.top) + CARD_H;
          }

          if (cx > tx && cx < tx + CARD_W && cy > TABLEAU_Y - 20 && cy < maxY + CARD_H) {
            if (canMoveToTableau(card, ti)) {
              moveCardsToTableau(cardsToMove, from, ti);
              moved = true;
              break;
            }
          }
        }
      }

      if (!moved) {
        // Snap back
        cardsToMove.forEach((c, i) => {
          c.el.style.left = origPositions[i].left + 'px';
          c.el.style.top = origPositions[i].top + 'px';
          c.el.style.zIndex = origPositions[i].zIndex;
        });
      }
    }

    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);
  }

  // ===== ATTACH EVENTS =====
  function attachCardEvents() {
    let allCards = [...stock, ...waste, ...foundations.flat(), ...tableau.flat()];
    allCards.forEach((card) => {
      let el = card.el;
      // Remove old listeners by cloning
      let newEl = /** @type {HTMLElement} */ (el.cloneNode(true));
      required(el.parentNode, 'card parent').replaceChild(newEl, el);
      card.el = newEl;

      newEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onCardPointerDown(e, card);
      });
      newEl.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          onCardPointerDown(e, card);
        },
        { passive: false }
      );
      newEl.addEventListener('click', (e) => {
        e.preventDefault();
        onCardClick(e, card);
      });
      newEl.addEventListener('dblclick', (e) => {
        e.preventDefault();
        onCardDblClick(e, card);
      });
    });
  }

  // ===== WIN DETECTION =====
  function checkWin() {
    let total = foundations.reduce((sum, f) => sum + f.length, 0);
    if (total === 52) {
      gameWon = true;
      clearInterval(timerInterval);
      timerInterval = undefined;
      clearSelection();
      startEndingAnimation();
    }
  }

  function showWinOverlay() {
    let m = Math.floor(timer / 60);
    let s = timer % 60;
    byId('winStats', HTMLElement).textContent =
      'Score: ' +
      score +
      '  |  Time: ' +
      m +
      ':' +
      (s < 10 ? '0' : '') +
      s +
      '  |  Moves: ' +
      moves;
    byId('winOverlay', HTMLElement).classList.add('show');
  }

  // ===== ENDING ANIMATION =====
  // Classic Windows Solitaire bouncing-cards animation: pops the top card
  // off each foundation in rotation and shoots it off with gravity,
  // stamping its sprite onto a single trail canvas each tick.
  /** @type {number | null} */
  let endingRafId = null;

  function startEndingAnimation() {
    const GAME_W = 680;
    const GAME_H = 460;
    const GROUND = GAME_H - CARD_H;
    const GRAVITY = 0.35;
    const BOUNCE = 0.82;
    const MIN_BOUNCE_VY = 6;

    // Single trail canvas: O(1) paint cost regardless of trail length.
    const oldTrail = gameArea.querySelector('.ending-canvas');
    if (oldTrail) oldTrail.remove();
    const trailCanvas = document.createElement('canvas');
    trailCanvas.className = 'ending-canvas';
    trailCanvas.width = GAME_W;
    trailCanvas.height = GAME_H;
    trailCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:25000;';
    gameArea.appendChild(trailCanvas);
    const trailCtx = required(trailCanvas.getContext('2d'), 'trail canvas 2d context');

    /** @type {Card | null} */
    let current = null;
    /** @type {HTMLCanvasElement | null} */
    let currentSprite = null;
    let x = 0,
      y = 0,
      vx = 0,
      vy = 0;
    let cursor = 0;

    function pickNext() {
      for (let i = 0; i < 4; i++) {
        const fi = (cursor + i) % 4;
        if (foundations[fi].length > 0) {
          cursor = (fi + 1) % 4;
          return { card: required(foundations[fi].pop(), 'foundation card'), fi };
        }
      }
      return null;
    }

    function startNextCard() {
      const next = pickNext();
      if (!next) {
        endingRafId = null;
        gameArea.removeEventListener('click', skipHandler);
        setTimeout(showWinOverlay, 700);
        return false;
      }
      current = next.card;
      currentSprite = createCardSprite(current);
      x = FOUNDATION_X_START + next.fi * FOUNDATION_SPACING;
      y = FOUNDATION_Y;
      vx = (2 + Math.random() * 3) * (Math.random() < 0.5 ? -1 : 1);
      vy = -(2 + Math.random() * 4);
      current.faceUp = true;
      updateCardElement(current);
      current.el.style.zIndex = '30000';
      current.el.style.left = x + 'px';
      current.el.style.top = y + 'px';
      return true;
    }

    function tick() {
      if (!current && !startNextCard()) return false;
      const card = required(current, 'flying card');

      // Stamp the sprite onto the trail canvas at the current pos.
      trailCtx.drawImage(
        required(currentSprite, 'flying card sprite'),
        Math.round(x),
        Math.round(y)
      );

      vy += GRAVITY;
      x += vx;
      y += vy;

      if (y >= GROUND) {
        y = GROUND;
        vy = -vy * BOUNCE;
        if (Math.abs(vy) < MIN_BOUNCE_VY) vy = -MIN_BOUNCE_VY;
      }

      card.el.style.left = x + 'px';
      card.el.style.top = y + 'px';

      if (x < -CARD_W - 10 || x > GAME_W + 10) {
        card.el.remove();
        current = null;
        currentSprite = null;
      }
      return true;
    }

    function step() {
      if (endingRafId === null) return;
      // Two physics ticks per frame = 2x speed, same trajectory.
      if (!tick()) return;
      if (endingRafId === null) return;
      if (!tick()) return;
      endingRafId = requestAnimationFrame(step);
    }

    function skipHandler() {
      if (endingRafId !== null) {
        cancelAnimationFrame(endingRafId);
        endingRafId = null;
        gameArea.removeEventListener('click', skipHandler);
        showWinOverlay();
      }
    }
    gameArea.addEventListener('click', skipHandler);

    endingRafId = requestAnimationFrame(step);
  }

  // ===== INSPECT MODE =====
  // Visit /applications/solitaire/index.html?autowin (or ?ending) to
  // skip straight to the ending animation.
  function triggerAutoWin() {
    clearInterval(timerInterval);
    timerInterval = undefined;
    gameArea.querySelectorAll('.card').forEach((e) => e.remove());
    stock = [];
    waste = [];
    tableau = [[], [], [], [], [], [], []];
    foundations = [[], [], [], []];
    for (let fi = 0; fi < 4; fi++) {
      for (let r = 0; r < 13; r++) {
        const card = { suit: SUITS[fi], rank: r, faceUp: true };
        foundations[fi].push(createCardElement(card));
      }
    }
    positionCards();
    checkWin();
  }

  // ===== MENU =====
  /** @type {HTMLElement | null} */
  let openMenu = null;

  byId('menu-game', HTMLElement).addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu('dropdown-game');
  });

  byId('menu-help-item', HTMLElement).addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu('dropdown-help');
  });

  /** @param {string} id */
  function toggleMenu(id) {
    let dd = byId(id, HTMLElement);
    if (openMenu === dd) {
      dd.classList.remove('open');
      openMenu = null;
    } else {
      if (openMenu) openMenu.classList.remove('open');
      dd.classList.add('open');
      openMenu = dd;
    }
  }

  document.addEventListener('click', () => {
    if (openMenu) {
      openMenu.classList.remove('open');
      openMenu = null;
    }
    // Clear selection when clicking empty area
  });

  byId('menu-new-game', HTMLElement).addEventListener('click', (e) => {
    e.stopPropagation();
    if (openMenu) {
      openMenu.classList.remove('open');
      openMenu = null;
    }
    newGame();
  });

  byId('winNewGame', HTMLElement).addEventListener('click', () => {
    newGame();
  });

  byId('menu-about', HTMLElement).addEventListener('click', (e) => {
    e.stopPropagation();
    if (openMenu) {
      openMenu.classList.remove('open');
      openMenu = null;
    }
    byId('aboutOverlay', HTMLElement).classList.add('show');
  });

  byId('aboutOkBtn', HTMLElement).addEventListener('click', () => {
    byId('aboutOverlay', HTMLElement).classList.remove('show');
  });

  byId('aboutCloseBtn', HTMLElement).addEventListener('click', () => {
    byId('aboutOverlay', HTMLElement).classList.remove('show');
  });

  // F2 shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
      e.preventDefault();
      newGame();
    }
  });

  // Prevent context menu
  gameArea.addEventListener('contextmenu', (e) => e.preventDefault());

  // ===== INIT =====
  sendResize();
  newGame();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('autowin') || urlParams.has('ending')) {
    triggerAutoWin();
  }
})();
