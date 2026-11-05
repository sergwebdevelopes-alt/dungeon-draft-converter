import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { GalleryImages } from '../ports/map-image-renderer.ts';
import type { FetchMapImage } from '../ports/map-image-source.ts';
import type { ImageStorage } from '../ports/image-storage.ts';
import { createMapImages } from './prepare-map-images.ts';
import type { MapRecord } from '../domain/map-record.ts';

function map(mediaId = 'm1'): MapRecord {
  return {
    postId: '1',
    slug: 'cave',
    title: 'Cave',
    description: '',
    tags: [],
    patreonUrl: 'https://www.patreon.com/posts/1',
    publishedAt: '2026-01-01T00:00:00.000Z',
    image: {
      url: `https://cdn.test/${mediaId}`,
      width: 2,
      height: 1,
      mediaId,
    },
  };
}

interface Download {
  url: string;
  signal: AbortSignal | undefined;
}

function setUp(answer?: Error, signal?: AbortSignal) {
  const files = new Map<string, Buffer>();
  const downloads: Download[] = [];
  const fetchImage: FetchMapImage = (url, given) => {
    downloads.push({ url, signal: given });
    return answer ? Promise.reject(answer) : Promise.resolve(Buffer.from(url));
  };
  const images: ImageStorage = {
    has: (key) => Promise.resolve(files.has(key)),
    put(key, data) {
      files.set(key, data);
      return Promise.resolve();
    },
    removeFolder: () => Promise.resolve(),
    urlFor: (key) => key,
  };
  const render = (original: Buffer): Promise<GalleryImages> =>
    Promise.resolve({
      card: Buffer.from(`card of ${original.toString()}`),
      view: Buffer.from(`view of ${original.toString()}`),
      backdrop: Buffer.from(`backdrop of ${original.toString()}`),
    });

  return {
    mapImages: createMapImages({ fetchImage, images, render, signal }),
    files,
    downloads,
  };
}

function quietErrors() {
  return mock.method(console, 'error', () => undefined);
}

describe('createMapImages', () => {
  it('renders and stores the images of a map that has none', async () => {
    const { mapImages, files } = setUp();

    assert.deepEqual(await mapImages.prepare(map()), {
      map: map(),
      failed: false,
    });
    assert.deepEqual([...files.keys()].sort(), [
      '1/m1/backdrop.webp',
      '1/m1/card.webp',
      '1/m1/view.webp',
    ]);
    assert.equal(
      files.get('1/m1/view.webp')?.toString(),
      'view of https://cdn.test/m1',
    );
  });

  it('does not download images that are already stored', async () => {
    const { mapImages, downloads } = setUp();
    await mapImages.prepare(map());

    assert.deepEqual(await mapImages.prepare(map()), {
      map: map(),
      failed: false,
    });
    assert.equal(downloads.length, 1);
  });

  it('keeps the previous version when the new image fails', async () => {
    const { mapImages } = setUp(new Error('Gone.'));
    const errors = quietErrors();

    try {
      assert.deepEqual(await mapImages.prepare(map('new'), map()), {
        map: map(),
        failed: true,
      });
      assert.match(String(errors.mock.calls[0].arguments[0]), /post 1.*Gone/);
    } finally {
      errors.mock.restore();
    }
  });

  it('leaves out a new map whose image fails', async () => {
    const { mapImages } = setUp(new Error('Gone.'));
    const errors = quietErrors();

    try {
      assert.deepEqual(await mapImages.prepare(map()), {
        map: null,
        failed: true,
      });
    } finally {
      errors.mock.restore();
    }
  });

  it('counts a timed-out download as a failed image and keeps the previous version', async () => {
    const { mapImages } = setUp(new DOMException('Too slow.', 'TimeoutError'));
    const errors = quietErrors();

    try {
      assert.deepEqual(await mapImages.prepare(map('new'), map()), {
        map: map(),
        failed: true,
      });
    } finally {
      errors.mock.restore();
    }
  });

  it('lets a cancel through instead of counting it as a failed image', async () => {
    const controller = new AbortController();
    controller.abort();
    const { mapImages, downloads } = setUp(
      new DOMException('Stopped.', 'AbortError'),
      controller.signal,
    );

    await assert.rejects(mapImages.prepare(map(), map('old')), {
      name: 'AbortError',
    });
    assert.deepEqual(downloads, [
      { url: 'https://cdn.test/m1', signal: controller.signal },
    ]);
  });
});
