import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toMapEntry } from './map-entry.ts';
import type { MapRecord } from './types.ts';

function map(overrides: Partial<MapRecord> = {}): MapRecord {
  return {
    postId: '166553789',
    slug: 'tser-falls',
    title: 'Tser Falls',
    subtitle: 'Curse of Strahd',
    description: '<p>A <strong>roaring</strong> waterfall.</p>',
    tags: ['Barovia'],
    squares: { x: 60, y: 40 },
    patreonUrl: 'https://www.patreon.com/posts/tser-166553789',
    publishedAt: '2025-07-01T10:00:00.000Z',
    image: {
      url: 'https://cdn.test/falls.jpg',
      width: 8400,
      height: 5600,
      mediaId: '717019350',
    },
    ...overrides,
  };
}

const urlFor = (key: string) => `/maps/${key}`;

describe('toMapEntry', () => {
  it('gives the gallery what it shows, with image URLs', () => {
    assert.deepEqual(toMapEntry(map(), urlFor), {
      slug: 'tser-falls',
      title: 'Tser Falls',
      subtitle: 'Curse of Strahd',
      description: '<p>A <strong>roaring</strong> waterfall.</p>',
      tags: ['Barovia'],
      squares: { x: 60, y: 40 },
      width: 8400,
      height: 5600,
      patreonUrl: 'https://www.patreon.com/posts/tser-166553789',
      images: {
        card: '/maps/166553789/717019350/card.webp',
        view: '/maps/166553789/717019350/view.webp',
        backdrop: '/maps/166553789/717019350/backdrop.webp',
      },
    });
  });

  it('leaves out a missing subtitle, size and description', () => {
    const entry = toMapEntry(
      map({ subtitle: undefined, squares: undefined, description: '' }),
      urlFor,
    );

    assert.equal('subtitle' in entry, false);
    assert.equal('squares' in entry, false);
    assert.equal('description' in entry, false);
  });
});
