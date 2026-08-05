import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDd2vtt } from '../src/dd2vtt.ts';

const IMAGE_BYTES = Buffer.from('fake png data');

function makeContent(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: 0.3,
    resolution: { pixels_per_grid: 70 },
    image: IMAGE_BYTES.toString('base64'),
    ...overrides,
  });
}

describe('parseDd2vtt', () => {
  it('parses a valid file', () => {
    const map = parseDd2vtt('MyMap.dd2vtt', makeContent());
    assert.equal(map.fileNameWithExt, 'MyMap.dd2vtt');
    assert.equal(map.fileNameWithoutExt, 'MyMap');
    assert.deepEqual(map.buffer, IMAGE_BYTES);
    assert.equal(map.pixelsPerGrid, 70);
  });

  it('preserves the on-disk file name case for uppercase extensions', () => {
    const map = parseDd2vtt('Map.DD2VTT', makeContent());
    assert.equal(map.fileNameWithExt, 'Map.DD2VTT');
    assert.equal(map.fileNameWithoutExt, 'Map');
  });

  it('allows a missing resolution section', () => {
    const map = parseDd2vtt('a.dd2vtt', makeContent({ resolution: undefined }));
    assert.equal(map.pixelsPerGrid, undefined);
  });

  it('rejects a missing image field', () => {
    assert.throws(
      () => parseDd2vtt('a.dd2vtt', makeContent({ image: undefined })),
      /"a\.dd2vtt".*"image"/,
    );
  });

  it('rejects an empty image field', () => {
    assert.throws(
      () => parseDd2vtt('a.dd2vtt', makeContent({ image: '' })),
      /"a\.dd2vtt"/,
    );
  });

  it('rejects a non-string image field', () => {
    assert.throws(
      () => parseDd2vtt('a.dd2vtt', makeContent({ image: 42 })),
      /"a\.dd2vtt"/,
    );
  });

  it('rejects image data that decodes to nothing', () => {
    assert.throws(
      () => parseDd2vtt('a.dd2vtt', makeContent({ image: '~~~' })),
      /not valid base64/,
    );
  });

  for (const bad of [0, -5, '70', null]) {
    it(`rejects pixels_per_grid = ${JSON.stringify(bad)}`, () => {
      assert.throws(
        () =>
          parseDd2vtt(
            'a.dd2vtt',
            makeContent({ resolution: { pixels_per_grid: bad } }),
          ),
        /pixels_per_grid/,
      );
    });
  }

  it('rejects invalid JSON with the file name in the message', () => {
    assert.throws(
      () => parseDd2vtt('broken.dd2vtt', 'not json'),
      /Invalid JSON in "broken\.dd2vtt"/,
    );
  });
});
