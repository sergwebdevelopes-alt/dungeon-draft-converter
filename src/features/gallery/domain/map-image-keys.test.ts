import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  coverImage,
  imageFolder,
  imageFolders,
  imageKey,
  imageNamesFor,
} from './map-image-keys.ts';
import type { MapRecord } from './map-record.ts';

const MAP: MapRecord = {
  postId: '166553789',
  slug: 'tser-falls',
  title: 'Tser Falls',
  description: '',
  tags: [],
  patreonUrl: 'https://www.patreon.com/posts/tser-166553789',
  publishedAt: '2025-07-01T10:00:00.000Z',
  images: [
    {
      url: 'https://cdn.test/falls.jpg',
      width: 8400,
      height: 5600,
      mediaId: '717019350',
    },
  ],
};

const [COVER] = MAP.images;
const ROOF = {
  url: 'https://cdn.test/roof.jpg',
  width: 8400,
  height: 5600,
  mediaId: '717019351',
};
const WITH_ROOF: MapRecord = { ...MAP, images: [COVER, ROOF] };

describe('imageKey', () => {
  it('keeps each image of a map in a folder per post and image', () => {
    assert.equal(imageFolder(MAP, COVER), '166553789/717019350');
    assert.equal(
      imageKey(WITH_ROOF, ROOF, 'thumb'),
      '166553789/717019351/thumb.webp',
    );
    assert.deepEqual(imageFolders(WITH_ROOF), [
      '166553789/717019350',
      '166553789/717019351',
    ]);
  });
});

describe('coverImage', () => {
  it('is the first image of the map', () => {
    assert.equal(coverImage(WITH_ROOF), COVER);
  });
});

describe('imageNamesFor', () => {
  it('needs a card, view and backdrop for the only image of a map', () => {
    assert.deepEqual(imageNamesFor(MAP, COVER), ['card', 'view', 'backdrop']);
  });

  it('adds a thumbnail to the cover of a map with several images', () => {
    assert.deepEqual(imageNamesFor(WITH_ROOF, COVER), [
      'card',
      'view',
      'backdrop',
      'thumb',
    ]);
  });

  it('needs only a view and thumbnail for the other images', () => {
    assert.deepEqual(imageNamesFor(WITH_ROOF, ROOF), ['view', 'thumb']);
  });
});
