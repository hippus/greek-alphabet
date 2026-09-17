// Rendering and event wiring. No rules live here — every decision is made by
// game.js and its modules, which is why this file has no tests.

import { initialState, startSession, answerCard, makeCard, summary } from './game.js';
import { load, save } from './storage.js';
import { browserRng } from './rng.js';
import { itemById } from './items.js';
import { loadTheme, saveTheme, nextTheme } from './theme.js';
import { LETTERS } from './alphabet.js';
import { newRun, tap } from './order.js';

const FEEDBACK_MS = 700;
// Screens reached from the footer rather than from play: they overlay whatever
// you were doing and hand you back to it.
const OVERLAYS = new Set(['table', 'order']);

const el = (id) => document.getElementById(id);
const screens = {
  idle: el('screen-idle'),
  card: el('screen-card'),
  summary: el('screen-summary'),
  done: el('screen-done'),
  table: el('screen-table'),
  order: el('screen-order')
};

let state = load(window.localStorage) ?? initialState();
let queue = [];
let position = 0;
let card = null;
let tally = { right: 0, total: 0, missed: [] };
let theme = loadTheme(window.localStorage);
let returnTo = 'idle';
let run = null;

function persist() {
  save(window.localStorage, state);
}

function show(name) {
  for (const [key, node] of Object.entries(screens)) node.hidden = key !== name;
  if (!OVERLAYS.has(name)) returnTo = name;
  // Neither overlay is a hint: no consulting them with a card up.
  for (const id of ['alphabet', 'order']) el(id).hidden = name === 'card';
  document.body.classList.toggle('scrolling', OVERLAYS.has(name));
  paintProgress();
}

// The footer bar tracks the whole alphabet, not the round, so every screen
// shows it — which is why it is painted here rather than per screen.
function paintProgress() {
  const { retired, total, fraction } = summary(state);
  const percent = Math.round(fraction * 100);
  // A floor, so the first correct answer of a fresh alphabet still shows.
  el('progress-fill').style.width =
    fraction === 0 ? '0' : `max(3px, ${fraction * 100}%)`;
  const bar = el('progress-bar');
  bar.setAttribute('aria-valuenow', String(percent));
  bar.setAttribute('aria-valuetext', `${percent}% — ${retired} of ${total} letters mastered`);
}

function showIdle() {
  if (state.phase === 'done') return showDone();
  const { retired, total } = summary(state);
  el('play').textContent = state.phase === 'finalTest' ? 'Final test' : 'Play';
  el('idle-progress').textContent =
    state.phase === 'finalTest'
      ? 'Every letter learned — 15 at random to finish.'
      : `${retired} / ${total} letters mastered`;
  show('idle');
}

// Built once at startup: 24 static rows that no answer ever changes.
function buildTable() {
  const body = el('table-body');
  for (const { name, upper, lower } of LETTERS) {
    const row = document.createElement('tr');
    for (const [text, cls] of [[upper, 'letter'], [lower, 'letter'], [name, 'name']]) {
      const cell = document.createElement('td');
      cell.className = cls;
      cell.textContent = text;
      row.append(cell);
    }
    body.append(row);
  }
}

// The ordering drill. A run lives in memory only: nothing here is scheduled,
// scored against the alphabet, or written to storage.
function startOrder() {
  run = newRun(browserRng);
  const grid = el('tiles');
  grid.replaceChildren();
  for (const { name, upper, lower } of run.tiles) {
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.type = 'button';
    tile.append(upper, ' ', lower);
    tile.setAttribute('aria-label', name);
    tile.addEventListener('click', () => tapTile(tile, name));
    grid.append(tile);
  }
  paintOrder();
  show('order');
}

function tapTile(tile, name) {
  const step = tap(run, name);
  run = step.run;
  if (step.right) {
    tile.classList.add('placed');
    tile.disabled = true;
  } else {
    // Restarting the animation needs the class gone and a reflow between.
    tile.classList.remove('miss');
    void tile.offsetWidth;
    tile.classList.add('miss');
  }
  paintOrder();
}

function paintOrder() {
  const { placed, mistakes, tiles } = run;
  const slips = mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`;
  el('order-counter').textContent =
    placed === tiles.length
      ? `Α → Ω · ${mistakes === 0 ? 'no mistakes' : slips}`
      : `next: ${placed + 1} / ${tiles.length} · ${slips}`;
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
  if (queue.length === 0) return showIdle();
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
el('alphabet').addEventListener('click', () => show('table'));
el('table-back').addEventListener('click', () => show(returnTo));
el('order').addEventListener('click', startOrder);
el('order-again').addEventListener('click', startOrder);
el('order-back').addEventListener('click', () => show(returnTo));
el('reset').addEventListener('click', () => {
  if (!window.confirm('Erase all progress and start the alphabet again?')) return;
  state = initialState();
  persist();
  showIdle();
});

applyTheme();
buildTable();
showIdle();
