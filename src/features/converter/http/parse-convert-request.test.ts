import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import sharp from 'sharp';
import {
  FORMAT_PRESETS,
  VARIANTS,
} from '../image-processing/render-map-images.ts';
import { parseConvertRequest } from './parse-convert-request.ts';
import type { UploadedFile, Uploads } from './upload/upload.ts';
import { ConversionQueue } from '../application/conversion-queue.ts';

const TICKET = '0123456789abcdef0123456789abcdef';

type ConvertInput = Parameters<typeof parseConvertRequest>[0];

function mapFile(name: string, withMap = true): UploadedFile {
  return {
    name,
    path: `/uploads/${name}`,
    size: 100,
    map: withMap
      ? {
          fileNameWithExt: name,
          fileNameWithoutExt: name.replace(/\.dd2vtt$/i, ''),
          image: `/uploads/${name}.png`,
          pixelsPerGrid: 100,
          metadata: {},
        }
      : undefined,
  };
}

function logoFile(buffer: Buffer, size = buffer.length): UploadedFile {
  return { name: 'logo.png', buffer, size };
}

function makeRequest(
  query: Record<string, string> = {},
  files: Uploads = { maps: [mapFile('Main.dd2vtt')] },
): ConvertInput {
  return { query, files };
}

function parse(
  request: ConvertInput,
  queue = new ConversionQueue({ maxParallel: 1 }),
) {
  return parseConvertRequest(request, queue);
}

describe('parseConvertRequest', () => {
  let logoPng: Buffer;

  before(async () => {
    logoPng = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#c33' },
    })
      .png()
      .toBuffer();
  });

  describe('defaults', () => {
    it('uses every preset and variant, no logo and no ticket', async () => {
      const result = await parse(makeRequest());

      assert.deepEqual(result.presets, FORMAT_PRESETS);
      assert.deepEqual(result.variants, VARIANTS);
      assert.equal(result.logo, undefined);
      assert.equal(result.ticket, undefined);
    });

    it('keeps the uploaded file as the original for a single map', async () => {
      const result = await parse(makeRequest());

      assert.equal(result.levels.length, 1);
      assert.equal(result.original, '/uploads/Main.dd2vtt');
    });
  });

  describe('foundry', () => {
    it('leaves the Foundry file out unless it is turned on', async () => {
      for (const [query, expected] of [
        [{}, false],
        [{ foundry: '' }, false],
        [{ foundry: 'false' }, false],
        [{ foundry: 'true' }, true],
      ] as const) {
        const result = await parse(makeRequest(query));

        assert.equal(result.foundry, expected, JSON.stringify(query));
      }
    });

    it('refuses any other value', async () => {
      for (const foundry of ['yes', '1', 'TRUE']) {
        await assert.rejects(parse(makeRequest({ foundry })), {
          status: 400,
          message: 'foundry must be true or false.',
        });
      }
    });
  });

  describe('presets and variants', () => {
    it('returns the chosen presets in the standard order', async () => {
      const result = await parse(makeRequest({ presets: 'WEBP_140,JPG_70' }));

      assert.deepEqual(
        result.presets.map((p) => p.name),
        ['JPG_70', 'WEBP_140'],
      );
    });

    it('rejects an unknown preset', async () => {
      await assert.rejects(parse(makeRequest({ presets: 'JPG_70,NOPE' })), {
        status: 400,
        message: 'Unknown presets: NOPE',
      });
    });

    it('returns the chosen variants', async () => {
      const result = await parse(makeRequest({ variants: 'Grid' }));

      assert.deepEqual(result.variants, ['Grid']);
    });

    it('rejects an unknown variant', async () => {
      await assert.rejects(parse(makeRequest({ variants: 'Dots' })), {
        status: 400,
        message: 'Unknown variants: Dots',
      });
    });
  });

  describe('ticket', () => {
    it('accepts a 32-character hex ticket', async () => {
      const result = await parse(makeRequest({ ticket: TICKET }));

      assert.equal(result.ticket, TICKET);
    });

    it('rejects a malformed ticket', async () => {
      await assert.rejects(parse(makeRequest({ ticket: 'not-a-ticket' })), {
        status: 400,
        message: 'The queue ticket is not valid.',
      });
    });

    it('rejects a ticket that is already in the queue', async () => {
      const queue = new ConversionQueue({ maxParallel: 1 });
      void queue.run(() => new Promise(() => undefined), {
        ticket: TICKET,
        signal: new AbortController().signal,
      });

      await assert.rejects(parse(makeRequest({ ticket: TICKET }), queue), {
        status: 409,
        message: 'This queue ticket is already in use.',
      });
    });
  });

  describe('map files', () => {
    it('rejects a request without maps', async () => {
      await assert.rejects(parse(makeRequest({}, {})), {
        status: 400,
        message: 'Please upload a .dd2vtt map file.',
      });
    });

    it('names the main map after the name parameter', async () => {
      const result = await parse(makeRequest({ name: 'Castle.dd2vtt' }));

      assert.equal(result.levels[0].fileNameWithExt, 'Castle.dd2vtt');
      assert.equal(result.levels[0].fileNameWithoutExt, 'Castle');
    });

    it('cleans up unsafe characters and folders in the name', async () => {
      const result = await parse(
        makeRequest({ name: '../../etc/My map?!*.dd2vtt' }),
      );

      assert.equal(result.levels[0].fileNameWithExt, 'My map___.dd2vtt');
    });

    it('falls back to "map" when nothing is left of the name', async () => {
      const result = await parse(makeRequest({ name: '...dd2vtt' }));

      assert.equal(result.levels[0].fileNameWithExt, 'map.dd2vtt');
    });

    it('rejects a name that is not a .dd2vtt file', async () => {
      await assert.rejects(parse(makeRequest({ name: 'notes.txt' })), {
        status: 400,
        message: '"notes.txt" is not a .dd2vtt file.',
      });
    });

    it('rejects a map that could not be read', async () => {
      const request = makeRequest(
        {},
        { maps: [mapFile('Broken.dd2vtt', false)] },
      );

      await assert.rejects(parse(request), {
        status: 400,
        message: '"Broken.dd2vtt" could not be read.',
      });
    });

    it('keeps every level in order and has no single original file', async () => {
      const request = makeRequest(
        { name: 'Top.dd2vtt' },
        { maps: [mapFile('upload-1.dd2vtt'), mapFile('Ground.dd2vtt')] },
      );

      const result = await parse(request);

      assert.deepEqual(
        result.levels.map((level) => level.fileNameWithExt),
        ['Top.dd2vtt', 'Ground.dd2vtt'],
      );
      assert.equal(result.original, undefined);
    });
  });

  describe('logo', () => {
    it('combines the logo image with its placement', async () => {
      const request = makeRequest(
        { logoSize: '12', logoMargin: '1.5' },
        { maps: [mapFile('Main.dd2vtt')], logo: [logoFile(logoPng)] },
      );

      const result = await parse(request);

      assert.deepEqual(result.logo, { image: logoPng, size: 12, margin: 1.5 });
    });

    it('uses the default placement when none is given', async () => {
      const request = makeRequest(
        {},
        { maps: [mapFile('Main.dd2vtt')], logo: [logoFile(logoPng)] },
      );

      const result = await parse(request);

      assert.deepEqual(result.logo, { image: logoPng, size: 10, margin: 3 });
    });

    it('rejects a placement outside the limits', async () => {
      await assert.rejects(parse(makeRequest({ logoSize: '99' })), {
        name: 'InvalidLogoPlacementError',
        message: 'Logo size must be a number between 2% and 20%.',
      });
    });

    it('rejects a placement that is not a number', async () => {
      await assert.rejects(parse(makeRequest({ logoMargin: 'abc' })), {
        name: 'InvalidLogoPlacementError',
        message: 'Logo margin must be a number between 0% and 5%.',
      });
    });

    it('rejects a logo file over the size limit', async () => {
      const request = makeRequest(
        {},
        {
          maps: [mapFile('Main.dd2vtt')],
          logo: [logoFile(logoPng, 6 * 1024 * 1024)],
        },
      );

      await assert.rejects(parse(request), {
        status: 413,
        message: 'Logo is too large (max 5 MB).',
      });
    });

    it('rejects a logo that is not an image', async () => {
      const request = makeRequest(
        {},
        {
          maps: [mapFile('Main.dd2vtt')],
          logo: [logoFile(Buffer.from('not an image'))],
        },
      );

      await assert.rejects(parse(request), {
        name: 'InvalidLogoError',
        message: 'Logo must be a PNG, JPG or WebP image.',
      });
    });
  });

  it('reports a bad query before looking at the files', async () => {
    const request = makeRequest(
      { presets: 'NOPE' },
      {
        maps: [mapFile('Main.dd2vtt')],
        logo: [logoFile(Buffer.from('not an image'))],
      },
    );

    await assert.rejects(parse(request), {
      status: 400,
      message: 'Unknown presets: NOPE',
    });
  });
});
