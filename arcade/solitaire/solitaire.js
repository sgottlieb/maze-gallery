// solitaire.js — Klondike solitaire game engine

import { createDeck, shuffle, BACK_IMAGE } from '../cards.js';

const $ = (sel) => document.querySelector(sel);

// ============================================================
// Game state
// ============================================================
let state = {
  stock: [],
  waste: [],
  tableau: [[], [], [], [], [], [], []],
  foundations: [[], [], [], []],
  moveCount: 0,
  drawMode: 1,
  selected: null,
};

// Foundation suit order: hearts(0), diamonds(1), clubs(2), spades(3)
const FOUNDATION_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

// Drag state
let drag = null;

// ============================================================
// Image preloading
// ============================================================
function preloadImages(deck) {
  const srcs = deck.map((c) => c.image);
  srcs.push(BACK_IMAGE);
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = src;
        })
    )
  );
}

// ============================================================
// Game setup
// ============================================================
function newGame() {
  let deck = shuffle(createDeck());

  // Add faceUp property to all cards
  deck = deck.map((c) => ({ ...c, faceUp: false }));

  state.tableau = [[], [], [], [], [], [], []];
  state.foundations = [[], [], [], []];
  state.waste = [];
  state.moveCount = 0;
  state.selected = null;
  const acBtn = $('#auto-complete-btn');
  if (acBtn) acBtn.classList.add('hidden');

  // Deal tableau
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck.pop();
      card.faceUp = row === col;
      state.tableau[col].push(card);
    }
  }

  // Remaining cards go to stock
  state.stock = deck;

  render();
}

// ============================================================
// Rendering
// ============================================================
function createCardElement(card, extraClasses = []) {
  const div = document.createElement('div');
  div.classList.add('card');
  if (!card.faceUp) div.classList.add('face-down');
  if (card.faceUp && card.displayColor) div.classList.add(`suit-${card.displayColor}`);
  extraClasses.forEach((cls) => div.classList.add(cls));
  div.dataset.cardId = card.id;

  const img = document.createElement('img');
  img.src = card.faceUp ? card.image : BACK_IMAGE;
  img.alt = card.faceUp ? card.name : 'Card back';
  img.draggable = false;
  div.appendChild(img);

  return div;
}

function isCardSelected(source, col, cardIndex) {
  const sel = state.selected;
  if (!sel) return false;
  if (sel.source === 'waste' && source === 'waste') return true;
  if (
    sel.source === 'tableau' &&
    source === 'tableau' &&
    sel.col === col &&
    cardIndex >= sel.cardIndex
  )
    return true;
  return false;
}

function render() {
  // Move counter
  $('#move-counter').textContent = `Moves: ${state.moveCount}`;

  // Stock
  const stockEl = $('#stock');
  stockEl.innerHTML = '';
  if (state.stock.length > 0) {
    stockEl.classList.remove('empty');
    const card = state.stock[state.stock.length - 1];
    const el = createCardElement({ ...card, faceUp: false });
    el.dataset.pile = 'stock';
    stockEl.appendChild(el);
  } else {
    stockEl.classList.add('empty');
  }

  // Waste — in draw-3 mode, fan up to 3 visible cards
  const wasteEl = $('#waste');
  wasteEl.innerHTML = '';
  if (state.waste.length > 0) {
    const showCount = state.drawMode === 3 ? Math.min(3, state.waste.length) : 1;
    const startIdx = state.waste.length - showCount;
    for (let i = 0; i < showCount; i++) {
      const card = state.waste[startIdx + i];
      const isTop = i === showCount - 1;
      const selected = isTop && isCardSelected('waste');
      const el = createCardElement(
        { ...card, faceUp: true },
        selected ? ['selected'] : []
      );
      el.dataset.pile = 'waste';
      const fanOffset = window.innerHeight <= 500 ? 16 : 24;
      el.style.left = `${i * fanOffset}px`;
      el.style.zIndex = i;
      if (!isTop) el.style.pointerEvents = 'none';
      wasteEl.appendChild(el);
    }
  }

  // Foundations
  for (let i = 0; i < 4; i++) {
    const fEl = $(`#foundation-${i}`);
    fEl.innerHTML = '';
    const pile = state.foundations[i];
    if (pile.length > 0) {
      const card = pile[pile.length - 1];
      const el = createCardElement({ ...card, faceUp: true });
      el.dataset.pile = 'foundation';
      el.dataset.foundIndex = i;
      fEl.appendChild(el);
    }
  }

  // Tableau — dynamic overlap per column to fit available height
  const tableauEl = $('#tableau');
  const tableauHeight = tableauEl.clientHeight;
  const cardH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-height')) || 182;

  for (let col = 0; col < 7; col++) {
    const colEl = $(`#tableau-${col}`);
    colEl.innerHTML = '';
    const pile = state.tableau[col];
    if (pile.length === 0) continue;

    let faceUpOffset = 36;
    let faceDownOffset = 8;

    if (pile.length > 1 && tableauHeight > 0) {
      const faceUpCount = pile.filter(c => c.faceUp).length;
      const faceDownCount = pile.length - faceUpCount;
      const needed = faceUpCount * faceUpOffset + faceDownCount * faceDownOffset + cardH;

      if (needed > tableauHeight) {
        const avail = tableauHeight - cardH;
        const total = faceUpCount * faceUpOffset + faceDownCount * faceDownOffset;
        const ratio = avail / total;
        faceUpOffset = Math.max(6, Math.floor(faceUpOffset * ratio));
        faceDownOffset = Math.max(2, Math.floor(faceDownOffset * ratio));
      }
    }

    let topOffset = 0;
    for (let i = 0; i < pile.length; i++) {
      const card = pile[i];
      const selected = isCardSelected('tableau', col, i);
      const el = createCardElement(card, selected ? ['selected'] : []);
      el.style.top = `${topOffset}px`;
      el.style.zIndex = i;
      el.dataset.pile = 'tableau';
      el.dataset.col = col;
      el.dataset.cardIndex = i;
      colEl.appendChild(el);
      topOffset += card.faceUp ? faceUpOffset : faceDownOffset;
    }
  }
}

// ============================================================
// Rules engine
// ============================================================
function canMoveToFoundation(card, foundIdx) {
  const suit = FOUNDATION_SUITS[foundIdx];
  if (card.suit !== suit) return false;
  const pile = state.foundations[foundIdx];
  if (pile.length === 0) return card.value === 1;
  return card.value === pile[pile.length - 1].value + 1;
}

function canMoveToTableau(card, col) {
  const pile = state.tableau[col];
  if (pile.length === 0) return true;
  const topCard = pile[pile.length - 1];
  if (!topCard.faceUp) return false;
  return card.color !== topCard.color && card.value === topCard.value - 1;
}

function findFoundationForCard(card) {
  for (let i = 0; i < 4; i++) {
    if (canMoveToFoundation(card, i)) return i;
  }
  return -1;
}

// ============================================================
// Actions
// ============================================================
function drawFromStock() {
  if (state.stock.length === 0) {
    // Recycle waste back to stock
    state.stock = [...state.waste].reverse().map((c) => ({ ...c, faceUp: false }));
    state.waste = [];
  } else {
    const count = Math.min(state.drawMode, state.stock.length);
    for (let i = 0; i < count; i++) {
      const card = state.stock.pop();
      card.faceUp = true;
      state.waste.push(card);
    }
  }
  state.moveCount++;
  state.selected = null;
  render();
}

function flipTopCard(col) {
  const pile = state.tableau[col];
  if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
    pile[pile.length - 1].faceUp = true;
  }
}

function getSelectedCards() {
  const sel = state.selected;
  if (!sel) return [];
  if (sel.source === 'waste') {
    return state.waste.length > 0 ? [state.waste[state.waste.length - 1]] : [];
  }
  if (sel.source === 'tableau') {
    return state.tableau[sel.col].slice(sel.cardIndex);
  }
  return [];
}

function removeSelectedCards() {
  const sel = state.selected;
  if (sel.source === 'waste') {
    return [state.waste.pop()];
  }
  if (sel.source === 'tableau') {
    const removed = state.tableau[sel.col].splice(sel.cardIndex);
    flipTopCard(sel.col);
    return removed;
  }
  return [];
}

function moveToFoundation(foundIdx) {
  const cards = getSelectedCards();
  if (cards.length !== 1) return false;
  if (!canMoveToFoundation(cards[0], foundIdx)) return false;
  const removed = removeSelectedCards();
  state.foundations[foundIdx].push(removed[0]);
  state.moveCount++;
  state.selected = null;
  render();
  snapLastCard(`#foundation-${foundIdx}`);
  checkWin();
  checkAutoComplete();
  return true;
}

function moveToTableau(col) {
  const cards = getSelectedCards();
  if (cards.length === 0) return false;
  if (!canMoveToTableau(cards[0], col)) return false;
  const removed = removeSelectedCards();
  state.tableau[col].push(...removed);
  state.moveCount++;
  state.selected = null;
  render();
  snapLastCard(`#tableau-${col}`);
  checkWin();
  checkAutoComplete();
  return true;
}

function snapLastCard(pileSelector) {
  const pile = $(pileSelector);
  const lastCard = pile ? pile.querySelector('.card:last-child') : null;
  if (lastCard) {
    lastCard.classList.add('snap');
    lastCard.addEventListener('animationend', () => lastCard.classList.remove('snap'), { once: true });
  }
}

function autoMoveToFoundation(card, source, col, cardIndex) {
  const foundIdx = findFoundationForCard(card);
  if (foundIdx === -1) return false;

  // Remove card from source
  if (source === 'waste') {
    state.waste.pop();
  } else if (source === 'tableau') {
    state.tableau[col].splice(cardIndex);
    flipTopCard(col);
  }

  state.foundations[foundIdx].push(card);
  state.moveCount++;
  state.selected = null;
  render();
  snapLastCard(`#foundation-${foundIdx}`);
  checkWin();
  checkAutoComplete();
  return true;
}

// ============================================================
// Click/Tap interaction (with built-in double-click detection)
// ============================================================
let lastClickInfo = { time: 0, cardId: null };

function resetClickInfo() {
  lastClickInfo = { time: 0, cardId: null };
}

function handleClick(e) {
  if (drag) return;

  const cardEl = e.target.closest('.card');
  const pileEl = e.target.closest('.pile');

  // Click on stock
  if (pileEl && pileEl.id === 'stock') {
    resetClickInfo();
    drawFromStock();
    return;
  }

  // Detect double-click: same card clicked within 500ms
  const now = Date.now();
  const cardId = cardEl ? cardEl.dataset.cardId : null;

  if (cardId && now - lastClickInfo.time < 500 && cardId === lastClickInfo.cardId) {
    resetClickInfo();
    state.selected = null;

    // Try to auto-move this card to foundation
    if (state.waste.length > 0 && state.waste[state.waste.length - 1].id === cardId) {
      const card = state.waste[state.waste.length - 1];
      if (autoMoveToFoundation(card, 'waste')) return;
    }

    for (let col = 0; col < 7; col++) {
      const pile = state.tableau[col];
      if (pile.length === 0) continue;
      const last = pile[pile.length - 1];
      if (last.id === cardId && last.faceUp) {
        if (autoMoveToFoundation(last, 'tableau', col, pile.length - 1)) return;
        break;
      }
    }

    render();
    return;
  }

  // If something is selected, try to complete the move
  if (state.selected) {
    if (pileEl && pileEl.classList.contains('foundation')) {
      const foundIdx = parseInt(pileEl.id.replace('foundation-', ''));
      if (moveToFoundation(foundIdx)) {
        resetClickInfo();
        return;
      }
    }

    if (pileEl && pileEl.classList.contains('column')) {
      const col = parseInt(pileEl.id.replace('tableau-', ''));
      if (moveToTableau(col)) {
        resetClickInfo();
        return;
      }
    }

    state.selected = null;
    resetClickInfo();
    render();
    return;
  }

  // New selection
  if (!cardEl) return;

  lastClickInfo = { time: now, cardId };

  if (cardEl.dataset.pile === 'waste') {
    state.selected = { source: 'waste' };
    render();
    return;
  }

  if (cardEl.dataset.pile === 'tableau' && !cardEl.classList.contains('face-down')) {
    const col = parseInt(cardEl.dataset.col);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);
    state.selected = { source: 'tableau', col, cardIndex };
    render();
    return;
  }
}

// ============================================================
// Drag and Drop
// ============================================================
const DRAG_THRESHOLD = 6;
let pendingDrag = null;

function isRotatedMode() {
  return window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
}

function getClientPos(e) {
  let x, y;
  if (e.touches && e.touches.length > 0) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
  else if (e.changedTouches && e.changedTouches.length > 0) { x = e.changedTouches[0].clientX; y = e.changedTouches[0].clientY; }
  else { x = e.clientX; y = e.clientY; }
  return { x, y };
}

function beginPendingDrag(e) {
  const cardEl = e.target.closest('.card');
  if (!cardEl || cardEl.classList.contains('face-down')) return;

  const pile = cardEl.dataset.pile;
  if (pile !== 'waste' && pile !== 'tableau') return;

  const pos = getClientPos(e);
  pendingDrag = { cardEl, pile, startX: pos.x, startY: pos.y };
}

function promoteDrag() {
  if (!pendingDrag) return;
  const { cardEl, pile } = pendingDrag;
  const pos = { x: pendingDrag.startX, y: pendingDrag.startY };
  const rect = cardEl.getBoundingClientRect();

  let cards = [];
  let source, col, cardIndex;

  if (pile === 'waste') {
    if (state.waste.length === 0) { pendingDrag = null; return; }
    cards = [state.waste[state.waste.length - 1]];
    source = 'waste';
  } else {
    col = parseInt(cardEl.dataset.col);
    cardIndex = parseInt(cardEl.dataset.cardIndex);
    cards = state.tableau[col].slice(cardIndex);
    source = 'tableau';
  }

  const rotated = isRotatedMode();
  const ghost = document.createElement('div');
  ghost.style.position = 'fixed';
  ghost.style.zIndex = '10000';
  ghost.style.pointerEvents = 'none';
  ghost.id = 'drag-ghost';

  if (rotated) {
    ghost.style.transformOrigin = 'top left';
    ghost.style.transform = 'rotate(90deg)';
    ghost.style.left = `${rect.left + rect.width}px`;
    ghost.style.top = `${rect.top}px`;
  } else {
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
  }

  const stackOffset = rotated ? 24 : 36;
  cards.forEach((card, i) => {
    const el = createCardElement({ ...card, faceUp: true });
    el.classList.add('dragging');
    el.style.position = 'absolute';
    el.style.top = `${i * stackOffset}px`;
    el.style.left = '0';
    ghost.appendChild(el);
  });

  document.body.appendChild(ghost);

  if (pile === 'waste') {
    const wasteCards = document.querySelectorAll('#waste .card');
    const topWaste = wasteCards[wasteCards.length - 1];
    if (topWaste) topWaste.style.opacity = '0.2';
  } else {
    document.querySelectorAll('.card').forEach((el) => {
      if (
        el.dataset.pile === 'tableau' &&
        parseInt(el.dataset.col) === col &&
        parseInt(el.dataset.cardIndex) >= cardIndex
      ) {
        el.style.opacity = '0.2';
      }
    });
  }

  drag = {
    ghost,
    cards,
    source,
    col,
    cardIndex,
    offsetX: pos.x - rect.left,
    offsetY: pos.y - rect.top,
    rotated,
    cardWidth: rect.width,
  };

  state.selected = null;

  if (drag.cards.length === 1) {
    for (let i = 0; i < 4; i++) {
      if (canMoveToFoundation(drag.cards[0], i)) {
        $(`#foundation-${i}`).classList.add('drop-target');
      }
    }
  }

  pendingDrag = null;
}

function moveDrag(e) {
  const pos = getClientPos(e);

  if (pendingDrag && !drag) {
    const dx = pos.x - pendingDrag.startX;
    const dy = pos.y - pendingDrag.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      promoteDrag();
    }
  }

  if (!drag) return;
  if (drag.rotated) {
    drag.ghost.style.left = `${pos.x - drag.offsetX + drag.cardWidth}px`;
    drag.ghost.style.top = `${pos.y - drag.offsetY}px`;
  } else {
    drag.ghost.style.left = `${pos.x - drag.offsetX}px`;
    drag.ghost.style.top = `${pos.y - drag.offsetY}px`;
  }
}

function endDrag(e) {
  pendingDrag = null;
  if (!drag) return;
  const pos = getClientPos(e);

  // Hide ghost temporarily to find element underneath
  drag.ghost.style.display = 'none';
  const target = document.elementFromPoint(pos.x, pos.y);
  drag.ghost.style.display = '';

  let moved = false;

  if (target) {
    const pileEl = target.closest('.pile');
    if (pileEl) {
      // Set selection so move functions work
      state.selected = {
        source: drag.source,
        col: drag.col,
        cardIndex: drag.cardIndex,
      };

      if (pileEl.classList.contains('foundation')) {
        const foundIdx = parseInt(pileEl.id.replace('foundation-', ''));
        moved = moveToFoundation(foundIdx);
      } else if (pileEl.classList.contains('column')) {
        const col = parseInt(pileEl.id.replace('tableau-', ''));
        moved = moveToTableau(col);
      }
    }
  }

  // Clean up
  document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  drag.ghost.remove();
  drag = null;
  state.selected = null;

  if (!moved) {
    render();
  }
}

// ============================================================
// Draw mode toggle
// ============================================================
function setDrawMode(mode) {
  state.drawMode = mode;
  $('#draw1-btn').classList.toggle('active', mode === 1);
  $('#draw3-btn').classList.toggle('active', mode === 3);
}

// ============================================================
// Auto-complete
// ============================================================
function canAutoComplete() {
  if (state.stock.length > 0) return false;
  if (state.waste.length > 1) return false;
  for (const col of state.tableau) {
    for (const card of col) {
      if (!card.faceUp) return false;
    }
  }
  return true;
}

function runAutoComplete() {
  state.selected = null;
  const btn = $('#auto-complete-btn');
  if (btn) btn.classList.add('hidden');

  function moveNext() {
    let moved = false;
    // Try each tableau column first
    for (let col = 0; col < 7; col++) {
      const pile = state.tableau[col];
      if (pile.length === 0) continue;
      const card = pile[pile.length - 1];
      const fi = findFoundationForCard(card);
      if (fi !== -1) {
        pile.pop();
        state.foundations[fi].push(card);
        state.moveCount++;
        moved = true;
        break;
      }
    }
    // Then try waste
    if (!moved && state.waste.length > 0) {
      const card = state.waste[state.waste.length - 1];
      const fi = findFoundationForCard(card);
      if (fi !== -1) {
        state.waste.pop();
        state.foundations[fi].push(card);
        state.moveCount++;
        moved = true;
      }
    }
    render();
    if (moved) {
      checkWin();
      if (!state.foundations.every((f) => f.length === 13)) {
        setTimeout(moveNext, 350);
      }
    }
  }

  moveNext();
}

function checkAutoComplete() {
  if (canAutoComplete()) {
    const btn = $('#auto-complete-btn');
    if (btn) btn.classList.remove('hidden');
  }
}

// ============================================================
// Win detection & waterfall animation
// ============================================================
function checkWin() {
  const won = state.foundations.every((f) => f.length === 13);
  if (!won) return;

  const btn = $('#auto-complete-btn');
  if (btn) btn.classList.add('hidden');

  const overlay = $('#win-overlay');
  overlay.classList.remove('hidden');

  const canvas = $('#win-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  // Classic Windows solitaire waterfall
  // One card at a time, arcing from its foundation, bouncing across
  // the bottom leaving a trail of copies behind — no canvas clearing
  const cardW = 120;
  const cardH = 168;
  const gravity = 0.15;

  const imgCache = {};
  for (const pile of state.foundations) {
    for (const card of pile) {
      const img = new Image();
      img.src = card.image;
      imgCache[card.id] = img;
    }
  }

  const foundationEls = [0, 1, 2, 3].map(i => $(`#foundation-${i}`).getBoundingClientRect());

  // By rank: all 4 Kings, then all 4 Queens, down to Aces.
  // Each card launches from its own foundation with a unique arc.
  const sequence = [];
  const suitBaseDir = [1, -1, 1, -1];

  for (let value = 13; value >= 1; value--) {
    for (let fi = 0; fi < 4; fi++) {
      const pile = state.foundations[fi];
      const card = pile.find(c => c.value === value);
      if (!card) continue;
      const rect = foundationEls[fi];
      const startX = rect.left + rect.width / 2 - cardW / 2;
      const startY = rect.top;
      const dir = suitBaseDir[fi];
      const speed = 2 + Math.random() * 4;
      const loft = -(1.5 + Math.random() * 5);
      sequence.push({
        card,
        x: startX,
        y: startY,
        vx: dir * speed,
        vy: loft,
      });
    }
  }

  let active = null;
  let queueIdx = 0;
  let frameCount = 0;
  const pauseFrames = 10;
  let pauseCounter = 0;
  // Only stamp a trail copy every N frames so each card face is distinct
  const stampInterval = 3;

  function animate() {
    frameCount++;

    // Launch next card when ready
    if (!active && queueIdx < sequence.length) {
      if (pauseCounter > 0) {
        pauseCounter--;
      } else {
        const item = sequence[queueIdx++];
        active = { ...item, bounceCount: 0, age: 0 };
      }
    }

    if (active) {
      active.vy += gravity;
      active.x += active.vx;
      active.y += active.vy;
      active.age++;

      // Bounce off floor
      if (active.y + cardH >= canvas.height) {
        active.y = canvas.height - cardH;
        active.vy *= -0.7;
        active.bounceCount++;
        if (active.bounceCount > 5 || Math.abs(active.vy) < 0.5) {
          // Draw one final stamp where it settles
          const img = imgCache[active.card.id];
          if (img && img.complete) {
            ctx.drawImage(img, active.x, active.y, cardW, cardH);
          }
          active = null;
          pauseCounter = pauseFrames;
        }
      }

      // Bounce off walls
      if (active) {
        if (active.x < 0) { active.x = 0; active.vx = Math.abs(active.vx); }
        if (active.x + cardW > canvas.width) { active.x = canvas.width - cardW; active.vx = -Math.abs(active.vx); }
      }

      // Stamp a copy every few frames — creates spaced-out trail of distinct cards
      if (active && active.age % stampInterval === 0) {
        const img = imgCache[active.card.id];
        if (img && img.complete) {
          ctx.drawImage(img, active.x, active.y, cardW, cardH);
        }
      }
    }

    const stillGoing = active || queueIdx < sequence.length || pauseCounter > 0;
    if (stillGoing) {
      requestAnimationFrame(animate);
    }
  }

  animate();
}

// ============================================================
// Init
// ============================================================
async function init() {
  const deck = createDeck();
  await preloadImages(deck);

  // Table click (handles both single and double-click)
  $('#table').addEventListener('click', handleClick);

  // Mouse drag (uses movement threshold so clicks/dblclicks aren't blocked)
  $('#table').addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    beginPendingDrag(e);
  });
  document.addEventListener('mousemove', (e) => {
    if (pendingDrag || drag) {
      e.preventDefault();
      moveDrag(e);
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (pendingDrag || drag) {
      endDrag(e);
    }
  });

  // Touch drag
  $('#table').addEventListener(
    'touchstart',
    (e) => {
      beginPendingDrag(e);
    },
    { passive: false }
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      if (pendingDrag || drag) {
        e.preventDefault();
        moveDrag(e);
      }
    },
    { passive: false }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (pendingDrag || drag) {
        endDrag(e);
      }
    },
    { passive: false }
  );

  // Buttons
  $('#new-game-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    newGame();
  });
  $('#play-again-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#win-overlay').classList.add('hidden');
    newGame();
  });
  $('#draw1-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    setDrawMode(1);
  });
  $('#draw3-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    setDrawMode(3);
  });
  $('#auto-complete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    runAutoComplete();
  });

  const rotateBtn = $('#rotate-dismiss');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      $('#rotate-prompt').classList.add('dismissed');
    });
  }

  // Debug: press W to preview win animation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') {
      const deck = createDeck().map(c => ({ ...c, faceUp: true }));
      state.foundations = [[], [], [], []];
      state.tableau = [[], [], [], [], [], [], []];
      state.stock = [];
      state.waste = [];
      for (const card of deck) {
        const fi = FOUNDATION_SUITS.indexOf(card.suit);
        state.foundations[fi].push(card);
      }
      state.foundations.forEach(f => f.sort((a, b) => a.value - b.value));
      state.moveCount = 120;
      render();
      checkWin();
    }
  });

  newGame();
}

init();
