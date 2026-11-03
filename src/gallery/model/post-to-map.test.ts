import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PatreonPost } from '../patreon/patreon-api.ts';
import type { PostDetails, PostImage } from '../patreon/post-details.ts';
import { postToMap } from './post-to-map.ts';
import type { GalleryRules } from './types.ts';

const RULES: GalleryRules = {
  tag: 'portfolio',
  genericTags: ['dnd', 'dndmaps', 'dungeondraft'],
};

const IMAGE: PostImage = {
  url: 'https://cdn.test/falls.jpg',
  width: 8400,
  height: 5600,
  mediaId: '717019350',
  isMain: false,
  fileName: 'TserFalls_60x40_140px_NoGrid.jpg',
};

function post(overrides: Partial<PatreonPost> = {}): PatreonPost {
  return {
    id: '166553789',
    title: '[Battlemap] Tser Falls [Curse of Strahd]',
    url: 'https://www.patreon.com/LairofArtificer/posts/battlemap-tser-166553789',
    publishedAt: '2025-07-01T10:00:00.000+00:00',
    isPublic: true,
    ...overrides,
  };
}

function details(overrides: Partial<PostDetails> = {}): PostDetails {
  return {
    postId: '166553789',
    publishedAt: '2025-07-01T10:00:00.000+00:00',
    tags: ['barovia', 'curse of strahd', 'dnd', 'tser falls', 'portfolio'],
    images: [IMAGE],
    ...overrides,
  };
}

describe('postToMap', () => {
  it('turns a tagged public post into a gallery map', () => {
    assert.deepEqual(postToMap(post(), details(), RULES), {
      postId: '166553789',
      slug: 'tser-falls',
      title: 'Tser Falls',
      subtitle: 'Curse of Strahd',
      squares: { x: 60, y: 40 },
      tags: ['Barovia', 'Curse of Strahd'],
      patreonUrl:
        'https://www.patreon.com/LairofArtificer/posts/battlemap-tser-166553789',
      publishedAt: '2025-07-01T10:00:00.000+00:00',
      image: IMAGE,
    });
  });

  it('skips posts that are not public, untagged, without images or without details', () => {
    assert.equal(postToMap(post({ isPublic: false }), details(), RULES), null);
    assert.equal(
      postToMap(post(), details({ tags: ['curse of strahd'] }), RULES),
      null,
    );
    assert.equal(postToMap(post(), details({ images: [] }), RULES), null);
    assert.equal(postToMap(post(), undefined, RULES), null);
  });

  it('matches the gallery tag in any case and with spaces', () => {
    assert.notEqual(
      postToMap(post(), details({ tags: [' Portfolio '] }), RULES),
      null,
    );
  });

  it('prefers the size in the title over the one in the file name', () => {
    const map = postToMap(
      post({ title: '[Battlemap] Tser Falls [Curse of Strahd] [61x41]' }),
      details(),
      RULES,
    );

    assert.deepEqual(map?.squares, { x: 61, y: 41 });
  });

  it('leaves the size out when neither the title nor the file name has one', () => {
    const map = postToMap(
      post(),
      details({ images: [{ ...IMAGE, fileName: 'TserFalls.jpg' }] }),
      RULES,
    );

    assert.equal(map?.squares, undefined);
    assert.equal(map && 'squares' in map, false);
  });

  it('uses the chosen image when the post has several', () => {
    const grid = { ...IMAGE, mediaId: 'grid', fileName: 'TserFalls_Grid.jpg' };

    const map = postToMap(post(), details({ images: [grid, IMAGE] }), RULES);

    assert.equal(map?.image.mediaId, '717019350');
  });
});
