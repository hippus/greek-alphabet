// Per-item progress rules: how a letter advances toward retirement, and how a
// mistake sets it back.
//
// A letter is retired once `correct` reaches `target`. A mistake never rewinds
// `correct`; it raises `target`, so the letter simply owes more.

export const INITIAL_TARGET = 10;
export const MAX_TARGET = 20;

/** @typedef {{ target: number, correct: number, errors: number }} Progress */

/** @returns {Progress} */
export function createProgress(target = INITIAL_TARGET) {
  return { target, correct: 0, errors: 0 };
}

/**
 * @param {string[]} ids
 * @returns {Record<string, Progress>}
 */
export function createProgressMap(ids) {
  return Object.fromEntries(ids.map((id) => [id, createProgress()]));
}

/**
 * Extra rounds owed for a mistake, keyed to how far along the letter was.
 * Missing something you have almost learned costs less than missing something
 * you have barely started.
 * @param {number} correct answers banked at the moment of the error
 */
export function penaltyFor(correct) {
  if (correct <= 3) return 3;
  if (correct <= 6) return 2;
  return 1;
}

/** @param {Progress} p */
export function debt(p) {
  return Math.max(0, p.target - p.correct);
}

/** @param {Progress} p */
export function isRetired(p) {
  return p.correct >= p.target;
}

/**
 * @param {Progress} p
 * @param {boolean} isCorrect
 * @returns {Progress} a new object; the input is left alone
 */
export function applyAnswer(p, isCorrect) {
  if (isCorrect) return { ...p, correct: p.correct + 1 };
  return {
    ...p,
    target: Math.min(p.target + penaltyFor(p.correct), MAX_TARGET),
    errors: p.errors + 1
  };
}

/** @param {Record<string, Progress>} map */
export function retiredCount(map) {
  return Object.values(map).filter(isRetired).length;
}

/** @param {Record<string, Progress>} map */
export function allRetired(map) {
  return Object.values(map).every(isRetired);
}

/**
 * How far the whole pool has come, as 0..1.
 *
 * Counts banked answers against answers owed rather than retired items:
 * retirement is a step function that stays flat for a hundred cards, which
 * makes it useless as a "how far am I" signal. A mistake raises the target,
 * so this can slip backwards — that is the honest reading. Individual counts
 * are clamped because the final test can raise a target after the fact.
 * @param {Record<string, Progress>} map
 */
export function masteryFraction(map) {
  let banked = 0;
  let owed = 0;
  for (const p of Object.values(map)) {
    banked += Math.min(p.correct, p.target);
    owed += p.target;
  }
  return owed === 0 ? 0 : banked / owed;
}
