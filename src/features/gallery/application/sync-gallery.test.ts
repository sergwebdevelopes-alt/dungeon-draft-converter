import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RenderedMapImages } from '../ports/map-image-renderer.ts';
import type { FetchMapImage } from '../ports/map-image-source.ts';
import type { ImageStorage } from '../ports/image-storage.ts';
import type { MapRepository, StoredMap } from '../ports/map-repository.ts';
import type { MapRecord } from '../domain/map-record.ts';
import type { PatreonPosts } from '../ports/patreon-posts.ts';
import type { PatreonPost } from '../domain/patreon-post.ts';
import type { PatreonPostDetails } from '../ports/patreon-post-details.ts';
import type { PostDetails } from '../domain/patreon-post.ts';
import { createGallerySync, type GallerySyncLogEntry } from './sync-gallery.ts';

interface FakePatreon {
  posts: PatreonPost[];
  details: PostDetails[];
  error?: Error;
}

function post(id: string, title = `Map ${id}`): PatreonPost {
  return {
    id,
    title,
    description: '',
    url: `https://www.patreon.com/posts/${id}`,
    publishedAt: `2026-01-0${id}T00:00:00.000Z`,
    isPublic: true,
  };
}

function details(
  id: string,
  mediaId = `m${id}`,
  collections = ['Original Content'],
): PostDetails {
  return {
    postId: id,
    publishedAt: `2026-01-0${id}T00:00:00.000Z`,
    collections,
    images: [
      {
        url: `https://cdn.test/${mediaId}`,
        width: 2000,
        height: 1000,
        mediaId,
        isMain: true,
      },
    ],
  };
}

function fakePatreon(state: FakePatreon) {
  const patreon: PatreonPosts = {
    listPosts: () =>
      state.error ? Promise.reject(state.error) : Promise.resolve(state.posts),
  };
  const source: PatreonPostDetails = {
    listDetails: () => Promise.resolve(state.details),
    details: () => Promise.resolve(null),
  };

  return { patreon, source };
}

function fakeImageSource(broken: Set<string>) {
  const downloads: string[] = [];
  const fetchImage: FetchMapImage = (url) => {
    downloads.push(url);
    return broken.has(url)
      ? Promise.reject(new Error('Gone.'))
      : Promise.resolve(Buffer.from(url));
  };

  return { fetchImage, downloads };
}

function comparable(map: MapRecord): string {
  return JSON.stringify({ ...map, checkedAt: undefined });
}

function fakeMapStore() {
  let stored: StoredMap[] = [];
  const store: MapRepository = {
    listMaps: () => Promise.resolve(stored),
    replaceMaps(maps: MapRecord[]) {
      const before = new Map(
        stored.map((map) => [map.postId, comparable(map)]),
      );
      const kept = new Set(maps.map((map) => map.postId));
      const counts = {
        added: maps.filter((map) => !before.has(map.postId)).length,
        updated: maps.filter(
          (map) =>
            before.has(map.postId) &&
            before.get(map.postId) !== comparable(map),
        ).length,
        removed: stored.filter((map) => !kept.has(map.postId)).length,
      };

      stored = maps.map((map) => ({ ...map, checkedAt: 'now' }));
      return Promise.resolve(counts);
    },
  };

  return { store, stored: () => stored };
}

function fakeImageStore() {
  const files = new Map<string, Buffer>();
  const images: ImageStorage = {
    has: (key) => Promise.resolve(files.has(key)),
    put(key, data) {
      files.set(key, data);
      return Promise.resolve();
    },
    removeFolder(prefix) {
      for (const key of files.keys()) {
        if (key.startsWith(`${prefix}/`)) {
          files.delete(key);
        }
      }
      return Promise.resolve();
    },
    urlFor: (key) => `/maps/${key}`,
  };

  return { images, files };
}

function render(original: Buffer): Promise<RenderedMapImages> {
  return Promise.resolve({
    card: Buffer.from(`card of ${original.toString()}`),
    view: Buffer.from(`view of ${original.toString()}`),
    backdrop: Buffer.from(`backdrop of ${original.toString()}`),
  });
}

function setUp(state: FakePatreon, signal?: AbortSignal) {
  const { patreon, source } = fakePatreon(state);
  const broken = new Set<string>();
  const { fetchImage, downloads } = fakeImageSource(broken);
  const maps = fakeMapStore();
  const { images, files } = fakeImageStore();
  const logs: GallerySyncLogEntry[] = [];
  const sync = createGallerySync({
    patreon,
    details: source,
    fetchImage,
    maps: maps.store,
    images,
    render,
    log: (entry) => logs.push(entry),
    signal,
    now: () => 0,
  });

  return { sync, broken, downloads, maps, files, logs };
}

function folders(files: Map<string, Buffer>): string[] {
  return [
    ...new Set([...files.keys()].map((key) => key.split('/', 2).join('/'))),
  ].sort();
}

describe('createGallerySync', () => {
  it('adds the posts in a collection with their images and logs the result', async () => {
    const state = {
      posts: [post('1'), post('2'), post('3')],
      details: [details('1'), details('2', 'm2', []), details('3')],
    };
    const { sync, maps, files, logs } = setUp(state);

    await sync.run();

    assert.deepEqual(
      maps.stored().map((map) => map.slug),
      ['map-1', 'map-3'],
    );
    assert.deepEqual(folders(files), ['1/m1', '3/m3']);
    assert.equal(
      files.get('1/m1/card.webp')?.toString(),
      'card of https://cdn.test/m1',
    );
    assert.deepEqual(logs, [
      {
        event: 'gallery-sync',
        result: 'ok',
        posts: 3,
        maps: 2,
        failed: 0,
        added: 2,
        updated: 0,
        removed: 0,
        tookMs: 0,
      },
    ]);
  });

  it('does not download an image again while it is unchanged and stored', async () => {
    const state = { posts: [post('1')], details: [details('1')] };
    const { sync, downloads, files, logs } = setUp(state);
    await sync.run();

    state.posts = [post('1', 'Renamed')];
    await sync.run();
    assert.equal(downloads.length, 1);
    assert.equal(logs[1].updated, 1);

    files.delete('1/m1/view.webp');
    await sync.run();
    assert.equal(downloads.length, 2);
    assert.ok(files.has('1/m1/view.webp'));
  });

  it('renders a new image and removes the old one', async () => {
    const state = { posts: [post('1')], details: [details('1')] };
    const { sync, files } = setUp(state);
    await sync.run();

    state.details = [details('1', 'new')];
    await sync.run();

    assert.deepEqual(folders(files), ['1/new']);
  });

  it('removes maps and images of posts that left their collection', async () => {
    const state = {
      posts: [post('1'), post('2')],
      details: [details('1'), details('2')],
    };
    const { sync, maps, files, logs } = setUp(state);
    await sync.run();

    state.details = [details('1'), details('2', 'm2', [])];
    await sync.run();

    assert.deepEqual(
      maps.stored().map((map) => map.postId),
      ['1'],
    );
    assert.deepEqual(folders(files), ['1/m1']);
    assert.equal(logs[1].removed, 1);
  });

  it('keeps the previous version of a map whose new image fails', async () => {
    const state = {
      posts: [post('1'), post('2')],
      details: [details('1')],
    };
    const { sync, broken, maps, files, logs } = setUp(state);
    await sync.run();

    state.details = [details('1', 'broken'), details('2')];
    broken.add('https://cdn.test/broken');
    broken.add('https://cdn.test/m2');
    await sync.run();

    assert.deepEqual(
      maps.stored().map((map) => [map.postId, map.image.mediaId]),
      [['1', 'm1']],
    );
    assert.deepEqual(folders(files), ['1/m1']);
    assert.equal(logs[1].failed, 2);
  });

  it('keeps the gallery when Patreon fails', async () => {
    const state: FakePatreon = { posts: [post('1')], details: [details('1')] };
    const { sync, maps, files, logs } = setUp(state);
    await sync.run();

    state.error = new Error('Blocked.');
    await sync.run();

    assert.equal(maps.stored().length, 1);
    assert.deepEqual(folders(files), ['1/m1']);
    assert.deepEqual(logs[1], {
      event: 'gallery-sync',
      result: 'failed',
      error: 'Blocked.',
      tookMs: 0,
    });
  });

  it('logs a cancelled sync without an error and saves nothing', async () => {
    const state: FakePatreon = {
      posts: [post('1')],
      details: [details('1')],
      error: new DOMException('Stopped.', 'AbortError'),
    };
    const controller = new AbortController();
    controller.abort();
    const { sync, maps, logs } = setUp(state, controller.signal);

    await sync.run();

    assert.deepEqual(maps.stored(), []);
    assert.deepEqual(logs, [
      { event: 'gallery-sync', result: 'cancelled', tookMs: 0 },
    ]);
  });

  it('logs a Patreon timeout as a failed sync with its message', async () => {
    const state: FakePatreon = {
      posts: [post('1')],
      details: [details('1')],
      error: new DOMException('Too slow.', 'TimeoutError'),
    };
    const { sync, maps, logs } = setUp(state);

    await sync.run();

    assert.deepEqual(maps.stored(), []);
    assert.deepEqual(logs, [
      {
        event: 'gallery-sync',
        result: 'failed',
        error: 'Too slow.',
        tookMs: 0,
      },
    ]);
  });

  it('gives maps with the same title their own slugs', async () => {
    const state = {
      posts: [post('1', 'Cave'), post('2', 'Cave')],
      details: [details('1'), details('2')],
    };
    const { sync, maps } = setUp(state);

    await sync.run();

    assert.deepEqual(
      maps
        .stored()
        .map((map) => map.slug)
        .sort(),
      ['cave', 'cave-2'],
    );
  });
});
