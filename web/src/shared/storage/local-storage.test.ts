import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalStorage } from './local-storage.ts';

describe('createLocalStorage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('writes and reads JSON values', () => {
    const store = createLocalStorage();

    store.write('k', { a: [1, 2] });

    expect(store.read('k')).toEqual({ a: [1, 2] });
  });

  it('reads null for a missing or broken value', () => {
    localStorage.setItem('broken', '{not json');
    const store = createLocalStorage();

    expect(store.read('missing')).toBeNull();
    expect(store.read('broken')).toBeNull();
  });

  it('ignores a full or blocked storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    expect(() => createLocalStorage().write('k', 1)).not.toThrow();
  });
});
