// solitaire.js — Klondike solitaire game engine

import { createDeck, shuffle, BACK_IMAGE, SUITS } from './cards.js';

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
  extraClasses.forEach((cls) => div.classList.add(cls));
  div.dataset.cardId = card.id;

  const img = document.createElement('img');
  img.src = card.faceUp ? card.image : BACK_IMAGE;
  img.alt = card.faceUp ? card.name : 'Card back';
  img.draggable = false;
  div.appendChild(img);

  return div;
}

function isCardSelected(source, col, cardIndex, foundIndex) {
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

  // Waste — show only the top card
  const wasteEl = $('#waste');
  wasteEl.innerHTML = '';
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1];
    const selected = isCardSelected('waste');
    const el = createCardElement(
      { ...card, faceUp: true },
      selected ? ['selected'] : []
    );
    el.dataset.pile = 'waste';
    wasteEl.appendChild(el);
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

  // Tableau
  for (let col = 0; col < 7; col++) {
    const colEl = $(`#tableau-${col}`);
    colEl.innerHTML = '';
    let topOffset = 0;
    const pile = state.tableau[col];
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
      topOffset += card.faceUp ? 22 : 6;
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
  if (pile.length === 0) return card.value === 13; // Kings only
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
    state.stock = state.waste.reverse().map((c) => ({ ...c, faceUp: false }));
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
  checkWin();
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
  checkWin();
  return true;
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
  checkWin();
  return true;
}

// ============================================================
// Click/Tap interaction
// ============================================================
function handleClick(e) {
  const cardEl = e.target.closest('.card');
  const pileEl = e.target.closest('.pile');

  // Click on stock
  if (pileEl && pileEl.id === 'stock') {
    drawFromStock();
    return;
  }

  // If something is selected, try to complete the move
  if (state.selected) {
    // Clicked a foundation
    if (pileEl && pileEl.classList.contains('foundation')) {
      const foundIdx = parseInt(pileEl.id.replace('foundation-', ''));
      if (moveToFoundation(foundIdx)) return;
    }

    // Clicked a tableau column
    if (pileEl && pileEl.classList.contains('column')) {
      const col = parseInt(pileEl.id.replace('tableau-', ''));
      if (moveToTableau(col)) return;
    }

    // Clear selection
    state.selected = null;
    render();
    return;
  }

  // New selection
  if (!cardEl) return;

  // Waste top card
  if (cardEl.dataset.pile === 'waste') {
    state.selected = { source: 'waste' };
    render();
    return;
  }

  // Tableau face-up card
  if (cardEl.dataset.pile === 'tableau' && !cardEl.classList.contains('face-down')) {
    const col = parseInt(cardEl.dataset.col);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);
    state.selected = { source: 'tableau', col, cardIndex };
    render();
    return;
  }
}

function handleDoubleClick(e) {
  const cardEl = e.target.closest('.card');
  if (!cardEl) return;

  // Waste top card
  if (cardEl.dataset.pile === 'waste' && state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1];
    autoMoveToFoundation(card, 'waste');
    return;
  }

  // Tableau — only bottom-most face-up card (last in column)
  if (cardEl.dataset.pile === 'tableau') {
    const col = parseInt(cardEl.dataset.col);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);
    const pile = state.tableau[col];
    // Only auto-move if it's the last card in the column
    if (cardIndex === pile.length - 1 && pile[cardIndex].faceUp) {
      autoMoveToFoundation(pile[cardIndex], 'tableau', col, cardIndex);
    }
  }
}

// ============================================================
// Drag and Drop
// ============================================================
function getClientPos(e) {
  if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function startDrag(e) {
  const cardEl = e.target.closest('.card');
  if (!cardEl || cardEl.classList.contains('face-down')) return;

  const pile = cardEl.dataset.pile;
  if (pile !== 'waste' && pile !== 'tableau') return;

  const pos = getClientPos(e);
  const rect = cardEl.getBoundingClientRect();

  let cards = [];
  let source, col, cardIndex;

  if (pile === 'waste') {
    if (state.waste.length === 0) return;
    cards = [state.waste[state.waste.length - 1]];
    source = 'waste';
  } else {
    col = parseInt(cardEl.dataset.col);
    cardIndex = parseInt(cardEl.dataset.cardIndex);
    cards = state.tableau[col].slice(cardIndex);
    source = 'tableau';
  }

  // Create ghost
  const ghost = document.createElement('div');
  ghost.style.position = 'fixed';
  ghost.style.zIndex = '10000';
  ghost.style.pointerEvents = 'none';
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.id = 'drag-ghost';

  cards.forEach((card, i) => {
    const el = createCardElement({ ...card, faceUp: true });
    el.classList.add('dragging');
    el.style.position = 'absolute';
    el.style.top = `${i * 22}px`;
    el.style.left = '0';
    ghost.appendChild(el);
  });

  document.body.appendChild(ghost);

  // Make original cards transparent
  const allCards = document.querySelectorAll('.card');
  if (pile === 'waste') {
    const wasteCard = $('#waste .card');
    if (wasteCard) wasteCard.style.opacity = '0.2';
  } else {
    allCards.forEach((el) => {
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
  };

  // Clear any click selection
  state.selected = null;
}

function moveDrag(e) {
  if (!drag) return;
  const pos = getClientPos(e);
  drag.ghost.style.left = `${pos.x - drag.offsetX}px`;
  drag.ghost.style.top = `${pos.y - drag.offsetY}px`;
}

function endDrag(e) {
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
// Win detection & waterfall animation
// ============================================================
function checkWin() {
  const won = state.foundations.every((f) => f.length === 13);
  if (!won) return;

  const overlay = $('#win-overlay');
  overlay.classList.remove('hidden');

  const canvas = $('#win-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  // Collect all card images from foundations
  const allCards = [];
  for (const pile of state.foundations) {
    for (const card of pile) {
      allCards.push(card);
    }
  }

  const particles = [];
  let cardIdx = 0;
  let frameCount = 0;
  const cardW = 60;
  const cardH = 84;
  const gravity = 0.4;

  // Preloaded images map
  const imgCache = {};
  allCards.forEach((card) => {
    const img = new Image();
    img.src = card.image;
    imgCache[card.id] = img;
  });

  function launchParticle() {
    if (cardIdx >= allCards.length) return;
    const card = allCards[cardIdx++];
    particles.push({
      card,
      x: Math.random() * (canvas.width - cardW),
      y: -cardH,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 2 + 1,
      settled: false,
    });
  }

  function animate() {
    frameCount++;

    // Launch a new card every ~4 frames
    if (frameCount % 4 === 0) {
      launchParticle();
    }

    // DON'T clear canvas — trail effect
    let allSettled = true;

    for (const p of particles) {
      if (p.settled) continue;

      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off bottom
      if (p.y + cardH >= canvas.height) {
        p.y = canvas.height - cardH;
        p.vy *= -0.6;
        if (Math.abs(p.vy) < 1) {
          p.vy = 0;
          p.settled = true;
        }
      }

      // Bounce off sides
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x + cardW > canvas.width) { p.x = canvas.width - cardW; p.vx *= -1; }

      const img = imgCache[p.card.id];
      if (img && img.complete) {
        ctx.drawImage(img, p.x, p.y, cardW, cardH);
      }

      if (!p.settled) allSettled = false;
    }

    if (cardIdx < allCards.length) allSettled = false;

    if (!allSettled) {
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

  // Table click (single click)
  $('#table').addEventListener('click', handleClick);

  // Double-click
  $('#table').addEventListener('dblclick', handleDoubleClick);

  // Mouse drag
  $('#table').addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    startDrag(e);
  });
  document.addEventListener('mousemove', (e) => {
    if (drag) {
      e.preventDefault();
      moveDrag(e);
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (drag) {
      endDrag(e);
    }
  });

  // Touch drag
  $('#table').addEventListener(
    'touchstart',
    (e) => {
      startDrag(e);
      if (drag) e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      if (drag) {
        e.preventDefault();
        moveDrag(e);
      }
    },
    { passive: false }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (drag) {
        e.preventDefault();
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

  newGame();
}

init();
