import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { imageFolder, imageKey } from './image-keys.ts';
import type { MapRecord } from './types.ts';

const MAP: MapRecord = {
  postId: '166553789',
  slug: 'tser-falls',
  title: 'Tser Falls',
  tags: [],
  patreonUrl: 'https://www.patreon.com/posts/tser-166553789',
  publishedAt: '2025-07-01T10:00:00.000Z',
  image: {
    url: 'https://cdn.test/falls.jpg',
    width: 8400,
    height: 5600,
    mediaId: '717019350',
    isMain: false,
  },
};

describe('imageKey', () => {
  it('keeps the images of a map in a folder per post and image', () => {
    assert.equal(imageFolder(MAP), '166553789/717019350');
    assert.equal(imageKey(MAP, 'card'), '166553789/717019350/card.webp');
  });
});
