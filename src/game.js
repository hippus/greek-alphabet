// The state machine. Every function here takes a state and returns a new one;
// nothing is mutated, and randomness always arrives as an argument.
//
// Persisted `phase` has three values — training, finalTest, done — because that
// is all that must survive a reload. Idle, session and summary are transient
// screens inside `training`, handled by the UI.

import { ITEM_IDS, ALL_NAMES, itemById } from './items.js';
import { createProgressMap, applyAnswer, allRetired, retiredCount } from './progress.js';
import { pickSession } from './scheduler.js';
import { pickOptions } from './options.js';
import {
  buildFinalTest, isFinalTestComplete, remainingCards, applyFinalMiss
} from './finalTest.js';

export const STATE_VERSION = 1;

/** @returns {object} a fresh game */
export function initialState() {
  return {
    version: STATE_VERSION,
    phase: 'training',
    items: createProgressMap(ITEM_IDS),
    lastSessionIds: [],
    finalTest: null,
    stats: { sessions: 0, cards: 0, errors: 0 }
  };
}

/**
 * What to render for one card.
 * @param {string} itemId
 * @param {() => number} rng
 */
export function makeCard(itemId, rng) {
  const item = itemById(itemId);
  return {
    id: item.id,
    glyph: item.glyph,
    answer: item.name,
    options: pickOptions(item, ALL_NAMES, rng)
  };
}

/**
 * Opens the next run of cards. In training that is a fresh weighted draw; in
 * the final test it is whatever is left of the queue, so a reload resumes
 * rather than restarts.
 * @returns {{ state: object, cardIds: string[] }}
 */
export function startSession(state, rng) {
  if (state.phase === 'done') return { state, cardIds: [] };

  const stats = { ...state.stats, sessions: state.stats.sessions + 1 };

  if (state.phase === 'finalTest') {
    return { state: { ...state, stats }, cardIds: remainingCards(state.finalTest) };
  }

  const cardIds = pickSession(state.items, state.lastSessionIds, rng);
  return { state: { ...state, lastSessionIds: cardIds, stats }, cardIds };
}

/**
 * Records one answer and moves the machine along.
 * @param {object} state
 * @param {string} itemId
 * @param {boolean} isCorrect
 * @param {() => number} rng used only when a final test has to be built
 */
export function answerCard(state, itemId, isCorrect, rng) {
  if (state.phase === 'done') {
    throw new Error('The alphabet is done; there is nothing left to answer.');
  }
  const stats = {
    ...state.stats,
    cards: state.stats.cards + 1,
    errors: state.stats.errors + (isCorrect ? 0 : 1)
  };
  return state.phase === 'finalTest'
    ? answerFinalCard(state, itemId, isCorrect, stats)
    : answerTrainingCard(state, itemId, isCorrect, stats, rng);
}

function answerTrainingCard(state, itemId, isCorrect, stats, rng) {
  const items = { ...state.items, [itemId]: applyAnswer(state.items[itemId], isCorrect) };
  const next = { ...state, items, stats };

  if (allRetired(items)) {
    return { ...next, phase: 'finalTest', finalTest: buildFinalTest(ITEM_IDS, rng) };
  }
  return next;
}

function answerFinalCard(state, itemId, isCorrect, stats) {
  const { queue, index, missed } = state.finalTest;
  if (queue[index] !== itemId) {
    throw new Error(`Final test card answered out of order: expected ${queue[index]}, got ${itemId}`);
  }

  const items = isCorrect
    ? state.items
    : { ...state.items, [itemId]: applyFinalMiss(state.items[itemId]) };
  const finalTest = {
    queue,
    index: index + 1,
    missed: isCorrect ? missed : [...missed, itemId]
  };

  if (!isFinalTestComplete(finalTest)) {
    return { ...state, items, finalTest, stats };
  }

  // A clean sweep finishes the alphabet; anything missed sends you back to
  // training, and the whole 48-card test runs again once the debt is paid.
  return finalTest.missed.length === 0
    ? { ...state, items, stats, phase: 'done', finalTest: null }
    : { ...state, items, stats, phase: 'training', finalTest: null, lastSessionIds: [] };
}

/** Progress for the idle screen. */
export function summary(state) {
  return {
    retired: retiredCount(state.items),
    total: Object.keys(state.items).length,
    phase: state.phase
  };
}
