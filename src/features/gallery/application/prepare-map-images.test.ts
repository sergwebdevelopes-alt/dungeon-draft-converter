import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { ImageName } from '../domain/map-image-keys.ts';
import type { RenderedMapImages } from '../ports/map-image-renderer.ts';
import type { FetchMapImage } from '../ports/map-image-source.ts';
import type { ImageStorage } from '../ports/image-storage.ts';
import { createMapImagePreparer } from './prepare-map-images.ts';
import type { MapImage, MapRecord } from '../domain/map-record.ts';

function image(mediaId: string): MapImage {
  return { url: `https://cdn.test/${mediaId}`, width: 2, height: 1, mediaId };
}

function map(...mediaIds: string[]): MapRecord {
  const ids = mediaIds.length > 0 ? mediaIds : ['m1'];

  return {
    postId: '1',
    slug: 'cave',
    title: 'Cave',
    description: '',
    tags: [],
    patreonUrl: 'https://www.patreon.com/posts/1',
    publishedAt: '2026-01-01T00:00:00.000Z',
    images: ids.map(image),
  };
}

interface Download {
  url: string;
  signal: AbortSignal | undefined;
}

function setUp(answer?: Error, signal?: AbortSignal) {
  const files = new Map<string, Buffer>();
  const downloads: Download[] = [];
  const broken = new Set<string>();
  const rendered: ImageName[][] = [];
  const fetchImage: FetchMapImage = (url, given) => {
    downloads.push({ url, signal: given });
    if (broken.has(url)) {
      return Promise.reject(new Error('Gone.'));
    }
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
  const render = (
    original: Buffer,
    names: ImageName[],
  ): Promise<RenderedMapImages> => {
    rendered.push(names);
    return Promise.resolve(
      Object.fromEntries(
        names.map((name) => [
          name,
          Buffer.from(`${name} of ${original.toString()}`),
        ]),
      ),
    );
  };

  return {
    preparer: createMapImagePreparer({ fetchImage, images, render, signal }),
    files,
    downloads,
    broken,
    rendered,
  };
}

function quietErrors() {
  return mock.method(console, 'error', () => undefined);
}

describe('createMapImagePreparer', () => {
  it('renders and stores the images of a map that has none', async () => {
    const { preparer, files } = setUp();

    assert.deepEqual(await preparer.prepare(map()), {
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
    const { preparer, downloads } = setUp();
    await preparer.prepare(map());

    assert.deepEqual(await preparer.prepare(map()), {
      map: map(),
      failed: false,
    });
    assert.equal(downloads.length, 1);
  });

  it('keeps the previous version when the new image fails', async () => {
    const { preparer } = setUp(new Error('Gone.'));
    const errors = quietErrors();

    try {
      assert.deepEqual(await preparer.prepare(map('new'), map()), {
        map: map(),
        failed: true,
      });
      assert.match(String(errors.mock.calls[0].arguments[0]), /post 1.*Gone/);
    } finally {
      errors.mock.restore();
    }
  });

  it('leaves out a new map whose image fails', async () => {
    const { preparer } = setUp(new Error('Gone.'));
    const errors = quietErrors();

    try {
      assert.deepEqual(await preparer.prepare(map()), {
        map: null,
        failed: true,
      });
    } finally {
      errors.mock.restore();
    }
  });

  it('counts a timed-out download as a failed image and keeps the previous version', async () => {
    const { preparer } = setUp(new DOMException('Too slow.', 'TimeoutError'));
    const errors = quietErrors();

    try {
      assert.deepEqual(await preparer.prepare(map('new'), map()), {
        map: map(),
        failed: true,
      });
    } finally {
      errors.mock.restore();
    }
  });

  it('renders every image of a map: all files for the cover, a view and thumbnail for the others', async () => {
    const { preparer, files, rendered } = setUp();

    assert.deepEqual(await preparer.prepare(map('m1', 'roof')), {
      map: map('m1', 'roof'),
      failed: false,
    });
    assert.deepEqual([...files.keys()].sort(), [
      '1/m1/backdrop.webp',
      '1/m1/card.webp',
      '1/m1/thumb.webp',
      '1/m1/view.webp',
      '1/roof/thumb.webp',
      '1/roof/view.webp',
    ]);
    assert.deepEqual(rendered, [
      ['card', 'view', 'backdrop', 'thumb'],
      ['view', 'thumb'],
    ]);
    assert.equal(
      files.get('1/roof/thumb.webp')?.toString(),
      'thumb of https://cdn.test/roof',
    );
  });

  it('renders only what a map gained: the new image and the cover thumbnail', async () => {
    const { preparer, downloads, rendered } = setUp();
    await preparer.prepare(map('m1'));

    await preparer.prepare(map('m1', 'roof'));

    assert.deepEqual(
      downloads.map(({ url }) => url),
      ['https://cdn.test/m1', 'https://cdn.test/m1', 'https://cdn.test/roof'],
    );
    assert.deepEqual(rendered.slice(1), [['thumb'], ['view', 'thumb']]);
  });

  it('shows a map without an extra image that fails, and counts the failure', async () => {
    const { preparer, broken, files } = setUp();
    broken.add('https://cdn.test/roof');
    const errors = quietErrors();

    try {
      assert.deepEqual(
        await preparer.prepare(map('m1', 'roof', 'cellar'), map('old')),
        { map: map('m1', 'cellar'), failed: true },
      );
      assert.equal(files.has('1/roof/view.webp'), false);
      assert.equal(files.has('1/cellar/view.webp'), true);
      assert.match(String(errors.mock.calls[0].arguments[0]), /post 1.*Gone/);
    } finally {
      errors.mock.restore();
    }
  });

  it('keeps the previous version when the cover of a map with several images fails', async () => {
    const { preparer, broken, downloads } = setUp();
    broken.add('https://cdn.test/new');
    const errors = quietErrors();

    try {
      assert.deepEqual(await preparer.prepare(map('new', 'roof'), map()), {
        map: map(),
        failed: true,
      });
      assert.equal(downloads.length, 1);
    } finally {
      errors.mock.restore();
    }
  });

  it('fails an image whose file the renderer left out', async () => {
    const files = new Map<string, Buffer>();
    const errors = quietErrors();
    const preparer = createMapImagePreparer({
      fetchImage: () => Promise.resolve(Buffer.from('x')),
      images: {
        has: () => Promise.resolve(false),
        put(key, data) {
          files.set(key, data);
          return Promise.resolve();
        },
        removeFolder: () => Promise.resolve(),
        urlFor: (key) => key,
      },
      render: () => Promise.resolve({ card: Buffer.from('card') }),
    });

    try {
      assert.deepEqual(await preparer.prepare(map()), {
        map: null,
        failed: true,
      });
      assert.match(
        String(errors.mock.calls[0].arguments[0]),
        /view image was not rendered/,
      );
    } finally {
      errors.mock.restore();
    }
  });

  it('lets a cancel through instead of counting it as a failed image', async () => {
    const controller = new AbortController();
    controller.abort();
    const { preparer, downloads } = setUp(
      new DOMException('Stopped.', 'AbortError'),
      controller.signal,
    );

    await assert.rejects(preparer.prepare(map(), map('old')), {
      name: 'AbortError',
    });
    assert.deepEqual(downloads, [
      { url: 'https://cdn.test/m1', signal: controller.signal },
    ]);
  });
});
