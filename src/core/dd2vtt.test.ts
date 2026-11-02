import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  MAP_EXTENSION,
  newImagePath,
  readDd2vttStream,
  serializeDd2vtt,
  type LoadedMap,
} from './dd2vtt.ts';

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

  describe('image data', () => {
    const INVALID_IMAGE =
      'The "image" field in "a.dd2vtt" is not valid base64 image data.';

    function parseChunks(chunks: string[]): Promise<LoadedMap> {
      return readDd2vttStream(
        'a.dd2vtt',
        chunks.map((chunk) => Buffer.from(chunk, 'latin1')),
        {
          raw: path.join(workDir, 'chunks.dd2vtt'),
          image: path.join(workDir, 'chunks.png'),
        },
      );
    }

    for (const [label, image] of [
      ['a space', 'ZmFr ZSBw'],
      ['a dash', 'ZmFr-ZSBw'],
      ['a non-ASCII letter', 'ZmFré'],
      ['padding in the middle', 'ZmE=ZmFr'],
    ]) {
      it(`rejects ${label}`, async () => {
        await assert.rejects(
          () => parseDd2vtt('a.dd2vtt', makeContent({ image })),
          { name: 'InvalidMapFileError', message: INVALID_IMAGE },
        );
      });
    }

    it('accepts padding at the end', async () => {
      const bytes = Buffer.from('ab');

      const map = await parseDd2vtt(
        'a.dd2vtt',
        makeContent({ image: bytes.toString('base64') }),
      );

      assert.equal(bytes.toString('base64'), 'YWI=');
      assert.deepEqual(await fs.readFile(map.image), bytes);
    });

    it('accepts padding split across two chunks', async () => {
      const map = await parseChunks(['{"image":"YQ=', '="}']);

      assert.deepEqual(await fs.readFile(map.image), Buffer.from('a'));
    });

    it('rejects data after padding in the next chunk', async () => {
      await assert.rejects(() => parseChunks(['{"image":"YQ==', 'YQ=="}']), {
        message: INVALID_IMAGE,
      });
    });

    it('rejects a bad character in a later chunk', async () => {
      await assert.rejects(
        () => parseChunks(['{"image":"ZmFr', 'ZSBw', 'ZS!w"}']),
        { message: INVALID_IMAGE },
      );
    });
  });
});

function patternBytes(length: number): Buffer {
  const bytes = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = (i * 31 + 7) % 256;
  }
  return bytes;
}

async function collect(source: AsyncIterable<Buffer>): Promise<Buffer[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of source) {
    chunks.push(chunk);
  }
  return chunks;
}

describe('serializeDd2vtt', () => {
  let workDir: string;

  before(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-write-'));
  });

  after(async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  });

  async function writeImage(bytes: Buffer): Promise<string> {
    const file = newImagePath(workDir);
    await fs.writeFile(file, bytes);
    return file;
  }

  async function serialize(
    metadata: Record<string, unknown>,
    bytes: Buffer,
  ): Promise<{ chunks: Buffer[]; text: string }> {
    const image = await writeImage(bytes);
    const chunks = await collect(serializeDd2vtt(metadata, image));
    return { chunks, text: Buffer.concat(chunks).toString('utf8') };
  }

  async function roundTrip(
    metadata: Record<string, unknown>,
    bytes: Buffer,
  ): Promise<LoadedMap> {
    const { chunks } = await serialize(metadata, bytes);
    return readDd2vttStream('round.dd2vtt', chunks, {
      raw: newImagePath(workDir, 'dd2vtt'),
      image: newImagePath(workDir),
    });
  }

  const metadata = {
    format: 0.3,
    resolution: { pixels_per_grid: 70, map_size: { x: 4, y: 3 } },
    lights: [{ position: { x: 1, y: 2 }, range: 5 }],
  };

  it('writes the metadata and the image as base64 JSON', async () => {
    const bytes = patternBytes(100);

    const { text } = await serialize(metadata, bytes);

    assert.deepEqual(JSON.parse(text), {
      ...metadata,
      image: bytes.toString('base64'),
    });
  });

  it('writes only the image for empty metadata', async () => {
    const bytes = patternBytes(10);

    const { text } = await serialize({}, bytes);

    assert.deepEqual(JSON.parse(text), { image: bytes.toString('base64') });
  });

  for (const length of [1, 2, 3, 3 * 64 * 1024 + 1, 3 * 64 * 1024 * 2 + 2]) {
    it(`round trips a ${length} byte image through readDd2vttStream`, async () => {
      const bytes = patternBytes(length);

      const map = await roundTrip(metadata, bytes);

      assert.deepEqual(map.metadata, metadata);
      assert.deepEqual(await fs.readFile(map.image), bytes);
      assert.equal(map.pixelsPerGrid, 70);
    });
  }

  it('writes one unbroken base64 string for an image spanning several chunks', async () => {
    const bytes = patternBytes(3 * 64 * 1024 * 3 + 1);

    const { text } = await serialize({}, bytes);

    const { image } = JSON.parse(text) as { image: string };

    assert.equal(image, bytes.toString('base64'));
  });

  it('round trips empty metadata', async () => {
    const bytes = patternBytes(50);

    const map = await roundTrip({}, bytes);

    assert.deepEqual(map.metadata, {});
    assert.deepEqual(await fs.readFile(map.image), bytes);
  });
});

describe('newImagePath', () => {
  it('returns a png path inside the work folder by default', () => {
    const file = newImagePath('/work');
    assert.equal(path.dirname(file), '/work');
    assert.equal(path.extname(file), '.png');
  });

  it('uses the given extension', () => {
    assert.equal(path.extname(newImagePath('/work', 'v')), '.v');
  });

  it('returns a different path each time', () => {
    assert.notEqual(newImagePath('/work'), newImagePath('/work'));
  });
});

describe('MAP_EXTENSION', () => {
  it('is .dd2vtt', () => {
    assert.equal(MAP_EXTENSION, '.dd2vtt');
  });
});
