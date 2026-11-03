import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { unzipSync } from 'fflate';
import sharp from 'sharp';
import { ConversionQueue } from '../../queue/index.ts';
import { errorHandler } from '../errors.ts';
import { createUploadDir, uploadFiles } from '../upload/index.ts';
import { logConversions, type ConversionLogEntry } from './conversion-log.ts';
import { convertHandler } from './handler.ts';

interface MapOptions {
  size?: number;
  pixelsPerGrid?: number;
  baked?: boolean;
}

interface TestServer {
  base: string;
  queue: ConversionQueue;
  logged: ConversionLogEntry[];
  close: () => Promise<void>;
}

const TICKET_A = 'a'.repeat(32);
const TICKET_B = 'b'.repeat(32);

async function makeMap({
  size = 200,
  pixelsPerGrid = 100,
  baked = true,
}: MapOptions = {}): Promise<Buffer> {
  const image = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 120, g: 90, b: 60, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const resolution = pixelsPerGrid
    ? {
        map_origin: { x: 0, y: 0 },
        map_size: { x: size / pixelsPerGrid, y: size / pixelsPerGrid },
        pixels_per_grid: pixelsPerGrid,
      }
    : { map_origin: { x: 0, y: 0 } };

  return Buffer.from(
    JSON.stringify({
      format: 0.3,
      resolution,
      environment: { baked_lighting: baked, ambient_light: 'ff808080' },
      lights: [],
      line_of_sight: [],
      portals: [],
      image: image.toString('base64'),
    }),
  );
}

async function startServer(timeoutMs?: number): Promise<TestServer> {
  const queue = new ConversionQueue({ maxParallel: 1 });
  const logged: ConversionLogEntry[] = [];
  const app = express();

  app.post(
    '/convert',
    logConversions((entry) => logged.push(entry)),
    createUploadDir,
    uploadFiles,
    convertHandler(queue, timeoutMs),
  );
  app.use(errorHandler);

  const server = await new Promise<http.Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const { port } = server.address() as { port: number };

  return {
    base: `http://localhost:${port}`,
    queue,
    logged,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

function convert(
  base: string,
  maps: { name: string; data: Buffer }[],
  query: Record<string, string>,
  signal?: AbortSignal,
): Promise<Response> {
  const form = new FormData();
  for (const map of maps) {
    form.append('maps', new Blob([new Uint8Array(map.data)]), map.name);
  }

  return fetch(`${base}/convert?${new URLSearchParams(query)}`, {
    method: 'POST',
    body: form,
    signal,
  });
}

async function download(
  ...args: Parameters<typeof convert>
): Promise<{ status: number; body: ArrayBuffer }> {
  const res = await convert(...args);

  return { status: res.status, body: await res.arrayBuffer() };
}

async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for condition.');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function unzip(res: Response): Promise<Record<string, Uint8Array>> {
  return unzipSync(new Uint8Array(await res.arrayBuffer()));
}

describe('convertHandler', () => {
  describe('successful conversions', () => {
    let server: TestServer;

    before(async () => {
      server = await startServer();
    });

    after(() => server.close());

    it('sends a zip with the original file and the chosen images', async () => {
      const map = await makeMap();

      const res = await convert(
        server.base,
        [{ name: 'Castle.dd2vtt', data: map }],
        { presets: 'JPG_70', variants: 'NoGrid,Grid', name: 'Castle.dd2vtt' },
      );

      assert.equal(res.status, 200);
      assert.match(
        res.headers.get('content-disposition') ?? '',
        /filename="Castle\.zip"/,
      );

      const files = await unzip(res);
      assert.deepEqual(Object.keys(files).sort(), [
        'Castle/FOUNDRY_VTT_DD2VTT/Castle.dd2vtt',
        'Castle/JPG_70/Castle_70px_Grid.jpg',
        'Castle/JPG_70/Castle_70px_NoGrid.jpg',
      ]);
      assert.deepEqual(
        Buffer.from(files['Castle/FOUNDRY_VTT_DD2VTT/Castle.dd2vtt']),
        map,
      );

      const image = await sharp(
        files['Castle/JPG_70/Castle_70px_NoGrid.jpg'],
      ).metadata();
      assert.equal(image.width, 140);
      assert.equal(image.height, 140);

      await waitFor(() => server.logged.length > 0);
      const entry = server.logged.at(-1)!;
      assert.equal(entry.result, 'ok');
      assert.equal(entry.status, 200);
      assert.equal(entry.levels, 1);
      assert.deepEqual(entry.presets, ['JPG_70']);
      assert.deepEqual(entry.variants, ['NoGrid', 'Grid']);
      assert.ok(entry.uploadMB !== undefined && entry.uploadMB >= 0);
      assert.ok(entry.convertMs !== undefined && entry.convertMs >= 0);
      assert.ok(entry.tookMs >= entry.convertMs);
      assert.doesNotMatch(JSON.stringify(entry), /Castle/);
    });

    it('merges several levels into one map', async () => {
      const level = await makeMap();

      const res = await convert(
        server.base,
        [
          { name: 'Top.dd2vtt', data: level },
          { name: 'Ground.dd2vtt', data: level },
        ],
        { presets: 'JPG_70', variants: 'NoGrid', name: 'Top.dd2vtt' },
      );

      assert.equal(res.status, 200);
      assert.deepEqual(Object.keys(await unzip(res)).sort(), [
        'Top_merged/FOUNDRY_VTT_DD2VTT/Top_merged.dd2vtt',
        'Top_merged/JPG_70/Top_merged_70px_NoGrid.jpg',
      ]);
      await waitFor(() => server.logged.at(-1)?.levels === 2);
    });

    it('answers 400 for an invalid request without queueing it', async () => {
      const res = await convert(
        server.base,
        [{ name: 'Castle.dd2vtt', data: await makeMap() }],
        { presets: 'NOPE', ticket: TICKET_A },
      );

      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: 'Unknown presets: NOPE' });
      assert.deepEqual(server.queue.position(TICKET_A), { state: 'unknown' });
    });

    it('answers 422 when only grid images are asked for a map without a grid', async () => {
      const res = await convert(
        server.base,
        [
          {
            name: 'Plain.dd2vtt',
            data: await makeMap({ pixelsPerGrid: 0 }),
          },
        ],
        { presets: 'JPG_70', variants: 'Grid' },
      );

      assert.equal(res.status, 422);
      assert.deepEqual(await res.json(), {
        error:
          'This map has no grid information, so only "No grid" images can be made.',
      });
    });
  });

  describe('queue tickets', () => {
    let server: TestServer;
    let bigMap: Buffer;

    before(async () => {
      server = await startServer();
      bigMap = await makeMap({ size: 4000 });
    });

    after(() => server.close());

    const slowQuery = { presets: 'JPG_300', variants: 'NoGrid' };

    it('reports positions while converting and forgets tickets afterwards', async () => {
      const first = download(
        server.base,
        [{ name: 'A.dd2vtt', data: bigMap }],
        {
          ...slowQuery,
          ticket: TICKET_A,
        },
      );
      await waitFor(
        () => server.queue.position(TICKET_A).state === 'converting',
      );

      const second = download(
        server.base,
        [{ name: 'B.dd2vtt', data: await makeMap() }],
        { presets: 'JPG_70', ticket: TICKET_B },
      );
      await waitFor(() => server.queue.position(TICKET_B).state === 'waiting');

      assert.deepEqual(server.queue.position(TICKET_B), {
        state: 'waiting',
        ahead: 1,
      });

      const responses = await Promise.all([first, second]);

      assert.deepEqual(
        responses.map((res) => res.status),
        [200, 200],
      );
      await waitFor(
        () =>
          server.queue.position(TICKET_A).state === 'unknown' &&
          server.queue.position(TICKET_B).state === 'unknown',
      );
    });

    it('forgets the ticket of a request cancelled while waiting', async () => {
      const first = download(
        server.base,
        [{ name: 'A.dd2vtt', data: bigMap }],
        {
          ...slowQuery,
          ticket: TICKET_A,
        },
      );
      await waitFor(
        () => server.queue.position(TICKET_A).state === 'converting',
      );

      const cancel = new AbortController();
      const second = convert(
        server.base,
        [{ name: 'B.dd2vtt', data: await makeMap() }],
        { presets: 'JPG_70', ticket: TICKET_B },
        cancel.signal,
      ).catch((error: unknown) => error);
      await waitFor(() => server.queue.position(TICKET_B).state === 'waiting');

      cancel.abort();

      await waitFor(() => server.queue.position(TICKET_B).state === 'unknown');
      assert.equal(((await second) as Error).name, 'AbortError');
      assert.equal((await first).status, 200);
    });
  });

  describe('timeout', () => {
    it('answers 503 when the time runs out before the download starts', async () => {
      const server = await startServer(20);
      const level = await makeMap({ size: 3000, baked: false });

      try {
        const res = await convert(
          server.base,
          [
            { name: 'Top.dd2vtt', data: level },
            { name: 'Ground.dd2vtt', data: level },
          ],
          { presets: 'JPG_70', variants: 'NoGrid' },
        );

        assert.equal(res.status, 503);
        assert.deepEqual(await res.json(), {
          error:
            'The conversion took longer than 0 seconds and was stopped. Try fewer formats or a smaller map.',
        });
        await waitFor(() => server.logged.length > 0);
        assert.equal(server.logged[0].result, 'timeout');
      } finally {
        await server.close();
      }
    });

    it('breaks off the download when the time runs out while it is being sent', async () => {
      const server = await startServer(1000);
      const map = await makeMap({ size: 5000 });

      try {
        const res = await convert(
          server.base,
          [{ name: 'Big.dd2vtt', data: map }],
          { presets: 'JPG_300', variants: 'NoGrid,Grid' },
        );

        assert.equal(res.status, 200);
        await assert.rejects(res.arrayBuffer());
        await waitFor(() => server.logged.length > 0);
        assert.equal(server.logged[0].result, 'timeout');
      } finally {
        await server.close();
      }
    });
  });
});
