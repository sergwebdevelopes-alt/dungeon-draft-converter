import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import zlib from 'node:zlib';
import { precompress } from './precompress.ts';

const SCRIPT = `console.log(${JSON.stringify('dungeon '.repeat(400))});`;

describe('precompress', () => {
  let dir: string;
  let compressed: string[];

  before(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'precompress-'));
    await fs.mkdir(path.join(dir, 'assets'));
    await fs.writeFile(path.join(dir, 'assets', 'index.js'), SCRIPT);
    await fs.writeFile(path.join(dir, 'tiny.css'), 'a{}');
    await fs.writeFile(path.join(dir, 'map.webp'), SCRIPT);

    compressed = await precompress(dir);
  });

  after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('writes brotli and gzip copies of text files, also in subfolders', async () => {
    const file = path.join(dir, 'assets', 'index.js');

    const br = await fs.readFile(`${file}.br`);
    const gz = await fs.readFile(`${file}.gz`);

    assert.equal(zlib.brotliDecompressSync(br).toString(), SCRIPT);
    assert.equal(zlib.gunzipSync(gz).toString(), SCRIPT);
    assert.ok(br.length < SCRIPT.length / 10);
  });

  it('skips files too small to gain anything', async () => {
    await assert.rejects(fs.access(path.join(dir, 'tiny.css.br')));
  });

  it('skips images, which are already compressed', async () => {
    await assert.rejects(fs.access(path.join(dir, 'map.webp.br')));
  });

  it('reports what it compressed', () => {
    assert.deepEqual(compressed, [path.join('assets', 'index.js')]);
  });
});
