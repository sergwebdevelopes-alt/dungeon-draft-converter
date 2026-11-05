import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LoadedMap } from '../image-processing/read-dd2vtt-file.ts';
import {
  readPoint,
  readRawLights,
  readResolution,
  record,
} from './dd2vtt-metadata.ts';

function makeLevel(
  metadata: Record<string, unknown>,
  pixelsPerGrid?: number,
): LoadedMap {
  return {
    fileNameWithExt: 'level.dd2vtt',
    fileNameWithoutExt: 'level',
    image: 'level.png',
    pixelsPerGrid,
    metadata,
  };
}

describe('record', () => {
  it('returns objects as they are', () => {
    const value = { a: 1 };
    assert.equal(record(value), value);
  });

  it('returns arrays as they are', () => {
    const value = [1, 2];
    assert.equal(record(value), value);
  });

  for (const value of [null, undefined, 42, 'text', true]) {
    it(`returns an empty object for ${JSON.stringify(value)}`, () => {
      assert.deepEqual(record(value), {});
    });
  }
});

describe('readPoint', () => {
  it('reads finite x and y numbers', () => {
    assert.deepEqual(readPoint({ x: 1.5, y: -2 }), { x: 1.5, y: -2 });
  });

  it('keeps only x and y', () => {
    assert.deepEqual(readPoint({ x: 0, y: 0, z: 3 }), { x: 0, y: 0 });
  });

  const invalid: [string, unknown][] = [
    ['a missing x', { y: 1 }],
    ['a missing y', { x: 1 }],
    ['NaN', { x: Number.NaN, y: 1 }],
    ['Infinity', { x: 1, y: Number.POSITIVE_INFINITY }],
    ['string coordinates', { x: '1', y: '2' }],
    ['null', null],
    ['a number', 5],
    ['a string', 'point'],
  ];

  for (const [label, value] of invalid) {
    it(`rejects ${label}`, () => {
      assert.equal(readPoint(value), undefined);
    });
  }
});

describe('readResolution', () => {
  it('reads origin, size and pixels per grid', () => {
    const level = makeLevel(
      {
        resolution: {
          map_origin: { x: 2, y: 3 },
          map_size: { x: 10, y: 8 },
        },
      },
      70,
    );

    assert.deepEqual(readResolution(level), {
      origin: { x: 2, y: 3 },
      size: { x: 10, y: 8 },
      pixelsPerGrid: 70,
    });
  });

  it('defaults the origin to 0,0 and leaves size undefined', () => {
    assert.deepEqual(readResolution(makeLevel({})), {
      origin: { x: 0, y: 0 },
      size: undefined,
      pixelsPerGrid: undefined,
    });
  });

  it('ignores an invalid origin and size', () => {
    const level = makeLevel({
      resolution: { map_origin: { x: 'a' }, map_size: 'big' },
    });

    const resolution = readResolution(level);

    assert.deepEqual(resolution.origin, { x: 0, y: 0 });
    assert.equal(resolution.size, undefined);
  });
});

describe('readRawLights', () => {
  it('keeps only lights with a valid position', () => {
    const valid = { position: { x: 1, y: 2 }, range: 3 };
    const level = makeLevel({
      lights: [valid, { position: { x: 'a', y: 2 } }, { range: 3 }, null, 7],
    });

    assert.deepEqual(readRawLights(level), [valid]);
  });

  for (const lights of [undefined, null, {}, 'lights']) {
    it(`returns no lights for ${JSON.stringify(lights)}`, () => {
      assert.deepEqual(readRawLights(makeLevel({ lights })), []);
    });
  }
});
