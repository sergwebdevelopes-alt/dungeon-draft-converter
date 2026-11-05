import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { ImageStore } from '../ports/image-storage.ts';
import { createLocalImageStore } from './local-image-storage.ts';

async function filesIn(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .sort();
}

describe('createLocalImageStore', () => {
  let dir: string;
  let store: ImageStore;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'images-'));
    store = createLocalImageStore({ dir, baseUrl: '/maps' });
  });

  afterEach(() => fs.rm(dir, { recursive: true, force: true }));

  it('writes an image under its key, creating the folders', async () => {
    await store.put('cave/v1/card.webp', Buffer.from('first'));
    await store.put('cave/v1/card.webp', Buffer.from('second'));

    assert.deepEqual(await filesIn(dir), ['cave/v1/card.webp']);
    assert.equal(
      await fs.readFile(path.join(dir, 'cave/v1/card.webp'), 'utf8'),
      'second',
    );
  });

  it('tells whether an image is stored', async () => {
    await store.put('cave/v1/card.webp', Buffer.from('image'));

    assert.equal(await store.has('cave/v1/card.webp'), true);
    assert.equal(await store.has('cave/v1/view.webp'), false);
    assert.equal(await store.has('cave/v1'), false);
    await assert.rejects(store.has('../escape.webp'), /outside/);
  });

  it('removes one folder and leaves the others', async () => {
    await store.put('cave/v1/card.webp', Buffer.from('old'));
    await store.put('cave/v2/card.webp', Buffer.from('new'));

    await store.removeFolder('cave/v1');
    await store.removeFolder('missing/v1');

    assert.deepEqual(await filesIn(dir), ['cave/v2/card.webp']);
  });

  it('refuses keys outside its folder', async () => {
    for (const key of ['../escape.webp', '/etc/escape.webp', '', '.']) {
      await assert.rejects(store.put(key, Buffer.from('x')), /outside/, key);
      await assert.rejects(store.removeFolder(key), /outside/, key);
    }

    assert.deepEqual(await filesIn(dir), []);
  });

  it('gives the public URL of a key', () => {
    assert.equal(store.urlFor('cave/v1/card.webp'), '/maps/cave/v1/card.webp');
  });
});
