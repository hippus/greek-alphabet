// The final test: one pass over all 48 letters in random order.
//
// A miss here is cheap compared with training — the letter owes three more
// correct answers, not a fresh ten — but it does cost you the clean sweep, and
// the whole test runs again once the debt is paid.

import { shuffle } from './rng.js';

export const FINAL_TEST_PENALTY = 3;

/** @typedef {{ queue: string[], index: number, missed: string[] }} FinalTest */

/**
 * @param {string[]} itemIds
 * @param {() => number} rng
 * @returns {FinalTest}
 */
export function buildFinalTest(itemIds, rng) {
  return { queue: shuffle(itemIds, rng), index: 0, missed: [] };
}

/** @param {FinalTest} finalTest */
export function isFinalTestComplete(finalTest) {
  return finalTest.index >= finalTest.queue.length;
}

/** @param {FinalTest} finalTest */
export function remainingCards(finalTest) {
  return finalTest.queue.slice(finalTest.index);
}

/**
 * Un-retires a letter missed in the final test.
 * @param {import('./progress.js').Progress} p
 * @returns {import('./progress.js').Progress}
 */
export function applyFinalMiss(p) {
  return { ...p, target: p.correct + FINAL_TEST_PENALTY, errors: p.errors + 1 };
}
