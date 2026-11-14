import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSitemap } from './sitemap.ts';

const URLSET =
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';

describe('renderSitemap', () => {
  it('lists every address, with a date where it is known', () => {
    assert.equal(
      renderSitemap([
        { url: 'https://lair.test/' },
        {
          url: 'https://lair.test/maps?map=ice-cave',
          lastModified: '2026-10-12T07:08:36.000Z',
        },
      ]),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        URLSET,
        '  <url><loc>https://lair.test/</loc></url>',
        '  <url><loc>https://lair.test/maps?map=ice-cave</loc><lastmod>2026-10-12T07:08:36.000Z</lastmod></url>',
        '</urlset>',
        '',
      ].join('\n'),
    );
  });

  it('lists the pictures of a page inside its entry', () => {
    const xml = renderSitemap([
      {
        url: 'https://lair.test/maps/caves/ice-cave',
        lastModified: '2026-10-12T07:08:36.000Z',
        images: [
          'https://lair.test/maps/1/2/view.webp',
          'https://lair.test/maps/1/3/view.webp?a=1&b=2',
        ],
      },
      { url: 'https://lair.test/maps', images: [] },
    ]);

    assert.ok(
      xml.includes(
        '  <url><loc>https://lair.test/maps/caves/ice-cave</loc><lastmod>2026-10-12T07:08:36.000Z</lastmod>' +
          '<image:image><image:loc>https://lair.test/maps/1/2/view.webp</image:loc></image:image>' +
          '<image:image><image:loc>https://lair.test/maps/1/3/view.webp?a=1&amp;b=2</image:loc></image:image></url>',
      ),
    );
    assert.ok(xml.includes('  <url><loc>https://lair.test/maps</loc></url>'));
  });

  it('escapes characters that XML reserves', () => {
    const xml = renderSitemap([
      { url: `https://lair.test/maps?a=1&b="<'>"`, lastModified: '<now>' },
    ]);

    assert.ok(
      xml.includes(
        '<loc>https://lair.test/maps?a=1&amp;b=&quot;&lt;&apos;&gt;&quot;</loc><lastmod>&lt;now&gt;</lastmod>',
      ),
    );
  });

  it('writes an empty list when there is nothing to list', () => {
    assert.ok(renderSitemap([]).endsWith(`${URLSET}\n</urlset>\n`));
  });
});
