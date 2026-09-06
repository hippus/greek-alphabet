import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_KEY, DEFAULT_THEME, isTheme, nextTheme, loadTheme, saveTheme
} from '../src/theme.js';
import { STORAGE_KEY } from '../src/storage.js';

const fakeStorage = (seed = {}) => {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    _data: data
  };
};

const blockedStorage = () => ({
  getItem: () => { throw new Error('storage disabled'); },
  setItem: () => { throw new Error('storage disabled'); }
});

test('dark is the default when nothing has been stored', () => {
  assert.equal(DEFAULT_THEME, 'dark');
  assert.equal(loadTheme(fakeStorage()), 'dark');
});

test('the toggle flips between exactly two themes', () => {
  assert.equal(nextTheme('dark'), 'light');
  assert.equal(nextTheme('light'), 'dark');
});

test('a stored theme is remembered', () => {
  const storage = fakeStorage();
  assert.equal(saveTheme(storage, 'light'), true);
  assert.equal(loadTheme(storage), 'light');
});

test('a junk or unknown theme falls back to dark rather than breaking the page', () => {
  assert.equal(loadTheme(fakeStorage({ [THEME_KEY]: 'sepia' })), 'dark');
  assert.equal(loadTheme(fakeStorage({ [THEME_KEY]: '' })), 'dark');
  assert.equal(isTheme('sepia'), false);
  assert.equal(saveTheme(fakeStorage(), 'sepia'), false, 'junk is never written');
});

test('blocked storage degrades to the default instead of throwing', () => {
  assert.equal(loadTheme(blockedStorage()), 'dark');
  assert.equal(saveTheme(blockedStorage(), 'light'), false);
});

test('the theme lives in its own key, so resetting progress leaves it alone', () => {
  assert.notEqual(THEME_KEY, STORAGE_KEY);
  const storage = fakeStorage();
  saveTheme(storage, 'light');
  assert.deepEqual([...storage._data.keys()], [THEME_KEY]);
});
