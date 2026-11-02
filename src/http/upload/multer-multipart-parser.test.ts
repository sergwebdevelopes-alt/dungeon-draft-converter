import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';
import express from 'express';
import { createMulterMultipartParser } from './multer-multipart-parser.ts';
import { MultipartLimitError, type MultipartFile } from './multipart-parser.ts';

interface StoredText {
  field: string;
  name: string;
  text: string;
}

interface ParseResult {
  files?: Record<string, StoredText[]>;
  error?: { name: string; limit?: string; field?: string; message: string };
}

const removed: StoredText[] = [];

async function storeText(file: MultipartFile): Promise<StoredText> {
  const chunks: Buffer[] = [];

  for await (const chunk of file.stream) {
    chunks.push(chunk as Buffer);
  }

  const text = Buffer.concat(chunks).toString();

  if (text === 'fail') {
    throw new Error('Could not store the file.');
  }

  return { field: file.field, name: file.name, text };
}

const parse = createMulterMultipartParser<StoredText>({
  fields: [
    { name: 'maps', maxCount: 2 },
    { name: 'logo', maxCount: 1 },
  ],
  maxFileBytes: 10,
  maxFiles: 2,
  store: (_req, file) => storeText(file),
  remove: (file) => {
    removed.push(file);
    return Promise.resolve();
  },
});

function send(
  base: string,
  files: { field: string; name: string; text: string }[],
): Promise<ParseResult> {
  const form = new FormData();
  for (const file of files) {
    form.append(file.field, new Blob([file.text]), file.name);
  }

  return fetch(base, { method: 'POST', body: form }).then(
    (res) => res.json() as Promise<ParseResult>,
  );
}

describe('createMulterMultipartParser', () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = express();

    app.post('/', async (req, res) => {
      try {
        res.json({ files: await parse(req, res) });
      } catch (error) {
        const { name, message } = error as Error;
        const { limit, field } = error as Partial<MultipartLimitError>;
        res.json({ error: { name, limit, field, message } });
      }
    });

    server = await new Promise<http.Server>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    base = `http://localhost:${(server.address() as { port: number }).port}`;
  });

  after(
    () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  );

  beforeEach(() => {
    removed.length = 0;
  });

  it('returns the stored files grouped by field', async () => {
    const result = await send(base, [
      { field: 'maps', name: 'a.dd2vtt', text: 'first' },
      { field: 'logo', name: 'logo.png', text: 'logo' },
    ]);

    assert.deepEqual(result.files, {
      maps: [{ field: 'maps', name: 'a.dd2vtt', text: 'first' }],
      logo: [{ field: 'logo', name: 'logo.png', text: 'logo' }],
    });
  });

  it('keeps the original file name, including non-Latin letters', async () => {
    const result = await send(base, [
      { field: 'maps', name: 'Замок.dd2vtt', text: 'x' },
    ]);

    assert.equal(result.files?.maps?.[0].name, 'Замок.dd2vtt');
  });

  it('reports a file over the size limit and removes every stored file, including the cut-off one', async () => {
    const result = await send(base, [
      { field: 'maps', name: 'small.dd2vtt', text: 'ok' },
      { field: 'logo', name: 'big.png', text: 'much too long' },
    ]);

    assert.equal(result.error?.name, 'MultipartLimitError');
    assert.equal(result.error?.limit, 'file-too-large');
    assert.deepEqual(
      removed.map((file) => file.name),
      ['small.dd2vtt', 'big.png'],
    );
  });

  it('reports too many files in total', async () => {
    const result = await send(base, [
      { field: 'maps', name: 'a.dd2vtt', text: 'a' },
      { field: 'maps', name: 'b.dd2vtt', text: 'b' },
      { field: 'logo', name: 'logo.png', text: 'c' },
    ]);

    assert.equal(result.error?.limit, 'too-many-files');
  });

  it('reports too many files in one field, naming the field', async () => {
    const result = await send(base, [
      { field: 'logo', name: 'one.png', text: 'a' },
      { field: 'logo', name: 'two.png', text: 'b' },
    ]);

    assert.equal(result.error?.limit, 'unexpected-field');
    assert.equal(result.error?.field, 'logo');
  });

  it('reports a field that is not allowed', async () => {
    const result = await send(base, [
      { field: 'other', name: 'x.txt', text: 'x' },
    ]);

    assert.equal(result.error?.limit, 'unexpected-field');
    assert.equal(result.error?.field, 'other');
  });

  it('passes errors from storing a file on unchanged', async () => {
    const result = await send(base, [
      { field: 'maps', name: 'bad.dd2vtt', text: 'fail' },
    ]);

    assert.deepEqual(result.error, {
      name: 'Error',
      message: 'Could not store the file.',
    });
  });
});
