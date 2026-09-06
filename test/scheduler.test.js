import test from 'node:test';
import assert from 'node:assert/strict';
import { SESSION_SIZE, weightFor, pickSession } from '../src/scheduler.js';
import { createProgressMap } from '../src/progress.js';
import { ITEM_IDS } from '../src/items.js';
import { mulberry32 } from '../src/rng.js';

const fresh = () => createProgressMap(ITEM_IDS);
const retireAll = (map, ids) => {
  for (const id of ids) map[id] = { target: 10, correct: 10, errors: 0 };
  return map;
};

test('weight is debt, doubled after an error, quartered if seen last round', () => {
  const p = { target: 10, correct: 4, errors: 0 };
  assert.equal(weightFor(p, 'x', []), 6);
  assert.equal(weightFor({ ...p, errors: 2 }, 'x', []), 12);
  assert.equal(weightFor(p, 'x', ['x']), 1.5);
  assert.equal(weightFor({ ...p, errors: 1 }, 'x', ['x']), 3);
});

test('a retired item has zero weight', () => {
  assert.equal(weightFor({ target: 10, correct: 10, errors: 3 }, 'x', []), 0);
});

test('a session is ten distinct ids', () => {
  const ids = pickSession(fresh(), [], mulberry32(1));
  assert.equal(ids.length, SESSION_SIZE);
  assert.equal(new Set(ids).size, SESSION_SIZE);
  for (const id of ids) assert.ok(ITEM_IDS.includes(id));
});

test('retired items are never drawn', () => {
  const map = retireAll(fresh(), ITEM_IDS.slice(0, 40));
  const active = ITEM_IDS.slice(40);
  for (let seed = 0; seed < 20; seed++) {
    for (const id of pickSession(map, [], mulberry32(seed))) {
      assert.ok(active.includes(id), `${id} is retired and must not appear`);
    }
  }
});

test('the session shrinks when fewer than ten items remain', () => {
  const map = retireAll(fresh(), ITEM_IDS.slice(0, 44));
  const ids = pickSession(map, [], mulberry32(7));
  assert.equal(ids.length, 4);
  assert.deepEqual(ids.slice().sort(), ITEM_IDS.slice(44).slice().sort());
});

test('an exhausted pool yields an empty session', () => {
  const map = retireAll(fresh(), ITEM_IDS);
  assert.deepEqual(pickSession(map, [], mulberry32(3)), []);
});

const rate = (map, lastSessionIds, watched, runs = 400) => {
  let hits = 0;
  for (let seed = 0; seed < runs; seed++) {
    if (pickSession(map, lastSessionIds, mulberry32(seed)).includes(watched)) hits++;
  }
  return hits / runs;
};

test('a letter in debt is drawn more often than a nearly finished one', () => {
  const map = fresh();
  map['alpha-upper'] = { target: 10, correct: 9, errors: 0 };
  map['beta-upper'] = { target: 10, correct: 0, errors: 0 };
  assert.ok(rate(map, [], 'beta-upper') > rate(map, [], 'alpha-upper'));
});

test('a letter that has been missed comes back more often', () => {
  const map = fresh();
  map['gamma-upper'] = { target: 12, correct: 2, errors: 1 };
  map['delta-upper'] = { target: 10, correct: 0, errors: 0 };
  assert.ok(rate(map, [], 'gamma-upper') > rate(map, [], 'delta-upper'));
});

test('letters from last round are outbid but not banned', () => {
  const map = fresh();
  const last = ITEM_IDS.slice(0, 10);
  const repeat = rate(map, last, last[0]);
  const other = rate(map, last, ITEM_IDS[20]);
  assert.ok(repeat < other, 'a repeat must be less likely than a fresh letter');
  assert.ok(repeat > 0, 'but it must still be possible');
});
