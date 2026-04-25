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

  burstAt(e.clientX, e.clientY);

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
  const count = (state === STATES.DEALING_2) ? 1 : currentReading.cardCount;
  const startIndex = (state === STATES.DEALING_2) ? 1 : 0;

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

  const rect = cardEl.getBoundingClientRect();
  burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2);

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
    answer = 'Maybe';
    detail = `${card1.name} (${card1.value}) < ${card2.name} (${card2.value}) \u2014 the cards are uncertain`;
  } else if (card1.value === card2.value) {
    answer = 'Yes!';
    detail = `${card1.name} (${card1.value}) = ${card2.name} (${card2.value}) \u2014 a rare match`;
  } else {
    answer = 'No';
    detail = `${card1.name} (${card1.value}) > ${card2.name} (${card2.value}) \u2014 the cards say not now`;
  }

  const display = $('#answer-display');
  display.innerHTML = `
    <div class="answer-text">${answer}</div>
    <div class="answer-detail">${detail}</div>
  `;
  display.classList.remove('hidden');

  burstAt(window.innerWidth / 2, window.innerHeight / 2);
}

function showComplete() {
  $('#complete-area').classList.remove('hidden');
}

function burstAt() {}
function initSparkle() {}

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
