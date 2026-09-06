import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, STATE_VERSION, serialize, deserialize, isValidState, load, save
} from '../src/storage.js';
import { initialState } from '../src/game.js';
import { buildFinalTest } from '../src/finalTest.js';
import { ITEM_IDS } from '../src/items.js';
import { mulberry32 } from '../src/rng.js';

const fakeStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    _data: data
  };
};

test('a full state document round-trips', () => {
  const state = initialState();
  state.items['theta-lower'] = { target: 13, correct: 4, errors: 1 };
  state.lastSessionIds = ['theta-lower', 'psi-upper'];
  state.stats = { sessions: 3, cards: 30, errors: 2 };
  assert.deepEqual(deserialize(serialize(state)), state);
});

test('a mid-final-test document round-trips', () => {
  const state = initialState();
  state.phase = 'finalTest';
  state.finalTest = buildFinalTest(ITEM_IDS, mulberry32(9));
  state.finalTest.index = 12;
  state.finalTest.missed = [state.finalTest.queue[3]];
  assert.deepEqual(deserialize(serialize(state)), state);
});

test('a final test whose queue is not the whole alphabet is rejected', () => {
  const state = initialState();
  state.phase = 'finalTest';
  state.finalTest = { queue: ['alpha-upper', 'beta-lower'], index: 1, missed: ['alpha-upper'] };
  assert.equal(isValidState(state), false);
});

test('the finalTest phase cannot be stored without a final test', () => {
  const state = initialState();
  state.phase = 'finalTest';
  assert.equal(isValidState(state), false);
});

test('corrupt or foreign payloads are rejected rather than half-loaded', () => {
  assert.equal(deserialize('not json at all'), null);
  assert.equal(deserialize('null'), null);
  assert.equal(deserialize('[1,2,3]'), null);
  assert.equal(deserialize(JSON.stringify({ hello: 'world' })), null);
});

test('a state from an unknown schema version is rejected', () => {
  const state = { ...initialState(), version: STATE_VERSION + 1 };
  assert.equal(deserialize(JSON.stringify(state)), null);
});

test('a state missing letters is rejected', () => {
  const state = initialState();
  delete state.items['omega-lower'];
  assert.equal(isValidState(state), false);
});

test('a state with a nonsense phase or counter is rejected', () => {
  const bad = initialState();
  bad.phase = 'partying';
  assert.equal(isValidState(bad), false);

  const worse = initialState();
  worse.items['alpha-upper'] = { target: 10, correct: 'three', errors: 0 };
  assert.equal(isValidState(worse), false);
});

test('save and load use one namespaced key', () => {
  const storage = fakeStorage();
  const state = initialState();
  state.stats.cards = 7;
  save(storage, state);
  assert.deepEqual([...storage._data.keys()], [STORAGE_KEY]);
  assert.deepEqual(load(storage), state);
});

test('load returns null on an empty or corrupt store', () => {
  const storage = fakeStorage();
  assert.equal(load(storage), null);
  storage.setItem(STORAGE_KEY, '{oops');
  assert.equal(load(storage), null);
});
