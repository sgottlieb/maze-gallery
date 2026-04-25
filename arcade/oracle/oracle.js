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
    case STATES.SHUFFLING:
    case STATES.SHUFFLING_2:
      startShuffle();
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

function showDayPicker() {}
function showPrompt() {}
function startShuffle() {}
function dealCards() {}
function enableReveal() {}
function showComplete() {}
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
