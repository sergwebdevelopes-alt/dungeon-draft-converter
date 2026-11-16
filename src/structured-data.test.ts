import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CONVERTER_FAQ } from './contracts/converter-guide.ts';
import { SITE_PAGES } from './contracts/site-pages.ts';
import { converterData, mapData, siteData } from './structured-data.ts';

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
        title: 'Ice Cave Battle Map · Lair of Artificer',
        name: 'Ice Cave',
        path: '/maps/other/ice-cave',
        description: 'A frozen cave.',
        imageUrl: '/maps/1/2/view.webp',
        imageAlt: 'Ice Cave Battle Map',
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

describe('converterData', () => {
  const [app, faq] = converterData(absolute) as [
    Record<string, unknown>,
    { mainEntity: Record<string, unknown>[] },
  ];

  it('describes the converter as a free web app of the site', () => {
    assert.deepEqual(app, {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Dungeondraft Converter',
      url: 'https://lair.test/converter',
      description: SITE_PAGES['/converter'].description,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: ORGANIZATION,
    });
  });

  it('gives every question of the page with its answer', () => {
    assert.equal(faq.mainEntity.length, CONVERTER_FAQ.length);
    assert.deepEqual(faq.mainEntity[0], {
      '@type': 'Question',
      name: CONVERTER_FAQ[0].question,
      acceptedAnswer: { '@type': 'Answer', text: CONVERTER_FAQ[0].answer },
    });
    assert.deepEqual(
      faq.mainEntity.map((entry) => entry.name),
      CONVERTER_FAQ.map((entry) => entry.question),
    );
  });

  it('answers the questions people search for, in plain text', () => {
    const text = CONVERTER_FAQ.map(
      ({ question, answer }) => `${question} ${answer}`,
    ).join(' ');

    for (const words of ['.dd2vtt', 'Foundry VTT', 'Roll20', 'merge', 'JPG']) {
      assert.ok(text.includes(words), words);
    }
    assert.doesNotMatch(text, /<[a-z]/i);
  });
});
