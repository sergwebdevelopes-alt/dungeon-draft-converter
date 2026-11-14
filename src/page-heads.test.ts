import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request } from 'express';
import { NOT_FOUND_PAGE, SITE_PAGES } from './contracts/site-pages.ts';
import type {
  FindCollectionPage,
  FindMapPage,
  MapPage,
} from './features/gallery/http/map-page.ts';
import { createPageFor } from './page-heads.ts';
import { mapData, siteData } from './structured-data.ts';

const SITE = 'https://lair.test';
const LINKS = { url: SITE, patreonUrl: 'https://www.patreon.com/cw/Lair' };

const SITE_IMAGE = {
  url: 'https://lair.test/og-image.jpg',
  alt: 'Lair of Artificer: battle maps for epic adventures',
  width: 1200,
  height: 630,
};

const looked: unknown[] = [];

const ICE_CAVE: MapPage = {
  title: 'Ice Cave Battle Map · Lair of Artificer',
  name: 'Ice Cave',
  path: '/maps/caves/ice%26cave',
  description: 'Ice Cave, a D&D battle map. A frozen cave.',
  imageUrl: '/maps/1/2/view.webp',
  imageAlt: 'Ice Cave Battle Map',
  patreonUrl: 'https://www.patreon.com/posts/ice-cave-1',
  publishedAt: '2026-10-12T07:08:36.000Z',
};

const findIceCave: FindMapPage = (slug) => {
  looked.push(slug);
  return Promise.resolve(slug === 'ice&cave' ? ICE_CAVE : null);
};

const CAVES = {
  title: 'Caves Battle Maps · Lair of Artificer',
  description: 'Maps of caves.',
  path: '/maps/caves',
};

const findCaves: FindCollectionPage = (slug) =>
  Promise.resolve(slug === 'caves' ? CAVES : null);

function request(path: string, query: Record<string, unknown> = {}): Request {
  return { path, query } as unknown as Request;
}

describe('createPageFor', () => {
  const pageFor = createPageFor(LINKS, findIceCave, findCaves);

  it('gives each site page its own text and canonical address', async () => {
    for (const path of ['/maps', '/converter'] as const) {
      assert.deepEqual(await pageFor(request(path)), {
        status: 200,
        head: {
          ...SITE_PAGES[path],
          url: `${SITE}${path}`,
          image: SITE_IMAGE,
          noindex: false,
        },
      });
    }
  });

  it('describes the site on the home page for search engines', async () => {
    assert.deepEqual(await pageFor(request('/')), {
      status: 200,
      head: {
        ...SITE_PAGES['/'],
        url: `${SITE}/`,
        image: SITE_IMAGE,
        noindex: false,
        structuredData: siteData(
          (path) => new URL(path, SITE).href,
          LINKS.patreonUrl,
        ),
      },
    });
  });

  it('gives a map page its title, summary, view image and address', async () => {
    assert.deepEqual(await pageFor(request('/maps/caves/ice%26cave')), {
      status: 200,
      head: {
        title: 'Ice Cave Battle Map · Lair of Artificer',
        description: 'Ice Cave, a D&D battle map. A frozen cave.',
        url: `${SITE}/maps/caves/ice%26cave`,
        image: {
          url: `${SITE}/maps/1/2/view.webp`,
          alt: 'Ice Cave Battle Map',
        },
        structuredData: mapData(
          (path) => new URL(path, SITE).href,
          ICE_CAVE,
          `${SITE}/maps/caves/ice%26cave`,
        ),
      },
    });
  });

  it('finds a map under another collection and points at its own address', async () => {
    const page = await pageFor(request('/maps/waterdeep/ice%26cave'));

    assert.equal(page.status, 200);
    assert.equal(page.head.url, `${SITE}/maps/caves/ice%26cave`);
  });

  it('shows the gallery for the old map query, without looking for a map', async () => {
    const gallery = await pageFor(request('/maps'));

    looked.length = 0;

    assert.deepEqual(
      await pageFor(request('/maps', { map: 'ice&cave' })),
      gallery,
    );
    assert.deepEqual(looked, []);
  });

  it('gives a collection page its own title, description and address', async () => {
    assert.deepEqual(await pageFor(request('/maps/caves')), {
      status: 200,
      head: {
        title: 'Caves Battle Maps · Lair of Artificer',
        description: 'Maps of caves.',
        url: `${SITE}/maps/caves`,
        image: SITE_IMAGE,
        noindex: false,
      },
    });
  });

  it('answers 404 for a collection or a deeper address that does not exist', async () => {
    for (const path of ['/maps/nope', '/maps/caves/ice%26cave/more']) {
      const page = await pageFor(request(path));

      assert.equal(page.status, 404, path);
      assert.equal(page.head.noindex, true, path);
    }
  });

  it('answers 404 for a map that does not exist, and keeps it out of search results', async () => {
    assert.deepEqual(await pageFor(request('/maps/caves/nope')), {
      status: 404,
      head: {
        ...NOT_FOUND_PAGE,
        url: `${SITE}/`,
        image: SITE_IMAGE,
        noindex: true,
      },
    });
  });

  it('looks for maps only under the gallery', async () => {
    looked.length = 0;

    const page = await pageFor(request('/converter/caves/ice%26cave'));

    assert.equal(page.status, 404);
    assert.deepEqual(looked, []);
  });

  it('answers an unknown page with 404 and noindex', async () => {
    assert.deepEqual(await pageFor(request('/nothing')), {
      status: 404,
      head: {
        ...NOT_FOUND_PAGE,
        url: `${SITE}/`,
        image: SITE_IMAGE,
        noindex: true,
      },
    });
  });

  it('shows the gallery and logs the error when the map lookup fails', async () => {
    const logged: string[] = [];
    const failing = createPageFor(
      LINKS,
      () => Promise.reject(new Error('database down')),
      () => Promise.reject(new Error('database down')),
      (message, error) => logged.push(`${message} ${(error as Error).message}`),
    );

    assert.deepEqual(
      await failing(request('/maps/caves/ice%26cave')),
      await pageFor(request('/maps')),
    );
    assert.deepEqual(
      await failing(request('/maps/caves')),
      await pageFor(request('/maps')),
    );
    assert.deepEqual(logged, [
      'Could not find the map ice&cave for its page head: database down',
      'Could not find the collection caves for its page head: database down',
    ]);
  });
});
