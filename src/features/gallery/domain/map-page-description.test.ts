import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapPageDescription } from './map-page-description.ts';

const LENGTH = 155;

describe('mapPageDescription', () => {
  it('leads with the name, the size in squares and the collection, then the post text', () => {
    assert.equal(
      mapPageDescription(
        {
          title: 'Tser Falls',
          tags: ['Curse of Strahd'],
          squares: { x: 60, y: 40 },
          description: '<p>A <strong>roaring</strong> waterfall.</p>',
        },
        LENGTH,
      ),
      'Tser Falls, a 60 × 40 D&D battle map for Curse of Strahd. A roaring waterfall.',
    );
  });

  it('leaves out the size or the collection it does not have', () => {
    assert.equal(
      mapPageDescription({ title: 'Hunting Cabin', tags: [] }, LENGTH),
      'Hunting Cabin, a D&D battle map.',
    );
    assert.equal(
      mapPageDescription(
        {
          title: 'City Sauna',
          tags: ['Original Content'],
          squares: { x: 22, y: 24 },
        },
        LENGTH,
      ),
      'City Sauna, a 22 × 24 D&D battle map.',
    );
  });

  it('cuts the post text so the whole description fits', () => {
    const description = mapPageDescription(
      {
        title: 'Castle Ravenloft',
        tags: ['Curse of Strahd'],
        squares: { x: 128, y: 88 },
        description: `<p>${'One of the largest locations in the campaign. '.repeat(8)}</p>`,
      },
      LENGTH,
    );

    assert.ok(description.length <= LENGTH, String(description.length));
    assert.ok(
      description.startsWith(
        'Castle Ravenloft, a 128 × 88 D&D battle map for Curse of Strahd. One of the largest',
      ),
    );
    assert.ok(description.endsWith('…'));
  });

  it('keeps just the lead when the post has no text or there is too little room for it', () => {
    assert.equal(
      mapPageDescription(
        { title: 'Tser Falls', tags: [], description: '<p> </p>' },
        LENGTH,
      ),
      'Tser Falls, a D&D battle map.',
    );
    assert.equal(
      mapPageDescription(
        { title: 'Tser Falls', tags: [], description: '<p>A waterfall.</p>' },
        'Tser Falls, a D&D battle map.'.length + 30,
      ),
      'Tser Falls, a D&D battle map.',
    );
  });
});
