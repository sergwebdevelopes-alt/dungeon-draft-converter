import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../../shared/storage/index.ts';
import { STORAGE_KEY, loadSettings, saveSettings } from './settings.ts';
import { TEST_CONFIG } from './test-config.ts';

function memoryStore(
  initial?: unknown,
): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  if (initial !== undefined) {
    data.set(STORAGE_KEY, initial);
  }
  return {
    data,
    read: (key) => data.get(key) ?? null,
    write: (key, value) => void data.set(key, value),
  };
}

describe('loadSettings', () => {
  it('selects everything when nothing is saved', () => {
    expect(loadSettings(TEST_CONFIG, memoryStore())).toEqual({
      presets: ['JPG_70', 'WEBP_140'],
      variants: ['NoGrid', 'Grid'],
      placement: { size: 10, margin: 3 },
      foundry: false,
    });
  });

  it('keeps saved choices the server still offers', () => {
    const store = memoryStore({
      presets: ['WEBP_140', 'OLD_PRESET'],
      variants: ['Grid'],
      placement: { size: 15, margin: 1 },
      foundry: true,
    });

    expect(loadSettings(TEST_CONFIG, store)).toEqual({
      presets: ['WEBP_140'],
      variants: ['Grid'],
      placement: { size: 15, margin: 1 },
      foundry: true,
    });
  });

  it('falls back when saved values are unusable', () => {
    const store = memoryStore({
      presets: ['OLD_PRESET'],
      variants: 'Grid',
      placement: { size: 999, margin: 'x' },
      foundry: 'yes',
    });

    expect(loadSettings(TEST_CONFIG, store)).toEqual({
      presets: ['JPG_70', 'WEBP_140'],
      variants: ['NoGrid', 'Grid'],
      placement: { size: 10, margin: 3 },
      foundry: false,
    });
  });

  it('clamps a saved placement into the limits', () => {
    const store = memoryStore({ placement: { size: 999, margin: -1 } });

    expect(loadSettings(TEST_CONFIG, store).placement).toEqual({
      size: 20,
      margin: 0,
    });
  });
});

describe('saveSettings', () => {
  it('writes the settings under one key', () => {
    const store = memoryStore();
    const settings = {
      presets: ['JPG_70'],
      variants: ['Grid' as const],
      placement: { size: 5, margin: 1 },
      foundry: true,
    };

    saveSettings(settings, store);

    expect(store.data.get(STORAGE_KEY)).toEqual(settings);
  });
});
