import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import express from 'express';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'upload-test-'));
process.env.TMPDIR = root;

const { errorHandler } =
  await import('../../infrastructure/http-server/http-errors.ts');
const { createUploadDir, uploadDirOf } = await import('./upload-dir.ts');
const { limitTotalUpload, uploadFiles, uploadsOf } =
  await import('./upload.ts');

const IMAGE_BYTES = Buffer.from('decoded image bytes');

interface Upload {
  field: string;
  name: string;
  data: Buffer | string;
}

interface StoredSummary {
  name: string;
  size: number;
  mapName?: string;
  raw?: string;
  image?: string;
  logo?: string;
}

function makeMap(): Buffer {
  return Buffer.from(
    JSON.stringify({
      format: 0.3,
      resolution: { pixels_per_grid: 100 },
      image: IMAGE_BYTES.toString('base64'),
    }),
  );
}

async function readText(file: string | undefined): Promise<string | undefined> {
  return file ? fs.readFile(file, 'utf8') : undefined;
}

async function uploadDirsLeft(): Promise<string[]> {
  const deadline = Date.now() + 5_000;
  let dirs = await fs.readdir(root);

  while (
    dirs.some((dir) => dir.startsWith('dd2vtt-')) &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    dirs = await fs.readdir(root);
  }

  return dirs.filter((dir) => dir.startsWith('dd2vtt-'));
}

describe('uploadFiles', () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = express();

    app.post(
      '/',
      limitTotalUpload,
      createUploadDir,
      uploadFiles,
      async (req, res) => {
        const files = uploadsOf(req);
        const summary: Record<string, StoredSummary[]> = {};

        for (const [field, list] of Object.entries(files)) {
          summary[field] = await Promise.all(
            (list ?? []).map(async (file) => ({
              name: file.name,
              size: file.size,
              mapName: file.map?.fileNameWithExt,
              raw: await readText(file.path),
              image: await readText(file.map?.image),
              logo: file.buffer?.toString(),
            })),
          );
        }

        res.json({ dir: uploadDirOf(req), files: summary });
      },
    );
    app.use(errorHandler);

    server = await new Promise<http.Server>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    base = `http://localhost:${(server.address() as { port: number }).port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
    await fs.rm(root, { recursive: true, force: true });
  });

  async function send(uploads: Upload[]) {
    const form = new FormData();
    for (const upload of uploads) {
      const part =
        typeof upload.data === 'string'
          ? upload.data
          : new Uint8Array(upload.data);
      form.append(upload.field, new Blob([part]), upload.name);
    }

    const res = await fetch(base, { method: 'POST', body: form });

    return {
      status: res.status,
      body: (await res.json()) as Record<string, unknown>,
    };
  }

  it('stores a map on disk with its decoded image', async () => {
    const map = makeMap();

    const { status, body } = await send([
      { field: 'maps', name: 'Castle.dd2vtt', data: map },
    ]);

    assert.equal(status, 200);
    assert.deepEqual(body.files, {
      maps: [
        {
          name: 'Castle.dd2vtt',
          size: map.length,
          mapName: 'Castle.dd2vtt',
          raw: map.toString(),
          image: IMAGE_BYTES.toString(),
        },
      ],
    });
    assert.equal(path.dirname(body.dir as string), root);
  });

  it('keeps the logo in memory', async () => {
    const { status, body } = await send([
      { field: 'maps', name: 'Castle.dd2vtt', data: makeMap() },
      { field: 'logo', name: 'logo.png', data: 'logo bytes' },
    ]);

    assert.equal(status, 200);
    assert.deepEqual((body.files as Record<string, unknown>).logo, [
      { name: 'logo.png', size: 10, logo: 'logo bytes' },
    ]);
  });

  it('rejects a map that is not a .dd2vtt file', async () => {
    const { status, body } = await send([
      { field: 'maps', name: 'notes.txt', data: '{}' },
    ]);

    assert.equal(status, 400);
    assert.deepEqual(body, { error: '"notes.txt" is not a .dd2vtt file.' });
  });

  it('rejects a map without an image', async () => {
    const { status, body } = await send([
      { field: 'maps', name: 'Empty.dd2vtt', data: '{"format":0.3}' },
    ]);

    assert.equal(status, 400);
    assert.deepEqual(body, {
      error:
        'The file "Empty.dd2vtt" does not contain a base64 "image" string.',
    });
  });

  it('rejects more than 10 maps', async () => {
    const map = makeMap();
    const maps = Array.from({ length: 11 }, (_, i) => ({
      field: 'maps',
      name: `L${i}.dd2vtt`,
      data: map,
    }));

    const { status, body } = await send(maps);

    assert.equal(status, 400);
    assert.deepEqual(body, { error: 'At most 10 maps can be combined.' });
  });

  it('rejects an unexpected field and a second logo', async () => {
    for (const uploads of [
      [{ field: 'other', name: 'x.dd2vtt', data: 'x' }],
      [
        { field: 'logo', name: 'a.png', data: 'a' },
        { field: 'logo', name: 'b.png', data: 'b' },
      ],
    ]) {
      const { status, body } = await send(uploads);

      assert.equal(status, 400);
      assert.deepEqual(body, {
        error: 'Invalid upload: Unexpected file field.',
      });
    }
  });

  it('rejects a file over 200 MB', async () => {
    const big = Buffer.alloc(201 * 1024 * 1024, 'A');
    const data = Buffer.concat([
      Buffer.from('{"image":"'),
      big,
      Buffer.from('"}'),
    ]);

    const { status, body } = await send([
      { field: 'maps', name: 'Big.dd2vtt', data },
    ]);

    assert.equal(status, 413);
    assert.deepEqual(body, { error: 'Each file can be at most 200 MB.' });
  });

  it('rejects an upload without a size', async () => {
    const res = await fetch(base, {
      method: 'POST',
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data'));
          controller.close();
        },
      }),
      duplex: 'half',
    } as RequestInit);

    assert.equal(res.status, 411);
    assert.deepEqual(await res.json(), {
      error: 'The upload size is missing.',
    });
  });

  it('rejects an upload larger than 400 MB in total before reading it', async () => {
    const { port } = server.address() as { port: number };

    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request({
        port,
        method: 'POST',
        headers: { 'Content-Length': String(500 * 1024 * 1024) },
      });
      req.on('response', (res) => {
        resolve(res.statusCode ?? 0);
        req.destroy();
      });
      req.on('error', reject);
      req.flushHeaders();
    });

    assert.equal(status, 413);
  });

  it('leaves no request folders behind', async () => {
    assert.deepEqual(await uploadDirsLeft(), []);
  });
});
