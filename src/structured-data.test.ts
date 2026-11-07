import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapData, siteData } from './structured-data.ts';

const absolute = (path: string) => new URL(path, 'https://lair.test').href;

const ORGANIZATION = {
  '@type': 'Organization',
  name: 'Lair of Artificer',
  url: 'https://lair.test/',
};

describe('siteData', () => {
  it('names the website and the organization behind it, with its Patreon page', () => {
    assert.deepEqual(siteData(absolute, 'https://www.patreon.com/cw/Lair'), [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Lair of Artificer',
        url: 'https://lair.test/',
      },
      {
        '@context': 'https://schema.org',
        ...ORGANIZATION,
        logo: 'https://lair.test/icon-192.png',
        sameAs: ['https://www.patreon.com/cw/Lair'],
      },
    ]);
  });
});

describe('mapData', () => {
  it('describes the map image, who made it and where to get it', () => {
    const data = mapData(
      absolute,
      {
        title: 'Ice Cave',
        description: 'A frozen cave.',
        imageUrl: '/maps/1/2/view.webp',
        imageAlt: 'Ice Cave',
        patreonUrl: 'https://www.patreon.com/posts/ice-cave-1',
        publishedAt: '2026-10-12T07:08:36.000Z',
      },
      'https://lair.test/maps?map=ice-cave',
    );

    assert.deepEqual(data, [
      {
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        name: 'Ice Cave',
        description: 'A frozen cave.',
        url: 'https://lair.test/maps?map=ice-cave',
        contentUrl: 'https://lair.test/maps/1/2/view.webp',
        datePublished: '2026-10-12T07:08:36.000Z',
        creator: ORGANIZATION,
        creditText: 'Lair of Artificer',
        copyrightNotice: 'Lair of Artificer',
        acquireLicensePage: 'https://www.patreon.com/posts/ice-cave-1',
      },
    ]);
  });
});
