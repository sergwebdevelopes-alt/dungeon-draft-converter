import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PatreonPost } from '../patreon/patreon-api.ts';
import type { PostDetails } from '../patreon/post-details.ts';
import { foldersToRemove, galleryMaps, syncCounts } from './sync-plan.ts';
import type { MapRecord } from './types.ts';

const RULES = { tag: 'portfolio', genericTags: [] };

function post(id: string, overrides: Partial<PatreonPost> = {}): PatreonPost {
  return {
    id,
    title: `Map ${id}`,
    url: `https://www.patreon.com/posts/${id}`,
    publishedAt: '2026-01-01T00:00:00.000Z',
    isPublic: true,
    ...overrides,
  };
}

function details(id: string, tags = ['portfolio']): PostDetails {
  return {
    postId: id,
    publishedAt: '2026-01-01T00:00:00.000Z',
    tags,
    images: [
      {
        url: `https://cdn.test/${id}`,
        width: 2,
        height: 1,
        mediaId: `m${id}`,
        isMain: true,
      },
    ],
  };
}

function map(
  postId: string,
  mediaId = `m${postId}`,
  overrides: Partial<MapRecord> = {},
): MapRecord {
  return {
    postId,
    slug: `map-${postId}`,
    title: `Map ${postId}`,
    tags: [],
    patreonUrl: `https://www.patreon.com/posts/${postId}`,
    publishedAt: '2026-01-01T00:00:00.000Z',
    image: { url: 'u', width: 2, height: 1, mediaId, isMain: true },
    ...overrides,
  };
}

describe('galleryMaps', () => {
  it('keeps the tagged public posts that have details, in post order', () => {
    const maps = galleryMaps(
      [post('1'), post('2'), post('3', { isPublic: false }), post('4')],
      [details('4'), details('2', ['other']), details('1'), details('3')],
      RULES,
    );

    assert.deepEqual(
      maps.map((m) => m.postId),
      ['1', '4'],
    );
  });
});

describe('foldersToRemove', () => {
  it('lists the image folders no map uses any more', () => {
    assert.deepEqual(
      foldersToRemove(
        [map('1'), map('2'), map('3')],
        [map('1'), map('2', 'new')],
      ),
      ['2/m2', '3/m3'],
    );
  });
});

describe('syncCounts', () => {
  it('counts added, changed and removed maps', () => {
    const previous = [map('1'), map('2'), map('3'), map('5')];
    const next = [
      map('1'),
      map('2', 'm2', { title: 'Renamed' }),
      map('4'),
      map('5', 'new image'),
    ];

    assert.deepEqual(syncCounts(previous, next), {
      added: 1,
      updated: 2,
      removed: 1,
    });
  });

  it('ignores the stored check time and the date format', () => {
    const stored = {
      ...map('1', 'm1', { publishedAt: '2026-01-01T00:00:00.000Z' }),
      checkedAt: '2026-11-04T00:00:00.000Z',
    };

    assert.deepEqual(
      syncCounts(
        [stored],
        [map('1', 'm1', { publishedAt: '2026-01-01T00:00:00.000+00:00' })],
      ),
      { added: 0, updated: 0, removed: 0 },
    );
  });
});
