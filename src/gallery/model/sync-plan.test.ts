import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PatreonPost } from '../patreon/patreon-api.ts';
import type { PostDetails } from '../patreon/post-details.ts';
import { foldersToRemove, galleryMaps } from './sync-plan.ts';
import type { MapRecord } from './types.ts';

function post(id: string, overrides: Partial<PatreonPost> = {}): PatreonPost {
  return {
    id,
    title: `Map ${id}`,
    description: '',
    url: `https://www.patreon.com/posts/${id}`,
    publishedAt: '2026-01-01T00:00:00.000Z',
    isPublic: true,
    ...overrides,
  };
}

function details(id: string, collections = ['Original Content']): PostDetails {
  return {
    postId: id,
    publishedAt: '2026-01-01T00:00:00.000Z',
    collections,
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
    description: '',
    tags: [],
    patreonUrl: `https://www.patreon.com/posts/${postId}`,
    publishedAt: '2026-01-01T00:00:00.000Z',
    image: { url: 'u', width: 2, height: 1, mediaId },
    ...overrides,
  };
}

describe('galleryMaps', () => {
  it('keeps the public posts in a collection that have details, in post order', () => {
    const maps = galleryMaps(
      [post('1'), post('2'), post('3', { isPublic: false }), post('4')],
      [details('4'), details('2', []), details('1'), details('3')],
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
