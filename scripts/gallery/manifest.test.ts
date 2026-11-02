import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseManifest, toCatalog } from './manifest.ts';

function entry(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'frozen-cavern',
    title: 'Frozen Cavern',
    subtitle: 'Ice cave',
    squares: { x: 40, y: 30 },
    tags: ['Underground'],
    patreonUrl: 'https://www.patreon.com/LairofArtificer/posts/frozen',
    sources: { noGrid: 'Ice/NoGrid.png' },
    ...overrides,
  };
}

describe('parseManifest', () => {
  it('reads valid maps', () => {
    assert.deepEqual(parseManifest({ maps: [entry()] }), [entry()]);
  });

  it('needs a maps list', () => {
    assert.throws(() => parseManifest({}), /needs a "maps" list/);
    assert.throws(() => parseManifest([]), /needs a "maps" list/);
  });

  it('names the map and the field that is wrong', () => {
    assert.throws(
      () => parseManifest({ maps: [entry({ title: '' })] }),
      /map "frozen-cavern" needs a "title" text/,
    );
    assert.throws(
      () => parseManifest({ maps: [entry({ squares: { x: 0, y: 3 } })] }),
      /needs "squares"/,
    );
    assert.throws(
      () => parseManifest({ maps: [entry({ tags: [] })] }),
      /needs at least one tag/,
    );
    assert.throws(
      () => parseManifest({ maps: [entry({ patreonUrl: 'http://x' })] }),
      /starting with https/,
    );
    assert.throws(
      () => parseManifest({ maps: [entry({ sources: {} })] }),
      /sources needs a "noGrid" text/,
    );
  });

  it('only allows slugs that are safe in URLs and folder names', () => {
    for (const slug of ['Frozen', '../etc', 'a b', 'a--b']) {
      assert.throws(
        () => parseManifest({ maps: [entry({ slug })] }),
        /use lowercase letters, digits and dashes/,
        slug,
      );
    }
  });

  it('refuses the same slug twice', () => {
    assert.throws(
      () => parseManifest({ maps: [entry(), entry()] }),
      /map "frozen-cavern" appears twice/,
    );
  });
});

describe('toCatalog', () => {
  it('keeps what the site shows and drops the source paths', () => {
    assert.deepEqual(toCatalog([entry({ extra: 'ignored' })]), {
      maps: [
        {
          slug: 'frozen-cavern',
          title: 'Frozen Cavern',
          subtitle: 'Ice cave',
          squares: { x: 40, y: 30 },
          tags: ['Underground'],
          patreonUrl: 'https://www.patreon.com/LairofArtificer/posts/frozen',
        },
      ],
    });
  });
});
