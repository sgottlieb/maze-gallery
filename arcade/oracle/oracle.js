import { createDeck, shuffle, BACK_IMAGE } from '../cards.js';

const READINGS = {
  love: {
    title: 'Love Reading',
    prompt: 'Think about yourself and your connection to another person',
    cardCount: 3,
    positions: ['Your Feelings', 'Their Feelings', 'Outcome'],
    suitColor: 'suit-pink'
  },
  yesno: {
    title: 'Yes / No',
    prompt: 'Think of your question',
    cardCount: 2,
    positions: ['First Card', 'Second Card'],
    suitColor: 'suit-pink',
    twoPhase: true
  },
  forecast: {
    title: 'Forecasting Fortune',
    prompt: 'How many days would you like to forecast?',
    cardCount: null,
    suitColor: 'suit-green',
    needsDayPicker: true
  },
  growth: {
    title: 'Wishing for Growth',
    prompt: 'Think about an aspect of life where you wish to grow',
    cardCount: 3,
    positions: ['Trust', 'Delight', 'Excel'],
    descriptions: ['build accountability in this aspect', 'bring motivation to this aspect', 'pursue mastery in this aspect'],
    suitColor: 'suit-green'
  }
};

const STATES = {
  PICK_SPREAD: 'PICK_SPREAD',
  DAY_PICK: 'DAY_PICK',
  SHOW_PROMPT: 'SHOW_PROMPT',
  SHUFFLING: 'SHUFFLING',
  DEALING: 'DEALING',
  REVEALING: 'REVEALING',
  SHUFFLING_2: 'SHUFFLING_2',
  DEALING_2: 'DEALING_2',
  COMPLETE: 'COMPLETE'
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let state = STATES.PICK_SPREAD;
let currentReading = null;
let deck = [];
let drawnCards = [];
let revealIndex = 0;
let shuffleCount = 0;
let forecastDays = 0;

function showSection(id) {
  ['#spread-picker', '#prompt-area', '#day-picker', '#spread-area', '#answer-display', '#complete-area']
    .forEach(sel => {
      const el = $(sel);
      if (el) el.classList.add('hidden');
    });
  const el = $(id);
  if (el) el.classList.remove('hidden');
}

function transition(newState) {
  state = newState;
  switch (state) {
    case STATES.PICK_SPREAD:
      resetReading();
      break;
    case STATES.DAY_PICK:
      showDayPicker();
      break;
    case STATES.SHOW_PROMPT:
      showPrompt();
      break;
    case STATES.DEALING:
    case STATES.DEALING_2:
      dealCards();
      break;
    case STATES.REVEALING:
      enableReveal();
      break;
    case STATES.COMPLETE:
      showComplete();
      break;
  }
}

function showDayPicker() {
  showSection('#day-picker');
  const container = $('#day-buttons');
  container.innerHTML = '';
  for (let i = 1; i <= 7; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.addEventListener('click', () => {
      forecastDays = i;
      currentReading.cardCount = i;
      const dayLabels = ['Tomorrow'];
      for (let d = 2; d <= i; d++) {
        const date = new Date();
        date.setDate(date.getDate() + d);
        dayLabels.push(date.toLocaleDateString('en-US', { weekday: 'long' }));
      }
      currentReading.positions = dayLabels;
      currentReading.prompt = 'Focus on the days ahead';
      transition(STATES.SHOW_PROMPT);
    });
    container.appendChild(btn);
  }
}

function showPrompt() {
  showSection('#prompt-area');
  $('#prompt-text').textContent = currentReading.prompt;
  $('#shuffle-deck').style.backgroundImage = `url('${BACK_IMAGE}')`;
  shuffleCount = 0;
  updateShuffleCounter();
  $('#shuffle-deck').onclick = handleShuffleTap;
}

function updateShuffleCounter() {
  if (shuffleCount === 0) {
    $('#shuffle-counter').textContent = 'Tap to shuffle \u2022 7 times for luck';
  } else if (shuffleCount < 7) {
    $('#shuffle-counter').textContent = `${shuffleCount} of 7`;
  } else {
    $('#shuffle-counter').textContent = 'Ready!';
  }
}

function handleShuffleTap(e) {
  if (shuffleCount >= 7) return;

  deck = shuffle(deck);
  shuffleCount++;
  updateShuffleCounter();

  const deckEl = $('#shuffle-deck');
  deckEl.classList.remove('shuffling');
  void deckEl.offsetWidth;
  deckEl.classList.add('shuffling');

  burstAtElement(deckEl);

  if (shuffleCount >= 7) {
    deckEl.onclick = null;
    setTimeout(() => {
      if (state === STATES.SHUFFLING_2) {
        transition(STATES.DEALING_2);
      } else {
        transition(STATES.DEALING);
      }
    }, 500);
  }
}

function dealCards() {
  const isSecondPhase = state === STATES.DEALING_2;
  const isFirstPhaseOfTwo = currentReading.twoPhase && !isSecondPhase;
  const count = (isSecondPhase || isFirstPhaseOfTwo) ? 1 : currentReading.cardCount;
  const startIndex = isSecondPhase ? drawnCards.length : 0;

  for (let i = 0; i < count; i++) {
    drawnCards.push(deck.pop());
  }

  showSection('#spread-area');
  const area = $('#spread-area');

  if (state !== STATES.DEALING_2) {
    area.innerHTML = '';
  }

  const positions = currentReading.positions;

  for (let i = startIndex; i < drawnCards.length; i++) {
    const card = drawnCards[i];
    const slot = document.createElement('div');
    slot.className = 'oracle-card-slot dealing';
    slot.style.animationDelay = `${(i - startIndex) * 0.15}s`;

    slot.innerHTML = `
      <div class="oracle-card" data-index="${i}">
        <div class="oracle-card-inner">
          <div class="oracle-card-front ${card.displayColor === 'pink' ? 'suit-pink' : 'suit-green'}">
            <img src="${card.image}" alt="${card.name}" />
          </div>
          <div class="oracle-card-back" style="background-image: url('${BACK_IMAGE}')"></div>
        </div>
      </div>
      <div class="card-label">
        <div class="position-name">${positions[i]}</div>
        ${currentReading.descriptions ? `<div class="position-desc">${currentReading.descriptions[i]}</div>` : ''}
        <div class="card-name hidden" data-reveal="${i}">${card.name}</div>
        <div class="card-theme hidden" data-reveal="${i}">${card.theme}</div>
      </div>
    `;

    area.appendChild(slot);
  }

  setTimeout(() => {
    transition(STATES.REVEALING);
  }, count * 150 + 500);
}

function enableReveal() {
  if (revealIndex >= drawnCards.length) {
    if (currentReading.twoPhase && revealIndex === 1) {
      shuffleCount = 0;
      transition(STATES.SHUFFLING_2);
      showSection('#prompt-area');
      $('#prompt-text').textContent = 'Shuffle again for the second card';
      $('#shuffle-deck').style.backgroundImage = `url('${BACK_IMAGE}')`;
      updateShuffleCounter();
      $('#shuffle-deck').onclick = handleShuffleTap;
      return;
    }
    transition(STATES.COMPLETE);
    return;
  }

  const cards = $$('.oracle-card');
  cards.forEach((cardEl, i) => {
    if (i === revealIndex) {
      cardEl.classList.add('tappable');
      cardEl.onclick = () => revealCard(i, cardEl);
    } else {
      cardEl.classList.remove('tappable');
      cardEl.onclick = null;
    }
  });
}

function revealCard(index, cardEl) {
  cardEl.classList.add('flipped');
  cardEl.classList.remove('tappable');
  cardEl.onclick = null;

  burstAtElement(cardEl);

  $$(`[data-reveal="${index}"]`).forEach(el => el.classList.remove('hidden'));

  revealIndex++;

  if (currentReading.twoPhase && revealIndex === 1) {
    setTimeout(() => {
      shuffleCount = 0;
      state = STATES.SHUFFLING_2;
      showSection('#prompt-area');
      $('#prompt-text').textContent = 'Shuffle again for the second card';
      $('#shuffle-deck').style.backgroundImage = `url('${BACK_IMAGE}')`;
      updateShuffleCounter();
      $('#shuffle-deck').onclick = handleShuffleTap;
    }, 600);
    return;
  }

  if (revealIndex >= drawnCards.length) {
    setTimeout(() => {
      if (currentReading.key === 'yesno') {
        showYesNoAnswer();
      }
      transition(STATES.COMPLETE);
    }, 600);
  } else {
    setTimeout(() => enableReveal(), 300);
  }
}

function showYesNoAnswer() {
  const card1 = drawnCards[0];
  const card2 = drawnCards[1];
  let answer, detail;

  if (card1.value < card2.value) {
    answer = 'Yes';
    detail = `${card1.name} (${card1.value}) < ${card2.name} (${card2.value})`;
  } else if (card1.value === card2.value) {
    answer = 'YES!';
    detail = `${card1.name} (${card1.value}) = ${card2.name} (${card2.value}) \u2014 a rare match!`;
  } else {
    answer = 'No';
    detail = `${card1.name} (${card1.value}) > ${card2.name} (${card2.value})`;
  }

  const display = $('#answer-display');
  display.innerHTML = `
    <div class="answer-text">${answer}</div>
    <div class="answer-detail">${detail}</div>
  `;
  display.classList.remove('hidden');

  burstAt(sparkleCtx.canvas.width / 2, sparkleCtx.canvas.height / 2);
}

function showComplete() {
  $('#complete-area').classList.remove('hidden');
}

// ---- Sparkle Engine ----
let sparkleCtx = null;
let sparkles = [];
let sparkleRAF = null;
let sparkleFog = false;
let fogAlpha = 0;

function initSparkle() {
  const canvas = $('#sparkle-canvas');
  const gameEl = $('#game');
  sparkleCtx = canvas.getContext('2d');

  function resize() {
    canvas.width = gameEl.clientWidth;
    canvas.height = gameEl.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  sparkleFog = true;
  sparkleLoop();
}

function sparkleLoop() {
  if (!sparkleCtx) return;
  const { width, height } = sparkleCtx.canvas;
  sparkleCtx.clearRect(0, 0, width, height);

  // Fog layer: soft glowing mist when in a reading
  const targetFog = sparkleFog ? 1 : 0;
  fogAlpha += (targetFog - fogAlpha) * 0.02;
  if (fogAlpha > 0.01) {
    sparkleCtx.save();
    const grad = sparkleCtx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
    grad.addColorStop(0, `rgba(242, 212, 221, ${fogAlpha * 0.3})`);
    grad.addColorStop(0.5, `rgba(245, 240, 235, ${fogAlpha * 0.18})`);
    grad.addColorStop(1, `rgba(212, 207, 201, ${fogAlpha * 0.08})`);
    sparkleCtx.fillStyle = grad;
    sparkleCtx.fillRect(0, 0, width, height);
    sparkleCtx.restore();
  }

  // Small sparkles: lots of tiny glitter
  for (let s = 0; s < 8; s++) {
    if (Math.random() < 0.9) {
      sparkles.push(createSmallSparkle(Math.random() * width, Math.random() * height));
    }
  }
  // Medium sparkles
  for (let s = 0; s < 5; s++) {
    if (Math.random() < 0.8) {
      sparkles.push(createSparkle(Math.random() * width, Math.random() * height, false));
    }
  }
  // Large fog sparkles: slow, glowy
  for (let s = 0; s < 3; s++) {
    if (Math.random() < 0.7) {
      sparkles.push(createFogSparkle(Math.random() * width, Math.random() * height));
    }
  }

  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life -= s.decay;
    if (s.life <= 0) {
      sparkles.splice(i, 1);
      continue;
    }
    s.x += s.vx;
    s.y += s.vy;
    s.vy += s.gravity;
    s.rotation += s.spin;

    const alpha = s.life;
    sparkleCtx.save();
    sparkleCtx.translate(s.x, s.y);
    sparkleCtx.rotate(s.rotation);
    sparkleCtx.globalAlpha = alpha * s.maxAlpha;
    drawSparkleShape(sparkleCtx, s.size, s.color, s.points);
    sparkleCtx.restore();
  }

  sparkleRAF = requestAnimationFrame(sparkleLoop);
}

const SPARKLE_COLORS = [
  '#f2d4dd', '#e8c8d0', '#d4a0b8', '#c87098',
  '#a04060', '#7a2040',
  '#6b3a5c', '#8a4878',
  '#ffffff', '#faf5f0', '#f5ede6', '#efe4dc', '#e8ddd4',
  '#f0e6e8', '#f5d0e0', '#ecd5dc',
  '#d4a850', '#c49a38', '#e8c86a', '#f0d878'
];

function createSparkle(x, y, isBurst) {
  const angle = Math.random() * Math.PI * 2;
  const speed = isBurst ? (1 + Math.random() * 3) : (0.1 + Math.random() * 0.3);
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - (isBurst ? 1 : 0),
    size: isBurst ? (2 + Math.random() * 4) : (1 + Math.random() * 2),
    life: 1,
    maxAlpha: 1,
    gravity: 0.01,
    decay: isBurst ? (0.015 + Math.random() * 0.02) : (0.005 + Math.random() * 0.008),
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.1,
    points: 4 + Math.floor(Math.random() * 4),
    color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]
  };
}

function createSmallSparkle(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.1 + Math.random() * 0.3;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 0.5 + Math.random() * 1.5,
    life: 1,
    maxAlpha: 0.6 + Math.random() * 0.4,
    gravity: 0,
    decay: 0.008 + Math.random() * 0.012,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.15,
    points: 4 + Math.floor(Math.random() * 4),
    color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]
  };
}

function createFogSparkle(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.15 + Math.random() * 0.35;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 4 + Math.random() * 8,
    life: 1,
    maxAlpha: 0.5 + Math.random() * 0.3,
    gravity: 0,
    decay: 0.002 + Math.random() * 0.003,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.03,
    points: 4 + Math.floor(Math.random() * 4),
    color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]
  };
}

function drawSparkleShape(ctx, size, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const inner = points <= 4 ? 0.15 : 0.2;
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 - Math.PI / 2;
    const ax = Math.cos(a) * size;
    const ay = Math.sin(a) * size;
    const b = ((i + 0.5) / points) * Math.PI * 2 - Math.PI / 2;
    const bx = Math.cos(b) * size * inner;
    const by = Math.sin(b) * size * inner;
    if (i === 0) ctx.moveTo(ax, ay);
    else ctx.lineTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fill();

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function getLocalPos(el) {
  const gameEl = $('#game');
  let x = 0, y = 0, cur = el;
  while (cur && cur !== gameEl) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent;
  }
  return { x, y };
}

function burstAt(localX, localY) {
  for (let i = 0; i < 40; i++) {
    sparkles.push(createSparkle(localX, localY, true));
  }
}

function burstAtElement(el) {
  const pos = getLocalPos(el);
  burstAt(pos.x + el.offsetWidth / 2, pos.y + el.offsetHeight / 2);
}

function init() {
  $('#center-deck').style.backgroundImage = `url('${BACK_IMAGE}')`;

  $$('.spread-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const spreadKey = opt.dataset.spread;
      currentReading = { ...READINGS[spreadKey], key: spreadKey };
      deck = createDeck();
      drawnCards = [];
      revealIndex = 0;
      shuffleCount = 0;
      $('#reading-title').textContent = currentReading.title;

      if (currentReading.needsDayPicker) {
        transition(STATES.DAY_PICK);
      } else {
        transition(STATES.SHOW_PROMPT);
      }
    });
  });

  $('#new-reading-btn').addEventListener('click', () => {
    transition(STATES.PICK_SPREAD);
  });

  initSparkle();
}

function resetReading() {
  currentReading = null;
  drawnCards = [];
  revealIndex = 0;
  shuffleCount = 0;
  forecastDays = 0;
  $('#reading-title').textContent = '';
  $('#spread-area').innerHTML = '';
  $('#answer-display').innerHTML = '';
  showSection('#spread-picker');
}

document.addEventListener('DOMContentLoaded', init);
