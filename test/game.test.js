import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, startSession, answerCard, makeCard, summary } from '../src/game.js';
import {
  FINAL_TEST_PENALTY, FINAL_TEST_SIZE, buildFinalTest, isFinalTestComplete
} from '../src/finalTest.js';
import { ITEM_IDS, ALL_NAMES } from '../src/items.js';
import { isRetired } from '../src/progress.js';
import { mulberry32 } from '../src/rng.js';

const rng = () => mulberry32(42);

/**
 * Answers the current session correctly, stopping early if the last letter
 * retires mid-session and flips the phase — which is what the UI must do too.
 */
const playPerfectSession = (state) => {
  const started = startSession(state, rng());
  let next = started.state;
  for (const id of started.cardIds) {
    next = answerCard(next, id, true, rng());
    if (next.phase !== 'training') break;
  }
  return next;
};

/** Trains until every letter has retired and the final test has begun. */
const trainToFinalTest = () => {
  let state = initialState();
  for (let guard = 0; guard < 200 && state.phase === 'training'; guard++) {
    state = playPerfectSession(state);
  }
  assert.equal(state.phase, 'finalTest', 'training should end in the final test');
  return state;
};

test('a new game starts in training with 48 untouched letters', () => {
  const state = initialState();
  assert.equal(state.phase, 'training');
  assert.equal(Object.keys(state.items).length, 48);
  assert.equal(state.finalTest, null);
  assert.deepEqual(state.lastSessionIds, []);
  assert.deepEqual(summary(state), { retired: 0, total: 48, fraction: 0, phase: 'training' });
});

test('starting a session records what was shown, so the next round differs', () => {
  const { state, cardIds } = startSession(initialState(), rng());
  assert.equal(cardIds.length, 10);
  assert.deepEqual(state.lastSessionIds, cardIds);
  assert.equal(state.stats.sessions, 1);
});

test('a card carries one glyph and four options containing its answer', () => {
  const card = makeCard('theta-lower', rng());
  assert.equal(card.glyph, 'θ');
  assert.equal(card.answer, 'theta');
  assert.equal(card.options.length, 4);
  assert.ok(card.options.includes('theta'));
  for (const n of card.options) assert.ok(ALL_NAMES.includes(n));
});

test('answering advances the letter and the running stats', () => {
  let state = initialState();
  state = answerCard(state, 'alpha-upper', true, rng());
  assert.equal(state.items['alpha-upper'].correct, 1);
  assert.deepEqual(state.stats, { sessions: 0, cards: 1, errors: 0 });

  state = answerCard(state, 'alpha-upper', false, rng());
  assert.equal(state.items['alpha-upper'].correct, 1, 'a miss does not rewind');
  assert.equal(state.items['alpha-upper'].target, 13);
  assert.deepEqual(state.stats, { sessions: 0, cards: 2, errors: 1 });
});

test('answering does not mutate the state it was given', () => {
  const before = initialState();
  answerCard(before, 'alpha-upper', true, rng());
  assert.equal(before.items['alpha-upper'].correct, 0);
});

test('retiring the last letter opens a 15-letter final test', () => {
  const state = trainToFinalTest();
  assert.equal(state.finalTest.index, 0);
  assert.deepEqual(state.finalTest.missed, []);
  assert.equal(state.finalTest.queue.length, FINAL_TEST_SIZE);
  assert.equal(new Set(state.finalTest.queue).size, FINAL_TEST_SIZE);
  for (const id of state.finalTest.queue) assert.ok(ITEM_IDS.includes(id));
});

test('the phase can flip mid-session, and stale training cards are then refused', () => {
  // One letter left, owing one answer, but a session was dealt before that.
  let state = initialState();
  for (const id of ITEM_IDS) state.items[id] = { target: 10, correct: 10, errors: 0 };
  state.items['omega-lower'] = { target: 10, correct: 9, errors: 0 };

  state = answerCard(state, 'omega-lower', true, rng());
  assert.equal(state.phase, 'finalTest', 'the alphabet is finished');

  const stale = state.finalTest.queue.find((id) => id !== state.finalTest.queue[0]);
  assert.throws(() => answerCard(state, stale, true, rng()), /out of order/,
    'a leftover card from the training session must not be silently counted');
});

test('the final test is a fresh sample of 15 distinct letters each time', () => {
  const a = buildFinalTest(ITEM_IDS, mulberry32(1));
  const b = buildFinalTest(ITEM_IDS, mulberry32(2));
  assert.equal(a.queue.length, FINAL_TEST_SIZE);
  assert.equal(new Set(a.queue).size, FINAL_TEST_SIZE, 'no letter is asked twice');
  for (const id of a.queue) assert.ok(ITEM_IDS.includes(id));
  assert.notDeepEqual(a.queue, b.queue, 'a different draw gives a different test');
  assert.equal(isFinalTestComplete(a), false);
  assert.equal(isFinalTestComplete({ ...a, index: FINAL_TEST_SIZE }), true);
});

test('the sample covers both cases and is not stuck on one slice of the alphabet', () => {
  const seen = new Set();
  for (let seed = 0; seed < 30; seed++) {
    for (const id of buildFinalTest(ITEM_IDS, mulberry32(seed)).queue) seen.add(id);
  }
  assert.equal(seen.size, ITEM_IDS.length, 'every letter is reachable');
});

test('a clean pass through the final test reaches done', () => {
  let state = trainToFinalTest();
  const { state: started, cardIds } = startSession(state, rng());
  state = started;
  assert.equal(cardIds.length, FINAL_TEST_SIZE);
  for (const id of cardIds) state = answerCard(state, id, true, rng());
  assert.equal(state.phase, 'done');
  assert.equal(state.finalTest, null);
  assert.deepEqual(summary(state), { retired: 48, total: 48, fraction: 1, phase: 'done' });
});

test('a missed letter in the final test owes three rounds, not ten', () => {
  let state = trainToFinalTest();
  const victim = state.finalTest.queue[0];
  const bankedBefore = state.items[victim].correct;
  state = answerCard(state, victim, false, rng());
  assert.equal(state.items[victim].target, bankedBefore + FINAL_TEST_PENALTY);
  assert.equal(isRetired(state.items[victim]), false);
  assert.deepEqual(state.finalTest.missed, [victim]);
  assert.equal(state.finalTest.index, 1, 'the test carries on past the miss');
});

test('a failed final test returns to training with only the missed letters live', () => {
  let state = trainToFinalTest();
  const queue = state.finalTest.queue;
  const missed = [queue[3], queue[10]];
  for (const id of queue) state = answerCard(state, id, !missed.includes(id), rng());

  assert.equal(state.phase, 'training');
  assert.equal(state.finalTest, null);
  const live = Object.keys(state.items).filter((id) => !isRetired(state.items[id]));
  assert.deepEqual(live.slice().sort(), missed.slice().sort());
});

test('paying off the missed letters brings on a freshly sampled test, then done', () => {
  let state = trainToFinalTest();
  const queue = state.finalTest.queue;
  const victim = queue[5];
  for (const id of queue) state = answerCard(state, id, id !== victim, rng());
  assert.equal(state.phase, 'training');

  for (let guard = 0; guard < 50 && state.phase === 'training'; guard++) {
    state = playPerfectSession(state);
  }
  assert.equal(state.phase, 'finalTest');
  assert.equal(state.finalTest.queue.length, FINAL_TEST_SIZE);

  const retest = startSession(state, rng());
  state = retest.state;
  for (const id of retest.cardIds) state = answerCard(state, id, true, rng());
  assert.equal(state.phase, 'done');
});

test('a session in the middle of a final test resumes where it stopped', () => {
  let state = trainToFinalTest();
  const queue = state.finalTest.queue;
  for (const id of queue.slice(0, 5)) state = answerCard(state, id, true, rng());
  const { cardIds } = startSession(state, rng());
  assert.deepEqual(cardIds, queue.slice(5));
});

test('the final test rejects a card answered out of order', () => {
  const state = trainToFinalTest();
  const notNext = state.finalTest.queue[7];
  assert.throws(() => answerCard(state, notNext, true, rng()), /out of order/);
});

test('answering after done is refused', () => {
  let state = trainToFinalTest();
  for (const id of state.finalTest.queue) state = answerCard(state, id, true, rng());
  assert.throws(() => answerCard(state, 'alpha-upper', true, rng()), /done/);
});
