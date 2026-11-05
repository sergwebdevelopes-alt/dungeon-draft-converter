import { useState } from 'react';
import { storage, type KeyValueStore } from '../storage/index.ts';
import { DEFAULT_THEME, oppositeOf, savedTheme, saveTheme } from './theme.ts';

function useTheme(store: KeyValueStore = storage) {
  const [theme, setTheme] = useState(() => savedTheme(store) ?? DEFAULT_THEME);

  function toggle() {
    const next = oppositeOf(theme);
    saveTheme(store, next);
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  return { theme, toggle };
}

export { useTheme };
