import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, ITEM_IDS, ALL_NAMES, itemById } from '../src/items.js';
import { CONFUSIONS, LETTERS } from '../src/alphabet.js';

test('there are 48 items, one per letter per case', () => {
  assert.equal(ITEMS.length, 48);
  assert.equal(new Set(ITEM_IDS).size, 48);
  assert.equal(ITEMS.filter((i) => i.case === 'upper').length, 24);
  assert.equal(ITEMS.filter((i) => i.case === 'lower').length, 24);
});

test('every glyph is distinct and final sigma is absent', () => {
  const glyphs = ITEMS.map((i) => i.glyph);
  assert.equal(new Set(glyphs).size, 48);
  assert.ok(!glyphs.includes('ς'));
});

test('the two cases of a letter share a name', () => {
  assert.equal(itemById('alpha-upper').name, itemById('alpha-lower').name);
  assert.equal(ALL_NAMES.length, 24);
  assert.equal(new Set(ALL_NAMES).size, 24);
});

test('itemById rejects an unknown id', () => {
  assert.throws(() => itemById('sampi-lower'), /Unknown item id/);
});

test('the confusion table covers every letter and names only real letters', () => {
  for (const { name } of LETTERS) {
    const set = CONFUSIONS[name];
    assert.ok(Array.isArray(set) && set.length >= 2, `${name} needs confusables`);
    assert.ok(!set.includes(name), `${name} cannot confuse itself`);
    for (const other of set) assert.ok(ALL_NAMES.includes(other), `${other} is not a letter`);
  }
});
