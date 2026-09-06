// Rendering and event wiring. No rules live here — every decision is made by
// game.js and its modules, which is why this file has no tests.

import { initialState, startSession, answerCard, makeCard, summary } from './game.js';
import { load, save } from './storage.js';
import { browserRng } from './rng.js';
import { itemById } from './items.js';
import { loadTheme, saveTheme, nextTheme } from './theme.js';

const FEEDBACK_MS = 700;

const el = (id) => document.getElementById(id);
const screens = {
  idle: el('screen-idle'),
  card: el('screen-card'),
  summary: el('screen-summary'),
  done: el('screen-done')
};

let state = load(window.localStorage) ?? initialState();
let queue = [];
let position = 0;
let card = null;
let tally = { right: 0, total: 0, missed: [] };
let theme = loadTheme(window.localStorage);

function persist() {
  save(window.localStorage, state);
}

function show(name) {
  for (const [key, node] of Object.entries(screens)) node.hidden = key !== name;
}

function showIdle() {
  if (state.phase === 'done') return showDone();
  const { retired, total } = summary(state);
  el('play').textContent = state.phase === 'finalTest' ? 'Final test' : 'Play';
  el('idle-progress').textContent =
    state.phase === 'finalTest'
      ? 'Every letter learned — 15 at random to finish.'
      : `${retired} / ${total} letters mastered`;
  el('progress-fill').style.width = `${(retired / total) * 100}%`;
  show('idle');
}

function showDone() {
  const { cards, errors, sessions } = state.stats;
  el('done-stats').textContent =
    `${cards} cards over ${sessions} rounds, ${errors} mistakes.`;
  show('done');
}

function showCard() {
  card = makeCard(queue[position], browserRng);
  el('card-counter').textContent =
    `${state.phase === 'finalTest' ? 'Final test' : 'Round'} · ${position + 1} / ${queue.length}`;
  el('glyph').textContent = card.glyph;

  const box = el('options');
  box.replaceChildren();
  for (const name of card.options) {
    const button = document.createElement('button');
    button.className = 'option';
    button.textContent = name;
    button.addEventListener('click', () => choose(button, name), { once: true });
    box.append(button);
  }
  show('card');
}

function choose(button, name) {
  const right = name === card.answer;
  const buttons = [...el('options').querySelectorAll('.option')];
  for (const b of buttons) b.disabled = true;

  button.classList.add(right ? 'right' : 'wrong');
  if (!right) {
    buttons.find((b) => b.textContent === card.answer)?.classList.add('right');
    tally.missed.push(card.id);
  }
  tally.total += 1;
  if (right) tally.right += 1;

  const phaseBefore = state.phase;
  state = answerCard(state, card.id, right, browserRng);
  persist();

  // Retiring the last letter flips the phase mid-session; the rest of the
  // dealt cards belong to a run that no longer exists, so the round ends here.
  const flipped = state.phase !== phaseBefore;
  setTimeout(() => {
    position += 1;
    if (flipped || position >= queue.length) return showSummary();
    showCard();
  }, FEEDBACK_MS);
}

function showSummary() {
  if (state.phase === 'done') return showDone();
  el('summary-score').textContent = `${tally.right} / ${tally.total}`;
  el('summary-missed').textContent = tally.missed.length
    ? `Missed: ${tally.missed.map((id) => `${itemById(id).glyph} ${itemById(id).name}`).join(', ')}`
    : 'No mistakes.';
  el('continue').textContent = state.phase === 'finalTest' ? 'Final test' : 'Next round';
  show('summary');
}

function play() {
  const started = startSession(state, browserRng);
  state = started.state;
  queue = started.cardIds;
  position = 0;
  tally = { right: 0, total: 0, missed: [] };
  persist();
  if (queue.length === 0) return applyTheme();
showIdle();
  showCard();
}

function applyTheme() {
  document.documentElement.dataset.theme = theme;
}

el('theme').addEventListener('click', () => {
  theme = nextTheme(theme);
  saveTheme(window.localStorage, theme);
  applyTheme();
});

el('play').addEventListener('click', play);
el('continue').addEventListener('click', play);
el('reset').addEventListener('click', () => {
  if (!window.confirm('Erase all progress and start the alphabet again?')) return;
  state = initialState();
  persist();
  applyTheme();
showIdle();
});

applyTheme();
showIdle();
