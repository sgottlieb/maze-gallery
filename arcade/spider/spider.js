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

// ============================================================
// Rules engine
// ============================================================
function getMovableSequence(col, cardIndex) {
  const pile = state.tableau[col];
  if (cardIndex >= pile.length) return [];
  const card = pile[cardIndex];
  if (!card.faceUp) return [];

  // Check that all cards from cardIndex to end form a same-suit descending run
  for (let i = cardIndex; i < pile.length - 1; i++) {
    const current = pile[i];
    const next = pile[i + 1];
    if (current.suit !== next.suit || current.value !== next.value + 1) {
      return [];
    }
  }
  return pile.slice(cardIndex);
}

function canMoveToColumn(card, col) {
  const pile = state.tableau[col];
  if (pile.length === 0) return true;
  const topCard = pile[pile.length - 1];
  if (!topCard.faceUp) return false;
  return card.value === topCard.value - 1;
}

function flipTopCard(col) {
  const pile = state.tableau[col];
  if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
    pile[pile.length - 1].faceUp = true;
  }
}

function checkSequenceComplete(col) {
  const pile = state.tableau[col];
  if (pile.length < 13) return false;

  const startIdx = pile.length - 13;
  const startCard = pile[startIdx];
  if (!startCard.faceUp || startCard.value !== 13) return false;

  for (let i = 0; i < 12; i++) {
    const current = pile[startIdx + i];
    const next = pile[startIdx + i + 1];
    if (current.suit !== next.suit || current.value !== next.value + 1) {
      return false;
    }
  }

  const completed = pile.splice(startIdx, 13);
  state.completed.push(completed);
  state.score += 100;
  flipTopCard(col);
  return true;
}

function canDealFromStock() {
  if (state.stock.length === 0) return false;
  for (let col = 0; col < 10; col++) {
    if (state.tableau[col].length === 0) return false;
  }
  return true;
}

function dealFromStock() {
  if (!canDealFromStock()) return;

  for (let col = 0; col < 10; col++) {
    const card = state.stock.pop();
    card.faceUp = true;
    state.tableau[col].push(card);
  }

  state.moveCount++;
  state.score--;

  for (let col = 0; col < 10; col++) {
    checkSequenceComplete(col);
  }

  state.selected = null;
  render();
  checkWin();
}

function checkWin() {
  if (state.completed.length === 8) {
    const overlay = $('#win-overlay');
    overlay.classList.remove('hidden');

    const scoreEl = $('#win-score');
    scoreEl.textContent = `Score: ${Math.max(0, state.score)}`;

    const canvas = $('#win-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    waterfallAnimation(canvas);
  }
}

// ============================================================
// Drag state (used by click handler to avoid conflicts)
// ============================================================
let drag = null;

// ============================================================
// Click/Tap interaction
// ============================================================
let lastClickInfo = { time: 0, cardId: null };

function resetClickInfo() {
  lastClickInfo = { time: 0, cardId: null };
}

function snapLastCard(pileSelector) {
  const pile = $(pileSelector);
  const lastCard = pile ? pile.querySelector('.card:last-child') : null;
  if (lastCard) {
    lastCard.classList.add('snap');
    lastCard.addEventListener('animationend', () => lastCard.classList.remove('snap'), { once: true });
  }
}

function findBestMove(card, sourceCol) {
  let sameSuitCol = -1;
  let diffSuitCol = -1;
  let emptyCol = -1;

  for (let col = 0; col < 10; col++) {
    if (col === sourceCol) continue;
    if (!canMoveToColumn(card, col)) continue;
    const pile = state.tableau[col];
    if (pile.length === 0) {
      if (emptyCol === -1) emptyCol = col;
    } else {
      const topCard = pile[pile.length - 1];
      if (topCard.suit === card.suit && sameSuitCol === -1) {
        sameSuitCol = col;
      } else if (diffSuitCol === -1) {
        diffSuitCol = col;
      }
    }
  }

  if (sameSuitCol !== -1) return sameSuitCol;
  if (diffSuitCol !== -1) return diffSuitCol;
  if (emptyCol !== -1) return emptyCol;
  return -1;
}

function moveCards(sourceCol, cardIndex, destCol) {
  const cards = state.tableau[sourceCol].splice(cardIndex);
  state.tableau[destCol].push(...cards);
  flipTopCard(sourceCol);
  state.moveCount++;
  state.score--;
  state.selected = null;

  checkSequenceComplete(destCol);
  render();
  snapLastCard(`#tableau-${destCol}`);
  checkWin();
}

function handleClick(e) {
  if (drag) return;

  const cardEl = e.target.closest('.card');
  const pileEl = e.target.closest('.pile');

  if (pileEl && pileEl.id === 'stock') {
    resetClickInfo();
    dealFromStock();
    return;
  }

  const now = Date.now();
  const cardId = cardEl ? cardEl.dataset.cardId : null;

  if (cardId && now - lastClickInfo.time < 500 && cardId === lastClickInfo.cardId) {
    resetClickInfo();
    state.selected = null;

    for (let col = 0; col < 10; col++) {
      const pile = state.tableau[col];
      for (let i = pile.length - 1; i >= 0; i--) {
        if (pile[i].id === cardId && pile[i].faceUp) {
          const seq = getMovableSequence(col, i);
          if (seq.length > 0) {
            const dest = findBestMove(seq[0], col);
            if (dest !== -1) {
              moveCards(col, i, dest);
              return;
            }
          }
          break;
        }
      }
    }

    render();
    return;
  }

  if (state.selected) {
    if (pileEl && pileEl.classList.contains('column')) {
      const destCol = parseInt(pileEl.id.replace('tableau-', ''));
      const seq = getMovableSequence(state.selected.col, state.selected.cardIndex);
      if (seq.length > 0 && canMoveToColumn(seq[0], destCol)) {
        moveCards(state.selected.col, state.selected.cardIndex, destCol);
        resetClickInfo();
        return;
      }
    }

    state.selected = null;
    resetClickInfo();
    render();
    return;
  }

  if (!cardEl) return;

  lastClickInfo = { time: now, cardId };

  if (cardEl.dataset.pile === 'tableau' && !cardEl.classList.contains('face-down')) {
    const col = parseInt(cardEl.dataset.col);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);
    const seq = getMovableSequence(col, cardIndex);
    if (seq.length > 0) {
      state.selected = { col, cardIndex };
      render();
    }
    return;
  }
}

// ============================================================
// Drag and Drop
// ============================================================
const DRAG_THRESHOLD = 6;
let pendingDrag = null;
// Note: `drag` is already declared above the click handler

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
  if (cardEl.dataset.pile !== 'tableau') return;

  const col = parseInt(cardEl.dataset.col);
  const cardIndex = parseInt(cardEl.dataset.cardIndex);
  const seq = getMovableSequence(col, cardIndex);
  if (seq.length === 0) return;

  const pos = getClientPos(e);
  pendingDrag = { cardEl, col, cardIndex, startX: pos.x, startY: pos.y };
}

function promoteDrag() {
  if (!pendingDrag) return;
  const { cardEl, col, cardIndex } = pendingDrag;
  const pos = { x: pendingDrag.startX, y: pendingDrag.startY };
  const rect = cardEl.getBoundingClientRect();

  const cards = getMovableSequence(col, cardIndex);
  if (cards.length === 0) { pendingDrag = null; return; }

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

  const stackOffset = rotated ? 20 : 30;
  cards.forEach((card, i) => {
    const el = createCardElement({ ...card, faceUp: true });
    el.classList.add('dragging');
    el.style.position = 'absolute';
    el.style.top = `${i * stackOffset}px`;
    el.style.left = '0';
    ghost.appendChild(el);
  });

  document.body.appendChild(ghost);

  document.querySelectorAll('.card').forEach((el) => {
    if (
      el.dataset.pile === 'tableau' &&
      parseInt(el.dataset.col) === col &&
      parseInt(el.dataset.cardIndex) >= cardIndex
    ) {
      el.style.opacity = '0.2';
    }
  });

  drag = {
    ghost,
    cards,
    col,
    cardIndex,
    offsetX: pos.x - rect.left,
    offsetY: pos.y - rect.top,
    rotated,
    cardWidth: rect.width,
  };

  state.selected = null;
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

  drag.ghost.style.display = 'none';
  const target = document.elementFromPoint(pos.x, pos.y);
  drag.ghost.style.display = '';

  let moved = false;

  if (target) {
    const pileEl = target.closest('.pile');
    if (pileEl && pileEl.classList.contains('column')) {
      const destCol = parseInt(pileEl.id.replace('tableau-', ''));
      if (canMoveToColumn(drag.cards[0], destCol)) {
        moveCards(drag.col, drag.cardIndex, destCol);
        moved = true;
      }
    }
  }

  drag.ghost.remove();
  drag = null;
  state.selected = null;

  if (!moved) {
    render();
  }
}

// ============================================================
// Win animation — waterfall
// ============================================================
function waterfallAnimation(canvas) {
  const ctx = canvas.getContext('2d');
  const cardW = 120;
  const cardH = 168;
  const gravity = 0.15;

  const imgCache = {};
  for (const seq of state.completed) {
    for (const card of seq) {
      const img = new Image();
      img.src = card.image;
      imgCache[card.id] = img;
    }
  }

  const sequence = [];
  const dirPattern = [1, -1, 1, -1, 1, -1, 1, -1];

  for (let value = 13; value >= 1; value--) {
    for (let si = 0; si < state.completed.length; si++) {
      const seq = state.completed[si];
      const card = seq.find((c) => c.value === value);
      if (!card) continue;
      const startX = canvas.width / 2 - cardW / 2;
      const startY = 0;
      const dir = dirPattern[si % dirPattern.length];
      const speed = 2 + Math.random() * 4;
      const loft = -(1.5 + Math.random() * 5);
      sequence.push({ card, x: startX, y: startY, vx: dir * speed, vy: loft });
    }
  }

  let active = null;
  let queueIdx = 0;
  let frameCount = 0;
  const pauseFrames = 10;
  let pauseCounter = 0;
  const stampInterval = 3;

  function animate() {
    frameCount++;

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

      if (active.y + cardH >= canvas.height) {
        active.y = canvas.height - cardH;
        active.vy *= -0.7;
        active.bounceCount++;
        if (active.bounceCount > 5 || Math.abs(active.vy) < 0.5) {
          const img = imgCache[active.card.id];
          if (img && img.complete) {
            ctx.drawImage(img, active.x, active.y, cardW, cardH);
          }
          active = null;
          pauseCounter = pauseFrames;
        }
      }

      if (active) {
        if (active.x < 0) { active.x = 0; active.vx = Math.abs(active.vx); }
        if (active.x + cardW > canvas.width) { active.x = canvas.width - cardW; active.vx = -Math.abs(active.vx); }
      }

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
  const isRotated = window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
  const gameHeight = isRotated ? window.innerWidth : window.innerHeight;
  const tableauTop = tableauEl.getBoundingClientRect().top;
  const gameTop = document.getElementById('game').getBoundingClientRect().top;
  const tableauHeight = gameHeight - (tableauTop - gameTop);
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
        const avail = Math.max(0, tableauHeight - cardH);
        const weighted = faceUpCount * 4 + faceDownCount;
        if (weighted > 0) {
          const unit = avail / weighted;
          faceDownOffset = Math.floor(unit);
          faceUpOffset = Math.floor(unit * 4);
        }
        if (faceUpOffset < 1) faceUpOffset = 1;
        if (faceDownOffset < 1) faceDownOffset = 0;
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
// Suit mode toggle
// ============================================================
function setSuitMode(mode) {
  state.suitMode = mode;
  $('#suit1-btn').classList.toggle('active', mode === 1);
  $('#suit2-btn').classList.toggle('active', mode === 2);
  $('#suit4-btn').classList.toggle('active', mode === 4);
}

// ============================================================
// Init
// ============================================================
async function init() {
  await preloadImages();

  // Table click
  $('#table').addEventListener('click', handleClick);

  // Mouse drag
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
  $('#table').addEventListener('touchstart', (e) => {
    beginPendingDrag(e);
  }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (pendingDrag || drag) {
      e.preventDefault();
      moveDrag(e);
    }
  }, { passive: false });
  document.addEventListener('touchend', (e) => {
    if (pendingDrag || drag) {
      endDrag(e);
    }
  }, { passive: false });

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
  $('#suit1-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    setSuitMode(1);
    newGame();
  });
  $('#suit2-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    setSuitMode(2);
    newGame();
  });
  $('#suit4-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    setSuitMode(4);
    newGame();
  });

  newGame();
}

init();
