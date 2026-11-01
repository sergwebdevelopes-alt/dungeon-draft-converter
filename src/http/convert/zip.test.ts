import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { describe, it } from 'node:test';
import type { Response } from 'express';
import { unzipSync } from 'fflate';
import { streamZip, type ZipEntry } from './zip.ts';

class FakeResponse extends EventEmitter {
  statusCode = 0;
  headers: Record<string, string> = {};
  chunks: Uint8Array[] = [];
  ended = false;
  writableNeedDrain = false;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  set(headers: Record<string, string>) {
    Object.assign(this.headers, headers);
    return this;
  }

  write(chunk: Uint8Array) {
    this.chunks.push(chunk);
    return true;
  }

  end() {
    this.ended = true;
  }

  destroy() {
    this.ended = true;
  }

  files() {
    return unzipSync(Buffer.concat(this.chunks));
  }
}

async function* toAsync<T>(items: Iterable<T>): AsyncGenerator<T> {
  for (const item of items) {
    await Promise.resolve();
    yield item;
  }
}

function entriesOf(...entries: ZipEntry[]): AsyncGenerator<ZipEntry> {
  return toAsync(entries);
}

function chunksOf(...texts: string[]): AsyncGenerator<Buffer> {
  return toAsync(texts.map((text) => Buffer.from(text)));
}

function send(
  res: FakeResponse,
  entries: AsyncIterable<ZipEntry>,
  stopped = () => false,
) {
  return streamZip(res as unknown as Response, 'Castle', entries, stopped);
}

describe('streamZip', () => {
  it('sends a zip download named after the map', async () => {
    const res = new FakeResponse();

    await send(res, entriesOf());

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], 'application/zip');
    assert.equal(
      res.headers['Content-Disposition'],
      `attachment; filename="Castle.zip"; filename*=UTF-8''Castle.zip`,
    );
    assert.equal(res.ended, true);
  });

  it('puts every file under the map folder, from buffers and streams', async () => {
    const res = new FakeResponse();

    await send(
      res,
      entriesOf(
        { path: 'JPG_70/a.jpg', data: Buffer.from('image') },
        { path: 'FOUNDRY/Castle.dd2vtt', data: chunksOf('{"a":', '1}') },
      ),
    );

    const files = res.files();
    assert.equal(Buffer.from(files['Castle/JPG_70/a.jpg']).toString(), 'image');
    assert.equal(
      Buffer.from(files['Castle/FOUNDRY/Castle.dd2vtt']).toString(),
      '{"a":1}',
    );
  });

  it('keeps non-ASCII map names readable in the download name', async () => {
    const res = new FakeResponse();

    await streamZip(
      res as unknown as Response,
      'Замок',
      entriesOf(),
      () => false,
    );

    assert.equal(
      res.headers['Content-Disposition'],
      `attachment; filename="_____.zip"; filename*=UTF-8''${encodeURIComponent('Замок.zip')}`,
    );
  });

  it('stops without finishing the zip or taking the next file', async () => {
    const res = new FakeResponse();
    let stop = false;
    let taken = 0;

    function* stopAfterFirstChunk(): Generator<Buffer> {
      yield Buffer.from('a');
      stop = true;
      yield Buffer.from('b');
    }

    function* entries(): Generator<ZipEntry> {
      taken++;
      yield { path: 'first.txt', data: toAsync(stopAfterFirstChunk()) };
      taken++;
      yield { path: 'second.txt', data: Buffer.from('c') };
    }

    await send(res, toAsync(entries()), () => stop);

    assert.equal(taken, 1);
    assert.equal(res.ended, false);
  });

  it('waits for the connection to drain before writing more', async () => {
    const res = new FakeResponse();
    res.writableNeedDrain = true;

    const sending = send(
      res,
      entriesOf({ path: 'a.txt', data: chunksOf('one', 'two') }),
    );

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(res.ended, false);

    res.writableNeedDrain = false;
    res.emit('drain');
    await sending;

    assert.equal(res.ended, true);
    assert.equal(Buffer.from(res.files()['Castle/a.txt']).toString(), 'onetwo');
  });
});
