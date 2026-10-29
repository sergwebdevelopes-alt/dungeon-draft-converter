import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { readDd2vttStream, type LoadedMap } from '../src/dd2vtt.ts';

const IMAGE_BYTES = Buffer.from('fake png data');

function makeContent(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: 0.3,
    resolution: { pixels_per_grid: 70 },
    image: IMAGE_BYTES.toString('base64'),
    ...overrides,
  });
}

describe('readDd2vttStream', () => {
  let workDir: string;

  before(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-read-'));
  });

  after(async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  });

  function parseDd2vtt(fileName: string, content: string): Promise<LoadedMap> {
    return readDd2vttStream(fileName, [Buffer.from(content)], {
      raw: path.join(workDir, fileName),
      image: path.join(workDir, `${fileName}.png`),
    });
  }

  it('parses a valid file', async () => {
    const map = await parseDd2vtt('MyMap.dd2vtt', makeContent());
    assert.equal(map.fileNameWithExt, 'MyMap.dd2vtt');
    assert.equal(map.fileNameWithoutExt, 'MyMap');
    assert.deepEqual(await fs.readFile(map.image), IMAGE_BYTES);
    assert.equal(map.pixelsPerGrid, 70);
  });

  it('preserves the on-disk file name case for uppercase extensions', async () => {
    const map = await parseDd2vtt('Map.DD2VTT', makeContent());
    assert.equal(map.fileNameWithExt, 'Map.DD2VTT');
    assert.equal(map.fileNameWithoutExt, 'Map');
  });

  it('allows a missing resolution section', async () => {
    const map = await parseDd2vtt(
      'a.dd2vtt',
      makeContent({ resolution: undefined }),
    );
    assert.equal(map.pixelsPerGrid, undefined);
  });

  it('rejects a missing image field', async () => {
    await assert.rejects(
      () => parseDd2vtt('a.dd2vtt', makeContent({ image: undefined })),
      /"a\.dd2vtt".*"image"/,
    );
  });

  it('rejects an empty image field', async () => {
    await assert.rejects(
      () => parseDd2vtt('a.dd2vtt', makeContent({ image: '' })),
      /"a\.dd2vtt"/,
    );
  });

  it('rejects a non-string image field', async () => {
    await assert.rejects(
      () => parseDd2vtt('a.dd2vtt', makeContent({ image: 42 })),
      /"a\.dd2vtt"/,
    );
  });

  it('rejects image data that decodes to nothing', async () => {
    await assert.rejects(
      () => parseDd2vtt('a.dd2vtt', makeContent({ image: '~~~' })),
      /not valid base64/,
    );
  });

  for (const bad of [0, -5, '70', null]) {
    it(`rejects pixels_per_grid = ${JSON.stringify(bad)}`, async () => {
      await assert.rejects(
        () =>
          parseDd2vtt(
            'a.dd2vtt',
            makeContent({ resolution: { pixels_per_grid: bad } }),
          ),
        /pixels_per_grid/,
      );
    });
  }

  it('rejects invalid JSON with the file name in the message', async () => {
    await assert.rejects(
      () => parseDd2vtt('broken.dd2vtt', 'not json'),
      /Invalid JSON in "broken\.dd2vtt"/,
    );
  });
});
