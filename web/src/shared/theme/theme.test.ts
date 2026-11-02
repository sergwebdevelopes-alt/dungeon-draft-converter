import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../storage/index.ts';
import { THEME_KEY, oppositeOf, savedTheme, saveTheme } from './theme.ts';

function memoryStore(
  value?: unknown,
): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>(
    value === undefined ? [] : [[THEME_KEY, value]],
  );
  return {
    data,
    read: (key) => data.get(key) ?? null,
    write: (key, next) => void data.set(key, next),
  };
}

describe('theme', () => {
  it('reads only a valid saved choice', () => {
    expect(savedTheme(memoryStore('light'))).toBe('light');
    expect(savedTheme(memoryStore('dark'))).toBe('dark');
    expect(savedTheme(memoryStore('purple'))).toBeNull();
    expect(savedTheme(memoryStore())).toBeNull();
  });

  it('saves the choice under the key the boot script reads', () => {
    const store = memoryStore();

    saveTheme(store, 'light');

    expect(store.data.get('lair-of-artificer:theme')).toBe('light');
  });

  it('switches to the other theme', () => {
    expect(oppositeOf('dark')).toBe('light');
    expect(oppositeOf('light')).toBe('dark');
  });
});
