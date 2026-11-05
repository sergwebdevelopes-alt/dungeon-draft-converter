import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { slugify, withUniqueSlugs } from './slug.ts';
import type { MapRecord } from './types.ts';

function map(postId: string, slug: string, publishedAt: string): MapRecord {
  return {
    postId,
    slug,
    title: slug,
    description: '',
    tags: [],
    patreonUrl: '',
    publishedAt,
    image: { url: '', width: 1, height: 1, mediaId: postId },
  };
}

describe('slugify', () => {
  it('makes URL-safe slugs from titles', () => {
    assert.equal(
      slugify("Vallaki Burgomaster's Mansion"),
      'vallaki-burgomasters-mansion',
    );
    assert.equal(
      slugify('Fistandia’s Mansion – Basement'),
      'fistandias-mansion-basement',
    );
    assert.equal(slugify('Château Été'), 'chateau-ete');
    assert.equal(slugify('  St. Andral’s Church! '), 'st-andrals-church');
  });
});

describe('withUniqueSlugs', () => {
  it('lets the older post keep a shared slug and adds the ID to the newer one', () => {
    const maps = withUniqueSlugs([
      map('2', 'tavern', '2026-02-01'),
      map('1', 'tavern', '2026-01-01'),
    ]);

    assert.deepEqual(
      maps.map((m) => m.slug),
      ['tavern-2', 'tavern'],
    );
  });

  it('keeps unique slugs and the original order', () => {
    const maps = withUniqueSlugs([
      map('2', 'inn', '2026-02-01'),
      map('1', 'cave', '2026-01-01'),
    ]);

    assert.deepEqual(
      maps.map((m) => m.slug),
      ['inn', 'cave'],
    );
  });

  it('gives a map without a usable slug one from its ID', () => {
    assert.equal(
      withUniqueSlugs([map('7', '', '2026-01-01')])[0].slug,
      'map-7',
    );
  });
});
