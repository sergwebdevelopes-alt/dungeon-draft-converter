import { describe, expect, it } from 'vitest';
import { addMaps, logoError, moveItem } from './map-rules.ts';
import { TEST_CONFIG, file } from './test-config.ts';

describe('addMaps', () => {
  it('adds .dd2vtt files and skips ones already added', () => {
    const cave = file('Cave.dd2vtt');

    const result = addMaps([cave], [cave, file('Tower.dd2vtt')], TEST_CONFIG);

    expect(result.error).toBeNull();
    expect(result.maps.map((m) => m.name)).toEqual([
      'Cave.dd2vtt',
      'Tower.dd2vtt',
    ]);
  });

  it('accepts the extension in any case', () => {
    expect(addMaps([], [file('Cave.DD2VTT')], TEST_CONFIG).error).toBeNull();
  });

  it('rejects other files and keeps the maps added before', () => {
    const result = addMaps(
      [],
      [file('Cave.dd2vtt'), file('notes.txt'), file('Tower.dd2vtt')],
      TEST_CONFIG,
    );

    expect(result.error).toBe('"notes.txt" is not a .dd2vtt file.');
    expect(result.maps.map((m) => m.name)).toEqual(['Cave.dd2vtt']);
  });

  it('rejects a map over the size limit', () => {
    expect(addMaps([], [file('Big.dd2vtt', 101)], TEST_CONFIG).error).toBe(
      '"Big.dd2vtt" is too large (max 1 KB per map).',
    );
  });

  it('rejects more maps than the level limit', () => {
    const maps = [
      file('A.dd2vtt', 1),
      file('B.dd2vtt', 1),
      file('C.dd2vtt', 1),
    ];

    expect(addMaps(maps, [file('D.dd2vtt', 1)], TEST_CONFIG).error).toBe(
      'At most 3 maps can be combined.',
    );
  });

  it('rejects maps over the total size limit', () => {
    const result = addMaps(
      [file('A.dd2vtt', 100)],
      [file('B.dd2vtt', 60)],
      TEST_CONFIG,
    );

    expect(result.error).toBe('All maps together can be at most 1 KB.');
    expect(result.maps).toHaveLength(1);
  });
});

describe('moveItem', () => {
  it('moves an item without changing the original list', () => {
    const list = ['a', 'b', 'c'];

    expect(moveItem(list, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(list).toEqual(['a', 'b', 'c']);
  });
});

describe('logoError', () => {
  it('accepts PNG, JPG and WebP within the size limit', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(logoError(file('logo', 10, type), 50)).toBeNull();
    }
  });

  it('rejects other types and large files', () => {
    expect(logoError(file('logo.gif', 10, 'image/gif'), 50)).toBe(
      'Logo must be a PNG, JPG or WebP image.',
    );
    expect(logoError(file('logo.png', 51, 'image/png'), 50)).toBe(
      'This logo is too large (max 1 KB).',
    );
  });
});
