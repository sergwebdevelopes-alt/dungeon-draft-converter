import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  NOT_FOUND_PAGE,
  SITE_PAGES,
  collectionPageText,
  mapCollection,
  mapPageName,
  mapPageTitle,
  pageTitle,
} from './contracts/site-pages.ts';

describe('SITE_PAGES', () => {
  it('gives every page a title and a description that fit a search result', () => {
    for (const page of [...Object.values(SITE_PAGES), NOT_FOUND_PAGE]) {
      assert.ok(page.title.length <= 60, page.title);
      assert.ok(page.description.length <= 155, page.description);
      assert.ok(page.title.endsWith(' · Lair of Artificer'), page.title);
    }
  });

  it('names what each page is for in the words people search with', () => {
    assert.match(SITE_PAGES['/'].title, /D&D Battle Maps/);
    assert.match(SITE_PAGES['/maps'].title, /Battle Map Gallery/);
    assert.match(SITE_PAGES['/converter'].title, /dd2vtt Converter/);
  });
});

describe('collectionPageText', () => {
  it('names the collection as battle maps and describes it within a search result', () => {
    const text = collectionPageText('Curse of Strahd');

    assert.equal(text.title, 'Curse of Strahd Battle Maps · Lair of Artificer');
    assert.match(text.description, /from the Curse of Strahd collection/);
    assert.ok(text.description.length <= 155, text.description);
  });

  it('leaves a name that already says maps as it is', () => {
    assert.equal(
      collectionPageText('Hand Drawn Maps').title,
      'Hand Drawn Maps · Lair of Artificer',
    );
  });
});

describe('pageTitle', () => {
  it('puts the page name before the site name', () => {
    assert.equal(pageTitle('Maps'), 'Maps · Lair of Artificer');
  });
});

describe('mapCollection', () => {
  it('picks the first collection that says what the map is for', () => {
    assert.equal(
      mapCollection({ title: 'Inn', tags: ['Original Content', 'Waterdeep'] }),
      'Waterdeep',
    );
    assert.equal(
      mapCollection({ title: 'Inn', tags: ['Original Content'] }),
      null,
    );
    assert.equal(mapCollection({ title: 'Inn', tags: [] }), null);
  });
});

describe('mapPageName', () => {
  it('calls a map a battle map', () => {
    assert.equal(
      mapPageName({ title: 'Castle Ravenloft', tags: [] }),
      'Castle Ravenloft Battle Map',
    );
  });

  it('adds the part of the map, but not a subtitle that repeats the collection', () => {
    assert.equal(
      mapPageName({
        title: 'Elite Brothel',
        subtitle: 'First Floor',
        tags: ['Waterdeep'],
      }),
      'Elite Brothel, First Floor Battle Map',
    );
    assert.equal(
      mapPageName({
        title: 'Castle Ravenloft',
        subtitle: 'Curse of Strahd',
        tags: ['Curse of Strahd'],
      }),
      'Castle Ravenloft Battle Map',
    );
  });

  it('leaves a name that already says map as it is', () => {
    assert.equal(
      mapPageName({ title: 'Ashfell Island Map', tags: [] }),
      'Ashfell Island Map',
    );
    assert.equal(
      mapPageName({ title: 'Chalet – Complete Maps', tags: [] }),
      'Chalet – Complete Maps',
    );
    assert.equal(
      mapPageName({ title: 'Mapmaker’s Shop', tags: [] }),
      'Mapmaker’s Shop Battle Map',
    );
  });
});

describe('mapPageTitle', () => {
  it('names the map, its collection and the site', () => {
    assert.equal(
      mapPageTitle({
        title: 'Castle Ravenloft',
        subtitle: 'Curse of Strahd',
        tags: ['Curse of Strahd'],
      }),
      'Castle Ravenloft Battle Map · Curse of Strahd · Lair of Artificer',
    );
  });

  it('leaves out a collection that is not a search word', () => {
    assert.equal(
      mapPageTitle({ title: 'City Hospital', tags: ['Original Content'] }),
      'City Hospital Battle Map · Lair of Artificer',
    );
  });
});
