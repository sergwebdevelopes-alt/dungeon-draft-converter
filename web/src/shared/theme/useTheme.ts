import { useEffect, useState } from 'react';
import { storage, type KeyValueStore } from '../storage/index.ts';
import { oppositeOf, savedTheme, saveTheme, type Theme } from './theme.ts';

const LIGHT_QUERY = '(prefers-color-scheme: light)';

function systemTheme(): Theme {
  return window.matchMedia?.(LIGHT_QUERY).matches ? 'light' : 'dark';
}

function useFollowSystem(enabled: boolean, onChange: (theme: Theme) => void) {
  useEffect(() => {
    const query = window.matchMedia?.(LIGHT_QUERY);
    if (!enabled || !query) {
      return;
    }

    const handleChange = () => onChange(query.matches ? 'light' : 'dark');
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, [enabled, onChange]);
}

function useTheme(store: KeyValueStore = storage) {
  const [chosen, setChosen] = useState(() => savedTheme(store));
  const [system, setSystem] = useState(systemTheme);

  useFollowSystem(chosen === null, setSystem);

  const theme = chosen ?? system;

  function toggle() {
    const next = oppositeOf(theme);
    saveTheme(store, next);
    document.documentElement.dataset.theme = next;
    setChosen(next);
  }

  return { theme, toggle };
}

export { useTheme };
