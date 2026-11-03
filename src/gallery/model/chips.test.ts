import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chips } from './chips.ts';

const RULES = {
  tag: 'portfolio',
  genericTags: ['dnd', 'DndMaps', 'dungeondraft'],
};

describe('chips', () => {
  it('drops the gallery tag and generic tags, in any case', () => {
    assert.deepEqual(
      chips(['Portfolio', 'DND', 'dndmaps', 'tavern'], RULES, 'Blue Water Inn'),
      ['Tavern'],
    );
  });

  it('drops tags already in the title', () => {
    assert.deepEqual(
      chips(['Blue Water Inn', 'water', 'barovia'], RULES, 'Blue Water Inn'),
      ['Barovia'],
    );
  });

  it('title-cases lowercase tags but keeps small words and existing capitals', () => {
    assert.deepEqual(
      chips(
        ['curse of strahd', 'Waterdeep City', 'the yawning portal'],
        RULES,
        'Map',
      ),
      ['Curse of Strahd', 'Waterdeep City', 'The Yawning Portal'],
    );
  });

  it('keeps each chip once, ignoring case and spaces', () => {
    assert.deepEqual(
      chips(['curse of strahd', ' Curse of Strahd ', ''], RULES, 'Map'),
      ['Curse of Strahd'],
    );
  });
});
