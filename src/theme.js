// Theme preference. Kept in its own storage key, deliberately apart from the
// game state: resetting your progress should not reset how the page looks, and
// a corrupt theme should never invalidate a save.

export const THEME_KEY = 'greek-alphabet-theme';
export const DEFAULT_THEME = 'dark';
export const THEMES = ['dark', 'light'];

/** @param {unknown} value */
export function isTheme(value) {
  return THEMES.includes(value);
}

/** @param {string} theme */
export function nextTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

/**
 * @param {{ getItem(k: string): string|null }} storage
 * @returns {'dark'|'light'} the stored theme, or dark for anything unreadable
 */
export function loadTheme(storage) {
  let raw;
  try {
    raw = storage.getItem(THEME_KEY);
  } catch {
    return DEFAULT_THEME;
  }
  return isTheme(raw) ? raw : DEFAULT_THEME;
}

/**
 * @param {{ setItem(k: string, v: string): void }} storage
 * @param {string} theme
 * @returns {boolean} false if the write was refused or the theme was unknown
 */
export function saveTheme(storage, theme) {
  if (!isTheme(theme)) return false;
  try {
    storage.setItem(THEME_KEY, theme);
    return true;
  } catch {
    return false;
  }
}
