// Session composition: which ten letters you see next.
//
// Letters are drawn without replacement, weighted so that (a) what you owe most
// comes up most, (b) letters you have missed come up twice as often, and
// (c) last round's letters are heavily outbid by fresh ones without ever being
// forbidden.

import { debt } from './progress.js';

export const SESSION_SIZE = 10;
export const ERROR_BOOST = 2;
export const REPEAT_DAMPING = 0.25;

/**
 * @param {import('./progress.js').Progress} progress
 * @param {string} id
 * @param {string[]} lastSessionIds
 * @returns {number} 0 for a retired item, which is therefore never drawn
 */
export function weightFor(progress, id, lastSessionIds) {
  const owed = debt(progress);
  if (owed <= 0) return 0;
  const missed = progress.errors > 0 ? ERROR_BOOST : 1;
  const repeated = lastSessionIds.includes(id) ? REPEAT_DAMPING : 1;
  return owed * missed * repeated;
}

/**
 * Draws `size` distinct ids, or every remaining id if fewer are left.
 * @param {Record<string, import('./progress.js').Progress>} progressMap
 * @param {string[]} lastSessionIds
 * @param {() => number} rng
 * @param {number} [size]
 * @returns {string[]}
 */
export function pickSession(progressMap, lastSessionIds, rng, size = SESSION_SIZE) {
  const pool = Object.entries(progressMap)
    .map(([id, progress]) => ({ id, weight: weightFor(progress, id, lastSessionIds) }))
    .filter((c) => c.weight > 0);

  const picked = [];
  while (picked.length < size && pool.length > 0) {
    const total = pool.reduce((sum, c) => sum + c.weight, 0);
    let threshold = rng() * total;
    let index = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      threshold -= pool[i].weight;
      if (threshold < 0) {
        index = i;
        break;
      }
    }
    picked.push(pool[index].id);
    pool.splice(index, 1);
  }
  return picked;
}
