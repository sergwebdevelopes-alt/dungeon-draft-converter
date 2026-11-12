import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PatreonPost } from './patreon-post.ts';
import type { PostDetails, PostImage } from './patreon-post.ts';
import { postToMap } from './post-to-map-record.ts';

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
    description: '<p>A roaring waterfall.</p>',
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
    collections: ['Curse of Strahd [In Progress]'],
    images: [IMAGE],
    ...overrides,
  };
}

describe('postToMap', () => {
  it('turns a public post in a collection into a gallery map', () => {
    assert.deepEqual(postToMap(post(), details()), {
      postId: '166553789',
      slug: 'tser-falls',
      title: 'Tser Falls',
      subtitle: 'Curse of Strahd',
      description: '<p>A roaring waterfall.</p>',
      squares: { x: 60, y: 40 },
      tags: ['Curse of Strahd'],
      patreonUrl:
        'https://www.patreon.com/LairofArtificer/posts/battlemap-tser-166553789',
      publishedAt: '2025-07-01T10:00:00.000+00:00',
      images: [
        {
          url: 'https://cdn.test/falls.jpg',
          width: 8400,
          height: 5600,
          mediaId: '717019350',
        },
      ],
    });
  });

  it('skips posts that are not public, in no collection, without images or without details', () => {
    assert.equal(postToMap(post({ isPublic: false }), details()), null);
    assert.equal(postToMap(post(), details({ collections: [] })), null);
    assert.equal(postToMap(post(), details({ images: [] })), null);
    assert.equal(postToMap(post(), undefined), null);
  });

  it('shows every collection of a post as a chip', () => {
    const map = postToMap(
      post(),
      details({ collections: ['Original Content', 'Hand Drawn Maps'] }),
    );

    assert.deepEqual(map?.tags, ['Original Content', 'Hand Drawn Maps']);
  });

  it('prefers the size in the title over the one in the file name', () => {
    const map = postToMap(
      post({ title: '[Battlemap] Tser Falls [Curse of Strahd] [61x41]' }),
      details(),
    );

    assert.deepEqual(map?.squares, { x: 61, y: 41 });
  });

  it('leaves the size out when neither the title nor the file name has one', () => {
    const map = postToMap(
      post(),
      details({ images: [{ ...IMAGE, fileName: 'TserFalls.jpg' }] }),
    );

    assert.equal(map?.squares, undefined);
    assert.equal(map && 'squares' in map, false);
  });

  it('keeps every image of the post, the chosen one first, without gridded copies', () => {
    const grid = { ...IMAGE, mediaId: 'grid', fileName: 'TserFalls_Grid.jpg' };
    const top = {
      ...IMAGE,
      url: 'https://cdn.test/top.jpg',
      width: 4200,
      height: 2800,
      mediaId: 'top',
      fileName: 'TserFalls_Top_30x20_140px_NoGrid.jpg',
    };

    const map = postToMap(post(), details({ images: [grid, IMAGE, top] }));

    assert.deepEqual(map?.images, [
      {
        url: 'https://cdn.test/falls.jpg',
        width: 8400,
        height: 5600,
        mediaId: '717019350',
      },
      {
        url: 'https://cdn.test/top.jpg',
        width: 4200,
        height: 2800,
        mediaId: 'top',
      },
    ]);
    assert.deepEqual(map?.squares, { x: 60, y: 40 });
  });
});
