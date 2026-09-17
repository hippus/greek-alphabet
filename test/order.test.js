import test from 'node:test';
import assert from 'node:assert/strict';
import { newRun, tap } from '../src/order.js';
import { LETTERS } from '../src/alphabet.js';
import { mulberry32 } from '../src/rng.js';

const names = (run) => run.tiles.map((t) => t.name);
const ORDER = LETTERS.map((l) => l.name);

test('a fresh run holds every letter once, in shuffled order', () => {
  const run = newRun(mulberry32(7));
  assert.equal(run.tiles.length, 24);
  assert.deepEqual([...names(run)].sort(), [...ORDER].sort());
  assert.notDeepEqual(names(run), ORDER);
});

test('a fresh run has nothing placed and no mistakes', () => {
  const run = newRun(mulberry32(7));
  assert.equal(run.placed, 0);
  assert.equal(run.mistakes, 0);
});

test('tiles carry both cases of the letter', () => {
  const run = newRun(mulberry32(7));
  const alpha = run.tiles.find((t) => t.name === 'alpha');
  assert.equal(alpha.upper, 'Α');
  assert.equal(alpha.lower, 'α');
});

test('tapping alpha first places it', () => {
  const { run, right } = tap(newRun(mulberry32(7)), 'alpha');
  assert.equal(right, true);
  assert.equal(run.placed, 1);
  assert.equal(run.mistakes, 0);
});

test('tapping out of turn counts a mistake and places nothing', () => {
  const { run, right } = tap(newRun(mulberry32(7)), 'delta');
  assert.equal(right, false);
  assert.equal(run.placed, 0);
  assert.equal(run.mistakes, 1);
});

test('a run is not mutated by a tap', () => {
  const before = newRun(mulberry32(7));
  tap(before, 'alpha');
  assert.equal(before.placed, 0);
});

test('tapping an already placed letter is ignored', () => {
  const started = tap(newRun(mulberry32(7)), 'alpha').run;
  const { run, right } = tap(started, 'alpha');
  assert.equal(right, false);
  assert.equal(run.placed, 1);
  assert.equal(run.mistakes, 0);
});

test('mistakes accumulate across taps', () => {
  let run = newRun(mulberry32(7));
  for (const name of ['omega', 'beta', 'alpha', 'gamma']) run = tap(run, name).run;
  assert.equal(run.placed, 1);
  assert.equal(run.mistakes, 3);
});

test('walking the alphabet in order finishes the run', () => {
  let run = newRun(mulberry32(7));
  for (const name of ORDER) {
    const step = tap(run, name);
    assert.equal(step.right, true, `${name} should have been accepted`);
    run = step.run;
  }
  assert.equal(run.placed, 24);
  assert.equal(run.mistakes, 0);
});

test('a finished run ignores further taps', () => {
  let run = newRun(mulberry32(7));
  for (const name of ORDER) run = tap(run, name).run;
  const { run: after, right } = tap(run, 'alpha');
  assert.equal(right, false);
  assert.equal(after.placed, 24);
  assert.equal(after.mistakes, 0);
});
