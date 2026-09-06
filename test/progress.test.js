import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_TARGET, MAX_TARGET, createProgress, createProgressMap,
  penaltyFor, debt, isRetired, applyAnswer, allRetired, retiredCount
} from '../src/progress.js';

test('a fresh item owes ten correct answers', () => {
  const p = createProgress();
  assert.deepEqual(p, { target: INITIAL_TARGET, correct: 0, errors: 0 });
  assert.equal(debt(p), 10);
  assert.equal(isRetired(p), false);
});

test('penalty boundaries follow the table', () => {
  assert.equal(penaltyFor(0), 3);
  assert.equal(penaltyFor(3), 3);
  assert.equal(penaltyFor(4), 2);
  assert.equal(penaltyFor(6), 2);
  assert.equal(penaltyFor(7), 1);
  assert.equal(penaltyFor(9), 1);
});

test('a correct answer advances the counter and leaves the target alone', () => {
  const p = applyAnswer({ target: 10, correct: 4, errors: 1 }, true);
  assert.deepEqual(p, { target: 10, correct: 5, errors: 1 });
});

test('applyAnswer does not mutate its input', () => {
  const before = { target: 10, correct: 4, errors: 0 };
  applyAnswer(before, false);
  assert.deepEqual(before, { target: 10, correct: 4, errors: 0 });
});

test('an error raises the target without touching the count', () => {
  const early = applyAnswer({ target: 10, correct: 2, errors: 0 }, false);
  assert.deepEqual(early, { target: 13, correct: 2, errors: 1 });

  const middle = applyAnswer({ target: 10, correct: 5, errors: 0 }, false);
  assert.deepEqual(middle, { target: 12, correct: 5, errors: 1 });

  const late = applyAnswer({ target: 10, correct: 7, errors: 0 }, false);
  assert.deepEqual(late, { target: 11, correct: 7, errors: 1 });
  assert.equal(debt(late), 4, 'a miss at 7/10 leaves four owing, not three');
});

test('the target is capped so a letter can never become unretirable', () => {
  let p = { target: 19, correct: 8, errors: 5 };
  p = applyAnswer(p, false);
  assert.equal(p.target, MAX_TARGET);
  p = applyAnswer(p, false);
  assert.equal(p.target, MAX_TARGET, 'already capped, so no further growth');
});

test('an item retires when the count reaches the target', () => {
  const p = applyAnswer({ target: 10, correct: 9, errors: 0 }, true);
  assert.equal(isRetired(p), true);
  assert.equal(debt(p), 0, 'debt never goes negative');
});

test('allRetired and retiredCount read a whole pool', () => {
  const map = createProgressMap(['a', 'b']);
  assert.equal(retiredCount(map), 0);
  assert.equal(allRetired(map), false);

  map.a = { target: 10, correct: 10, errors: 0 };
  assert.equal(retiredCount(map), 1);
  assert.equal(allRetired(map), false);

  map.b = { target: 12, correct: 12, errors: 1 };
  assert.equal(allRetired(map), true);
});
