import type { KeyValueStore } from '../storage/index.ts';

type Theme = 'light' | 'dark';

const THEME_KEY = 'lair-of-artificer:theme';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function savedTheme(store: KeyValueStore): Theme | null {
  const value = store.read(THEME_KEY);

  return isTheme(value) ? value : null;
}

function saveTheme(store: KeyValueStore, theme: Theme): void {
  store.write(THEME_KEY, theme);
}

function oppositeOf(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

export { THEME_KEY, oppositeOf, savedTheme, saveTheme };
export type { Theme };
