import test from 'node:test';
import assert from 'node:assert/strict';
import { OPTION_COUNT, pickOptions } from '../src/options.js';
import { ITEMS, ALL_NAMES, itemById } from '../src/items.js';
import { CONFUSIONS } from '../src/alphabet.js';
import { mulberry32 } from '../src/rng.js';

test('every card offers four distinct names including the answer', () => {
  for (const item of ITEMS) {
    for (let seed = 0; seed < 5; seed++) {
      const options = pickOptions(item, ALL_NAMES, mulberry32(seed));
      assert.equal(options.length, OPTION_COUNT);
      assert.equal(new Set(options).size, OPTION_COUNT, 'no duplicate names');
      assert.equal(options.filter((n) => n === item.name).length, 1);
      for (const n of options) assert.ok(ALL_NAMES.includes(n));
    }
  }
});

test('distractors come from the confusion set when it is large enough', () => {
  const item = itemById('theta-lower');
  const options = pickOptions(item, ALL_NAMES, mulberry32(11));
  const wrong = options.filter((n) => n !== item.name);
  for (const n of wrong) {
    assert.ok(CONFUSIONS.theta.includes(n), `${n} is not confusable with theta`);
  }
});

test('a short confusion set is topped up from the rest of the alphabet', () => {
  const item = itemById('kappa-upper');
  assert.equal(CONFUSIONS.kappa.length, 2, 'this test assumes a set of two');
  const wrong = pickOptions(item, ALL_NAMES, mulberry32(4)).filter((n) => n !== item.name);
  assert.equal(wrong.length, 3);
  for (const n of CONFUSIONS.kappa) {
    assert.ok(wrong.includes(n), 'confusables are used before random fill');
  }
});

test('the answer does not sit in the same slot every time', () => {
  const item = itemById('psi-lower');
  const slots = new Set();
  for (let seed = 0; seed < 40; seed++) {
    slots.add(pickOptions(item, ALL_NAMES, mulberry32(seed)).indexOf(item.name));
  }
  assert.ok(slots.size > 1, 'options must be shuffled');
});
