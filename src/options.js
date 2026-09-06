// Distractor selection.
//
// Wrong options are drawn from the pool of letter *names*, never from the pool
// of items: Α and α are two items sharing the name "alpha", so drawing by item
// could offer the same answer twice. Confusables are used first, so a card
// tests a discrimination that actually fails.

import { CONFUSIONS } from './alphabet.js';
import { shuffle } from './rng.js';

export const OPTION_COUNT = 4;

/**
 * @param {{ name: string, letter: string }} item
 * @param {string[]} allNames every letter name in the alphabet
 * @param {() => number} rng
 * @param {number} [count] total options including the correct one
 * @returns {string[]} shuffled option labels
 */
export function pickOptions(item, allNames, rng, count = OPTION_COUNT) {
  const wanted = count - 1;
  const confusables = (CONFUSIONS[item.letter] ?? []).filter(
    (n) => n !== item.name && allNames.includes(n)
  );

  const wrong = shuffle(confusables, rng).slice(0, wanted);

  if (wrong.length < wanted) {
    const rest = allNames.filter((n) => n !== item.name && !wrong.includes(n));
    wrong.push(...shuffle(rest, rng).slice(0, wanted - wrong.length));
  }

  return shuffle([item.name, ...wrong], rng);
}
