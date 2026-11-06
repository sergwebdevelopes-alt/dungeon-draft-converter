import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSitemap } from './sitemap.ts';

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
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url><loc>https://lair.test/</loc></url>',
        '  <url><loc>https://lair.test/maps?map=ice-cave</loc><lastmod>2026-10-12T07:08:36.000Z</lastmod></url>',
        '</urlset>',
        '',
      ].join('\n'),
    );
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
    assert.ok(
      renderSitemap([]).endsWith(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n',
      ),
    );
  });
});
