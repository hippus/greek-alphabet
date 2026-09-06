// Persistence. A single namespaced key holding a versioned document.
//
// Anything that fails validation is discarded rather than half-loaded: a
// corrupt save costs you your progress, but a silently half-applied one would
// cost you your trust in the counters.

import { ITEM_IDS } from './items.js';
import { FINAL_TEST_SIZE } from './finalTest.js';

export const STORAGE_KEY = 'greek-alphabet-progress';
export const STATE_VERSION = 1;

const PHASES = new Set(['training', 'finalTest', 'done']);

const isCount = (n) => typeof n === 'number' && Number.isInteger(n) && n >= 0;
const isIdList = (v) => Array.isArray(v) && v.every((id) => ITEM_IDS.includes(id));

function isValidProgress(p) {
  return (
    p !== null && typeof p === 'object' &&
    isCount(p.target) && isCount(p.correct) && isCount(p.errors)
  );
}

function isValidFinalTest(ft) {
  if (ft === null) return true;
  return (
    typeof ft === 'object' &&
    Array.isArray(ft.queue) &&
    ft.queue.length === Math.min(FINAL_TEST_SIZE, ITEM_IDS.length) &&
    new Set(ft.queue).size === ft.queue.length &&
    isIdList(ft.queue) &&
    isCount(ft.index) && ft.index <= ft.queue.length &&
    isIdList(ft.missed)
  );
}

/** @param {unknown} state */
export function isValidState(state) {
  if (state === null || typeof state !== 'object' || Array.isArray(state)) return false;
  if (state.version !== STATE_VERSION) return false;
  if (!PHASES.has(state.phase)) return false;
  if (state.items === null || typeof state.items !== 'object') return false;

  const ids = Object.keys(state.items);
  if (ids.length !== ITEM_IDS.length) return false;
  for (const id of ITEM_IDS) {
    if (!isValidProgress(state.items[id])) return false;
  }

  if (!isIdList(state.lastSessionIds)) return false;
  if (!isValidFinalTest(state.finalTest)) return false;
  if (state.phase === 'finalTest' && state.finalTest === null) return false;

  const s = state.stats;
  if (s === null || typeof s !== 'object') return false;
  return isCount(s.sessions) && isCount(s.cards) && isCount(s.errors);
}

export function serialize(state) {
  return JSON.stringify(state);
}

/**
 * @param {string} json
 * @returns {object|null} null if the payload is corrupt, foreign or of an
 *   unrecognised schema version
 */
export function deserialize(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  return isValidState(parsed) ? parsed : null;
}

/**
 * @param {{ getItem(k: string): string|null }} storage
 * @returns {object|null}
 */
export function load(storage) {
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage disabled (private mode, blocked cookies)
  }
  return raw === null || raw === undefined ? null : deserialize(raw);
}

/**
 * @param {{ setItem(k: string, v: string): void }} storage
 * @param {object} state
 * @returns {boolean} false if the write was refused
 */
export function save(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}
