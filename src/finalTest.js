// The final test: 15 letters drawn at random from the alphabet, in random
// order. A fresh sample is drawn every time the test is taken, so passing it
// twice does not mean passing the same fifteen twice.
//
// A miss here is cheap compared with training — the letter owes three more
// correct answers, not a fresh ten — but it does cost you the clean pass, and
// a newly sampled test runs again once the debt is paid.

import { shuffle } from './rng.js';

export const FINAL_TEST_PENALTY = 3;
export const FINAL_TEST_SIZE = 15;

/** @typedef {{ queue: string[], index: number, missed: string[] }} FinalTest */

/**
 * @param {string[]} itemIds
 * @param {() => number} rng
 * @param {number} [size]
 * @returns {FinalTest}
 */
export function buildFinalTest(itemIds, rng, size = FINAL_TEST_SIZE) {
  return { queue: shuffle(itemIds, rng).slice(0, Math.min(size, itemIds.length)), index: 0, missed: [] };
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
