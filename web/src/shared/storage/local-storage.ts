import type { KeyValueStore } from './key-value-store.ts';

function createLocalStorage(): KeyValueStore {
  return {
    read(key) {
      try {
        return JSON.parse(localStorage.getItem(key) ?? 'null') as unknown;
      } catch {
        return null;
      }
    },

    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        return;
      }
    },
  };
}

export { createLocalStorage };
