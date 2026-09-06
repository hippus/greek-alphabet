// The 48 trainable items: every letter in both cases is its own item with its
// own counter. Α and α share the name "alpha", which is why distractors are
// drawn from the pool of names rather than the pool of items.

import { LETTERS } from './alphabet.js';

/** @returns {{id: string, letter: string, name: string, glyph: string, case: 'upper'|'lower'}[]} */
export function buildItems() {
  return LETTERS.flatMap((l) => [
    { id: `${l.name}-upper`, letter: l.name, name: l.name, glyph: l.upper, case: 'upper' },
    { id: `${l.name}-lower`, letter: l.name, name: l.name, glyph: l.lower, case: 'lower' }
  ]);
}

export const ITEMS = buildItems();
export const ITEM_IDS = ITEMS.map((i) => i.id);
export const ALL_NAMES = LETTERS.map((l) => l.name);

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

/**
 * @param {string} id
 * @returns {object} the item
 * @throws if the id is unknown
 */
export function itemById(id) {
  const item = BY_ID.get(id);
  if (!item) throw new Error(`Unknown item id: ${id}`);
  return item;
}
