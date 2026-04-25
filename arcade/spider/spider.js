// spider.js — Spider Solitaire game engine

import { createCard, SUITS, RANKS, RANK_VALUES, shuffle, BACK_IMAGE } from '../cards.js';

const $ = (sel) => document.querySelector(sel);

// ============================================================
// Game state
// ============================================================
let state = {
  tableau: [[], [], [], [], [], [], [], [], [], []],
  stock: [],
  completed: [],
  suitMode: 1,
  moveCount: 0,
  score: 500,
  selected: null,
};

// ============================================================
// Deck building per suit mode
// ============================================================
function buildDeck(suitMode) {
  const cards = [];
  if (suitMode === 1) {
    for (let i = 0; i < 8; i++) {
      for (const rank of RANKS) {
        cards.push(createCard(rank, 'spades'));
      }
    }
  } else if (suitMode === 2) {
    const suits = ['spades', 'hearts'];
    for (let i = 0; i < 4; i++) {
      for (const suit of suits) {
        for (const rank of RANKS) {
          cards.push(createCard(rank, suit));
        }
      }
    }
  } else {
    for (let i = 0; i < 2; i++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          cards.push(createCard(rank, suit));
        }
      }
    }
  }
  // Each card needs a unique id for DOM tracking (duplicates exist in 2-deck games)
  return cards.map((c, i) => ({ ...c, id: `${c.id}-${i}`, faceUp: false }));
}

// ============================================================
// Image preloading
// ============================================================
function preloadImages() {
  const srcs = new Set();
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      srcs.add(`../cards/${rank}-${suit}.jpg`);
    }
  }
  srcs.add(BACK_IMAGE);
  return Promise.all(
    [...srcs].map(
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

function isCardSelected(col, cardIndex) {
  const sel = state.selected;
  if (!sel) return false;
  return sel.col === col && cardIndex >= sel.cardIndex;
}

function render() {
  // Counters
  $('#move-counter').textContent = `Moves: ${state.moveCount}`;
  $('#score-counter').textContent = `Score: ${Math.max(0, state.score)}`;
  $('#stock-count').textContent = state.stock.length > 0
    ? `${Math.ceil(state.stock.length / 10)} deals left`
    : '';
  $('#completed-count').textContent = `${state.completed.length}/8 complete`;

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

  // Completed
  const completedEl = $('#completed');
  completedEl.innerHTML = '';
  if (state.completed.length > 0) {
    const lastSeq = state.completed[state.completed.length - 1];
    const topCard = lastSeq[0]; // King is first in completed sequence
    const el = createCardElement({ ...topCard, faceUp: true });
    el.dataset.pile = 'completed';
    completedEl.appendChild(el);
  }

  // Tableau
  const tableauEl = $('#tableau');
  const tableauRect = tableauEl.getBoundingClientRect();
  const tableauHeight = tableauRect.height;
  const cardH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-height')) || 182;

  for (let col = 0; col < 10; col++) {
    const colEl = $(`#tableau-${col}`);
    colEl.innerHTML = '';
    const pile = state.tableau[col];
    if (pile.length === 0) continue;

    let faceUpOffset = 30;
    let faceDownOffset = 6;

    if (pile.length > 1 && tableauHeight > 0) {
      const faceUpCount = pile.filter((c) => c.faceUp).length;
      const faceDownCount = pile.length - faceUpCount;
      const needed = faceUpCount * faceUpOffset + faceDownCount * faceDownOffset + cardH;

      if (needed > tableauHeight) {
        const avail = tableauHeight - cardH;
        const total = faceUpCount * faceUpOffset + faceDownCount * faceDownOffset;
        const ratio = avail / total;
        faceUpOffset = Math.max(10, Math.floor(faceUpOffset * ratio));
        faceDownOffset = Math.max(2, Math.floor(faceDownOffset * ratio));
      }
    }

    let topOffset = 0;
    for (let i = 0; i < pile.length; i++) {
      const card = pile[i];
      const selected = isCardSelected(col, i);
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
// Game setup
// ============================================================
function newGame() {
  const deck = shuffle(buildDeck(state.suitMode));

  state.tableau = [[], [], [], [], [], [], [], [], [], []];
  state.stock = [];
  state.completed = [];
  state.moveCount = 0;
  state.score = 500;
  state.selected = null;

  // Deal: columns 0-3 get 6 cards, columns 4-9 get 5 cards
  let idx = 0;
  for (let col = 0; col < 10; col++) {
    const count = col < 4 ? 6 : 5;
    for (let row = 0; row < count; row++) {
      const card = deck[idx++];
      card.faceUp = row === count - 1;
      state.tableau[col].push(card);
    }
  }

  // Remaining 50 cards go to stock
  state.stock = deck.slice(idx);

  render();
}

// ============================================================
// Init
// ============================================================
async function init() {
  await preloadImages();
  newGame();
}

init();
