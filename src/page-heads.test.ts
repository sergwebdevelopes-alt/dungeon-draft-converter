import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request } from 'express';
import { NOT_FOUND_PAGE, SITE_PAGES } from './contracts/site-pages.ts';
import type { FindMapPage } from './features/gallery/http/map-page.ts';
import { createPageFor } from './page-heads.ts';

const SITE = 'https://lair.test';
const LINKS = { url: SITE, patreonUrl: 'https://www.patreon.com/cw/Lair' };

const SITE_IMAGE = {
  url: 'https://lair.test/og-image.jpg',
  alt: 'Lair of Artificer: battle maps for epic adventures',
  width: 1200,
  height: 630,
};

const looked: unknown[] = [];

const findIceCave: FindMapPage = (slug) => {
  looked.push(slug);
  return Promise.resolve(
    slug === 'ice&cave'
      ? {
          title: 'Ice Cave',
          description: 'A frozen cave.',
          imageUrl: '/maps/1/2/view.webp',
          imageAlt: 'Ice Cave',
          patreonUrl: 'https://www.patreon.com/posts/ice-cave-1',
          publishedAt: '2026-10-12T07:08:36.000Z',
        }
      : null,
  );
};

function request(path: string, query: Record<string, unknown> = {}): Request {
  return { path, query } as unknown as Request;
}

describe('createPageFor', () => {
  const pageFor = createPageFor(LINKS, findIceCave);

  it('gives each site page its own text and canonical address', async () => {
    for (const path of ['/', '/maps', '/converter'] as const) {
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

  it('gives a linked map its title, summary, view image and address', async () => {
    assert.deepEqual(await pageFor(request('/maps', { map: 'ice&cave' })), {
      status: 200,
      head: {
        title: 'Ice Cave · Lair of Artificer',
        description: 'A frozen cave.',
        url: `${SITE}/maps?map=ice%26cave`,
        image: { url: `${SITE}/maps/1/2/view.webp`, alt: 'Ice Cave' },
      },
    });
  });

  it('shows the gallery for an unknown map or an odd map query', async () => {
    const gallery = await pageFor(request('/maps'));

    looked.length = 0;

    for (const map of ['nope', '', ['ice&cave', 'x']]) {
      assert.deepEqual(await pageFor(request('/maps', { map })), gallery);
    }
    assert.deepEqual(looked, ['nope']);
  });

  it('looks for maps only on the gallery page', async () => {
    const page = await pageFor(request('/converter', { map: 'ice&cave' }));

    assert.equal(page.head.title, SITE_PAGES['/converter'].title);
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
      (message, error) => logged.push(`${message} ${(error as Error).message}`),
    );

    assert.deepEqual(
      await failing(request('/maps', { map: 'ice&cave' })),
      await pageFor(request('/maps')),
    );
    assert.deepEqual(logged, [
      'Could not find the map ice&cave for its page head: database down',
    ]);
  });
});
