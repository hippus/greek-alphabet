// The ordering drill: one run of the 24 letters, tapped alpha to omega.
//
// Deliberately separate from the spaced-repetition flow — a run holds no
// scheduling state, is never persisted, and nothing here touches progress.

import { LETTERS } from './alphabet.js';
import { shuffle } from './rng.js';

const ORDER = LETTERS.map((l) => l.name);

/**
 * A fresh run: every letter once, in random order, nothing placed.
 * @param {() => number} rng
 * @returns {{tiles: typeof LETTERS, placed: number, mistakes: number}}
 */
export function newRun(rng) {
  return { tiles: shuffle(LETTERS, rng), placed: 0, mistakes: 0 };
}

/**
 * Tap a letter. Correct means it is the next one alphabetically; anything else
 * costs a mistake and places nothing. Letters already placed — and taps after
 * omega — are ignored rather than punished: the tiles are disabled by then, so
 * such a tap is a stray, not a guess.
 * @param {ReturnType<typeof newRun>} run
 * @param {string} name
 * @returns {{run: ReturnType<typeof newRun>, right: boolean}}
 */
export function tap(run, name) {
  if (run.placed === ORDER.length || ORDER.indexOf(name) < run.placed) {
    return { run, right: false };
  }
  const right = name === ORDER[run.placed];
  return {
    run: {
      ...run,
      placed: run.placed + (right ? 1 : 0),
      mistakes: run.mistakes + (right ? 0 : 1)
    },
    right
  };
}
