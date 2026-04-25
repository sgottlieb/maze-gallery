# Oracle Readings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page oracle reading experience at `/arcade/oracle/` with four card reading spreads, a 7-tap shuffle ritual, tap-to-reveal cards, and a Y2K sparkle overlay.

**Architecture:** Single page with a JS state machine driving four reading types (Love, Yes/No, Forecast, Growth). A canvas-based sparkle system provides ambient shimmer and interaction bursts. Imports `createDeck`, `shuffle`, and `BACK_IMAGE` from the shared `cards.js` module.

**Tech Stack:** Vanilla HTML/CSS/JS, ES modules, Canvas 2D API, CSS animations/transitions

---

## File Structure

| File | Responsibility |
|------|---------------|
| `arcade/oracle/index.html` | Page structure, links shared + oracle CSS, loads oracle.js |
| `arcade/oracle/oracle.css` | Spread picker layout, card positions, flip animation, sparkle canvas, responsive |
| `arcade/oracle/oracle.js` | State machine, shuffle ritual, deal/reveal logic, reading definitions, sparkle engine |
| `arcade/index.html` | (modify) Add Oracle tile to game grid |

---

### Task 1: HTML Page Scaffold

**Files:**
- Create: `arcade/oracle/index.html`

- [ ] **Step 1: Create the oracle directory**

```bash
mkdir -p arcade/oracle
```

- [ ] **Step 2: Write the HTML page**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>Oracle — Sara Gottlieb</title>
  <link rel="stylesheet" href="../arcade.css" />
  <link rel="stylesheet" href="oracle.css" />
</head>
<body>
  <div id="game" class="arcade-game">
    <header id="controls">
      <a href="../" class="arcade-back">&larr; Arcade</a>
      <span id="reading-title"></span>
    </header>

    <div id="table">
      <!-- Spread picker: four corners + center deck -->
      <div id="spread-picker">
        <div class="spread-option" data-spread="love">
          <span class="spread-suit suit-pink">&hearts;</span>
          <span class="spread-name">Love</span>
          <span class="spread-count">3 cards</span>
        </div>
        <div class="spread-option" data-spread="yesno">
          <span class="spread-suit suit-pink">&diams;</span>
          <span class="spread-name">Yes / No</span>
          <span class="spread-count">2 cards</span>
        </div>
        <div id="center-deck"></div>
        <div class="spread-option" data-spread="forecast">
          <span class="spread-suit suit-green">&clubs;</span>
          <span class="spread-name">Forecast</span>
          <span class="spread-count">up to 7 cards</span>
        </div>
        <div class="spread-option" data-spread="growth">
          <span class="spread-suit suit-green">&spades;</span>
          <span class="spread-name">Growth</span>
          <span class="spread-count">3 cards</span>
        </div>
      </div>

      <!-- Prompt overlay (shown after picking spread) -->
      <div id="prompt-area" class="hidden">
        <p id="prompt-text"></p>
        <div id="shuffle-deck"></div>
        <p id="shuffle-counter"></p>
      </div>

      <!-- Forecast day picker -->
      <div id="day-picker" class="hidden">
        <p>How many days would you like to forecast?</p>
        <div id="day-buttons"></div>
      </div>

      <!-- Card spread area -->
      <div id="spread-area" class="hidden"></div>

      <!-- Yes/No answer -->
      <div id="answer-display" class="hidden"></div>

      <!-- New Reading button -->
      <div id="complete-area" class="hidden">
        <button id="new-reading-btn" class="arcade-btn">New Reading</button>
      </div>
    </div>

    <!-- Sparkle canvas overlay -->
    <canvas id="sparkle-canvas"></canvas>
  </div>
  <script type="module" src="oracle.js"></script>
</body>
</html>
```

- [ ] **Step 3: Verify file loads in browser**

```bash
# Open in browser or use local server
open arcade/oracle/index.html
```

Expected: Page loads with warm cream background from arcade.css, back link visible. No errors in console.

- [ ] **Step 4: Commit**

```bash
git add arcade/oracle/index.html
git commit -m "feat(oracle): add HTML page scaffold"
```

---

### Task 2: Oracle CSS — Spread Picker & Base Layout

**Files:**
- Create: `arcade/oracle/oracle.css`

- [ ] **Step 1: Write the spread picker and base layout styles**

```css
/* ---- Oracle layout ---- */
#table {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.hidden { display: none !important; }

/* ---- Spread picker: CSS grid, four corners + center ---- */
#spread-picker {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  grid-template-rows: 1fr auto 1fr;
  width: 100%;
  max-width: 500px;
  height: 60vh;
  max-height: 400px;
  gap: 8px;
}

.spread-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 12px;
  border-radius: 12px;
  transition: background 0.2s ease, transform 0.15s ease;
}

.spread-option:hover {
  background: rgba(255, 255, 255, 0.5);
  transform: scale(1.05);
}

/* Position spread options in grid corners */
.spread-option[data-spread="love"]     { grid-column: 1; grid-row: 1; }
.spread-option[data-spread="yesno"]    { grid-column: 3; grid-row: 1; }
.spread-option[data-spread="forecast"] { grid-column: 1; grid-row: 3; }
.spread-option[data-spread="growth"]   { grid-column: 3; grid-row: 3; }

#center-deck {
  grid-column: 2;
  grid-row: 2;
  width: var(--card-width);
  height: var(--card-height);
  border-radius: var(--card-radius);
  background-size: cover;
  background-position: center;
  box-shadow: var(--shadow);
}

.spread-suit {
  font-size: 2rem;
  line-height: 1;
}

.spread-suit.suit-pink { color: rgba(200, 80, 120, 0.8); }
.spread-suit.suit-green { color: rgba(70, 140, 90, 0.8); }

.spread-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #4a3f35;
  margin-top: 6px;
}

.spread-count {
  font-size: 0.75rem;
  color: #8a7a6a;
  margin-top: 2px;
}

/* ---- Reading title in controls ---- */
#reading-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #8a6070;
  letter-spacing: 1px;
  text-transform: uppercase;
}
```

- [ ] **Step 2: Verify spread picker renders**

Open `arcade/oracle/index.html` in browser. Expected: four spread options in corners around a center deck placeholder, warm cream background, correct suit colors.

- [ ] **Step 3: Commit**

```bash
git add arcade/oracle/oracle.css
git commit -m "feat(oracle): add CSS for spread picker and base layout"
```

---

### Task 3: Oracle CSS — Prompt, Shuffle, Spread Area, Flip Animation

**Files:**
- Modify: `arcade/oracle/oracle.css`

- [ ] **Step 1: Add prompt and shuffle styles**

Append to `oracle.css`:

```css
/* ---- Prompt area ---- */
#prompt-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex: 1;
}

#prompt-text {
  font-size: 1.1rem;
  color: #4a3f35;
  text-align: center;
  max-width: 320px;
  font-style: italic;
  line-height: 1.5;
}

#shuffle-deck {
  width: var(--card-width);
  height: var(--card-height);
  border-radius: var(--card-radius);
  background-size: cover;
  background-position: center;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.1s ease;
}

#shuffle-deck:active {
  transform: scale(0.95);
}

#shuffle-counter {
  font-size: 0.85rem;
  color: #8a7a6a;
  font-weight: 500;
}

/* ---- Shuffle wave animation ---- */
@keyframes shuffle-wave {
  0%   { transform: rotate(0deg) translateY(0); }
  25%  { transform: rotate(-3deg) translateY(-6px); }
  50%  { transform: rotate(2deg) translateY(-3px); }
  75%  { transform: rotate(-1deg) translateY(-1px); }
  100% { transform: rotate(0deg) translateY(0); }
}

#shuffle-deck.shuffling {
  animation: shuffle-wave 0.35s ease-out;
}

/* ---- Day picker (Forecast) ---- */
#day-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: center;
}

#day-picker p {
  font-size: 1rem;
  color: #4a3f35;
  font-style: italic;
}

#day-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

#day-buttons button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(70, 140, 90, 0.4);
  background: rgba(255, 255, 255, 0.5);
  color: #4a3f35;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

#day-buttons button:hover {
  background: rgba(70, 140, 90, 0.15);
  transform: scale(1.1);
}
```

- [ ] **Step 2: Add spread area and card flip styles**

Append to `oracle.css`:

```css
/* ---- Spread area ---- */
#spread-area {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: center;
  flex: 1;
  padding-top: 24px;
}

.oracle-card-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* ---- Card flip container ---- */
.oracle-card {
  width: var(--card-width);
  height: var(--card-height);
  perspective: 600px;
  cursor: default;
}

.oracle-card.tappable {
  cursor: pointer;
}

.oracle-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease;
  transform-style: preserve-3d;
}

.oracle-card.flipped .oracle-card-inner {
  transform: rotateY(180deg);
}

.oracle-card-front,
.oracle-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: var(--card-radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.oracle-card-back {
  background-size: cover;
  background-position: center;
}

.oracle-card-front {
  transform: rotateY(180deg);
}

.oracle-card-front img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--card-radius);
  display: block;
}

.oracle-card-front.suit-pink {
  border: 2.5px solid rgba(200, 80, 120, 0.5);
}

.oracle-card-front.suit-green {
  border: 2.5px solid rgba(70, 140, 90, 0.5);
}

/* ---- Card labels ---- */
.card-label {
  text-align: center;
}

.card-label .position-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #8a6070;
}

.card-label .card-name {
  font-size: 0.8rem;
  color: #4a3f35;
  margin-top: 2px;
}

.card-label .card-theme {
  font-size: 0.7rem;
  color: #a07090;
  font-style: italic;
  margin-top: 1px;
}

/* ---- Deal animation ---- */
@keyframes deal-in {
  0%   { opacity: 0; transform: scale(0.5) translateY(-40px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.oracle-card-slot.dealing {
  animation: deal-in 0.4s ease-out both;
}

/* ---- Answer display (Yes/No) ---- */
#answer-display {
  text-align: center;
  padding: 16px;
}

#answer-display .answer-text {
  font-size: 2rem;
  font-weight: 700;
  color: #4a3f35;
}

#answer-display .answer-detail {
  font-size: 0.9rem;
  color: #8a7a6a;
  margin-top: 4px;
}

/* ---- Complete area ---- */
#complete-area {
  padding: 20px;
  text-align: center;
}

/* ---- Sparkle canvas ---- */
#sparkle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}
```

- [ ] **Step 3: Verify in browser**

Expected: No CSS errors. Styles defined but most elements hidden. Spread picker still displays correctly.

- [ ] **Step 4: Commit**

```bash
git add arcade/oracle/oracle.css
git commit -m "feat(oracle): add CSS for prompt, shuffle, card flip, and sparkle canvas"
```

---

### Task 4: Oracle JS — Reading Definitions & State Machine Skeleton

**Files:**
- Create: `arcade/oracle/oracle.js`

- [ ] **Step 1: Write reading definitions and state constants**

```js
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
    cardCount: null, // user picks 1-7
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
```

- [ ] **Step 2: Add state transition function and section visibility helper**

Append to `oracle.js`:

```js
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
```

- [ ] **Step 3: Add initialization and spread picker click handlers**

Append to `oracle.js`:

```js
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
```

- [ ] **Step 4: Verify module loads without errors**

Open browser, check console. Expected: No errors. Spread picker visible with deck back image in center. Clicking a spread option should error on missing `showPrompt`/`showDayPicker` functions (expected — implemented next task).

- [ ] **Step 5: Commit**

```bash
git add arcade/oracle/oracle.js
git commit -m "feat(oracle): add reading definitions and state machine skeleton"
```

---

### Task 5: Oracle JS — Day Picker & Prompt Screen

**Files:**
- Modify: `arcade/oracle/oracle.js`

- [ ] **Step 1: Implement the forecast day picker**

Add before the `init()` function:

```js
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
```

- [ ] **Step 2: Implement the prompt/shuffle screen**

Add after `showDayPicker`:

```js
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
  void deckEl.offsetWidth; // reflow to restart animation
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
```

- [ ] **Step 3: Verify in browser**

Click Forecast → day picker shows 1-7 buttons. Click a number → prompt shows with deck and "Tap to shuffle" text. Click Love → prompt shows immediately. Tapping deck triggers shuffle animation and counter increments. After 7 taps, counter says "Ready!" (will error on missing `dealCards` — expected).

- [ ] **Step 4: Commit**

```bash
git add arcade/oracle/oracle.js
git commit -m "feat(oracle): add day picker and shuffle ritual"
```

---

### Task 6: Oracle JS — Deal & Reveal Cards

**Files:**
- Modify: `arcade/oracle/oracle.js`

- [ ] **Step 1: Implement card dealing**

Add after `handleShuffleTap`:

```js
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
```

- [ ] **Step 2: Implement card reveal**

Add after `dealCards`:

```js
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
```

- [ ] **Step 3: Implement Yes/No answer display**

Add after `revealCard`:

```js
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
```

- [ ] **Step 4: Implement complete state**

Add after `showYesNoAnswer`:

```js
function showComplete() {
  $('#complete-area').classList.remove('hidden');
}
```

- [ ] **Step 5: Verify full flow in browser**

Test Love reading: pick Love → prompt → 7 taps → 3 cards dealt face-down → tap each to reveal in order → position labels + card name/theme appear → New Reading button shows.

Test Yes/No: pick Yes/No → prompt → 7 taps → 1 card dealt → reveal it → second shuffle phase → 7 more taps → 2nd card dealt → reveal → answer displays.

Test Forecast: pick Forecast → day picker → choose 3 → prompt → 7 taps → 3 cards with day labels → reveal in order.

Test Growth: pick Growth → prompt → 7 taps → 3 cards (Trust/Delight/Excel) → reveal in order.

- [ ] **Step 6: Commit**

```bash
git add arcade/oracle/oracle.js
git commit -m "feat(oracle): implement deal, reveal, and Yes/No answer logic"
```

---

### Task 7: Oracle JS — Sparkle Canvas Engine

**Files:**
- Modify: `arcade/oracle/oracle.js`

- [ ] **Step 1: Implement the sparkle particle system**

Add at the end of `oracle.js`, before the `document.addEventListener('DOMContentLoaded', init)` line:

```js
// ---- Sparkle Engine ----
let sparkleCtx = null;
let sparkles = [];
let sparkleRAF = null;

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

  sparkleLoop();
}

function sparkleLoop() {
  if (!sparkleCtx) return;
  const { width, height } = sparkleCtx.canvas;
  sparkleCtx.clearRect(0, 0, width, height);

  // Ambient: add a new particle occasionally
  if (Math.random() < 0.3) {
    sparkles.push(createSparkle(
      Math.random() * width,
      Math.random() * height,
      false
    ));
  }

  // Update and draw
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life -= s.decay;
    if (s.life <= 0) {
      sparkles.splice(i, 1);
      continue;
    }
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.01; // slight gravity
    s.rotation += s.spin;

    const alpha = s.life;
    sparkleCtx.save();
    sparkleCtx.translate(s.x, s.y);
    sparkleCtx.rotate(s.rotation);
    sparkleCtx.globalAlpha = alpha;
    drawSparkleShape(sparkleCtx, s.size, s.color);
    sparkleCtx.restore();
  }

  sparkleRAF = requestAnimationFrame(sparkleLoop);
}

function createSparkle(x, y, isBurst) {
  const angle = Math.random() * Math.PI * 2;
  const speed = isBurst ? (1 + Math.random() * 3) : (0.1 + Math.random() * 0.3);
  const colors = ['#f5d0e0', '#ffeaa7', '#dfe6e9', '#fab1a0', '#e8daef', '#ffefd5'];
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - (isBurst ? 1 : 0),
    size: isBurst ? (2 + Math.random() * 4) : (1 + Math.random() * 2),
    life: 1,
    decay: isBurst ? (0.015 + Math.random() * 0.02) : (0.005 + Math.random() * 0.008),
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.1,
    color: colors[Math.floor(Math.random() * colors.length)]
  };
}

function drawSparkleShape(ctx, size, color) {
  ctx.fillStyle = color;
  // Four-pointed star
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const ax = Math.cos(a) * size;
    const ay = Math.sin(a) * size;
    const b = ((i + 0.5) / 4) * Math.PI * 2 - Math.PI / 2;
    const bx = Math.cos(b) * size * 0.35;
    const by = Math.sin(b) * size * 0.35;
    if (i === 0) ctx.moveTo(ax, ay);
    else ctx.lineTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fill();
}

function burstAt(clientX, clientY) {
  const canvas = $('#sparkle-canvas');
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  for (let i = 0; i < 20; i++) {
    sparkles.push(createSparkle(x, y, true));
  }
}
```

- [ ] **Step 2: Verify sparkle effects in browser**

Expected: Subtle ambient sparkles drift across the page. Tapping the shuffle deck triggers a burst. Flipping a card triggers a burst. Y2K glitter aesthetic — soft pastel colors, four-pointed stars.

- [ ] **Step 3: Commit**

```bash
git add arcade/oracle/oracle.js
git commit -m "feat(oracle): add Y2K sparkle canvas with ambient shimmer and burst effects"
```

---

### Task 8: Oracle CSS — Mobile & Landscape Responsive

**Files:**
- Modify: `arcade/oracle/oracle.css`

- [ ] **Step 1: Add responsive styles for mobile portrait-rotation and tablet**

Append to `oracle.css`:

```css
/* ---- Mobile (rotated landscape) ---- */
@media (max-width: 700px) and (orientation: portrait) {
  #spread-picker {
    max-width: 90%;
    height: 50vh;
  }

  .spread-suit { font-size: 1.5rem; }
  .spread-name { font-size: 0.8rem; }
  .spread-count { font-size: 0.65rem; }

  #prompt-text { font-size: 0.95rem; max-width: 260px; }

  #spread-area { gap: 10px; padding-top: 12px; }

  .card-label .position-name { font-size: 0.65rem; }
  .card-label .card-name { font-size: 0.7rem; }
  .card-label .card-theme { font-size: 0.6rem; }

  #answer-display .answer-text { font-size: 1.5rem; }
  #answer-display .answer-detail { font-size: 0.75rem; }
}

/* ---- Small phones: tighter card spacing ---- */
@media (max-width: 400px) {
  #spread-area { gap: 6px; }
}

/* ---- Tablet ---- */
@media (min-width: 701px) and (max-width: 1000px) {
  #spread-picker {
    max-width: 420px;
    height: 50vh;
  }
}
```

- [ ] **Step 2: Verify on mobile (or responsive dev tools)**

Resize browser to phone width, check portrait rotation triggers. Spread picker should fit, cards should be visible. Labels readable.

- [ ] **Step 3: Commit**

```bash
git add arcade/oracle/oracle.css
git commit -m "feat(oracle): add mobile and tablet responsive styles"
```

---

### Task 9: Update Arcade Landing Page

**Files:**
- Modify: `arcade/index.html`

- [ ] **Step 1: Add Oracle tile to the game grid**

In `arcade/index.html`, add a new tile after the Spider tile inside `<div class="game-grid">`:

```html
      <a href="oracle/" class="game-tile">
        <div class="icon">&#10022;</div>
        <div class="name">Oracle</div>
        <div class="desc">Card readings</div>
      </a>
```

The `&#10022;` is a four-pointed star character (✦).

- [ ] **Step 2: Verify landing page**

Open `arcade/index.html`. Expected: Three tiles — Solitaire, Spider, Oracle. Oracle tile shows star icon, "Oracle" name, "Card readings" description. Clicking goes to `/arcade/oracle/`.

- [ ] **Step 3: Commit**

```bash
git add arcade/index.html
git commit -m "feat(arcade): add Oracle tile to landing page"
```

---

### Task 10: Integration Testing & Polish

**Files:**
- Modify: `arcade/oracle/oracle.js` (if fixes needed)
- Modify: `arcade/oracle/oracle.css` (if fixes needed)

- [ ] **Step 1: Test all four reading types end-to-end**

Test each reading in the browser:

1. **Love**: Pick → prompt → 7 taps → 3 cards → reveal L-to-R → see "Your Feelings" / "Their Feelings" / "Outcome" + card name + theme → New Reading
2. **Yes/No**: Pick → prompt → 7 taps → 1 card dealt → reveal → 2nd shuffle (7 taps) → 2nd card dealt → reveal → answer text appears → New Reading
3. **Forecast**: Pick → day picker (choose 4) → prompt → 7 taps → 4 cards with day labels → reveal in order → New Reading
4. **Growth**: Pick → prompt → 7 taps → 3 cards → reveal Trust/Delight/Excel → New Reading

Verify for each:
- Shuffles actually randomize (different cards each time)
- Cards reveal in left-to-right order only
- Sparkle bursts on shuffle taps and card flips
- Ambient sparkles visible throughout
- Labels appear after reveal
- New Reading returns to spread picker cleanly

- [ ] **Step 2: Test mobile landscape**

Use browser dev tools responsive mode (375px width, portrait). Verify:
- Rotation works (arcade.css handles it)
- Spread picker fits in rotated view
- Cards fit without overflow
- Labels readable
- Sparkle canvas renders correctly in rotated container

- [ ] **Step 3: Test navigation**

- Landing page → Oracle tile → oracle page loads
- Oracle back link → returns to arcade landing
- New Reading after completion → returns to spread picker

- [ ] **Step 4: Fix any issues found**

Apply fixes as needed. Common issues to watch for:
- Card image paths: oracle is at `/arcade/oracle/`, cards.js paths use `../cards/` which resolves to `/arcade/cards/` — correct
- BACK_IMAGE: exported as `../cards/back.jpg` — correct from oracle directory
- Z-index: sparkle canvas should be above cards but pointer-events:none

- [ ] **Step 5: Final commit**

```bash
git add -A arcade/oracle/ arcade/index.html
git commit -m "feat(oracle): integration testing and polish"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-04-25-oracle-readings.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
