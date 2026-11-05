import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectionChips, collectionName } from './collections.ts';

describe('collectionName', () => {
  it('drops bracketed notes like "[In Progress]" and "(WIP)"', () => {
    assert.equal(
      collectionName('Curse of Strahd [In Progress]'),
      'Curse of Strahd',
    );
    assert.equal(collectionName('Waterdeep (WIP)'), 'Waterdeep');
    assert.equal(collectionName('[New] Hand Drawn Maps'), 'Hand Drawn Maps');
  });

  it('tidies spaces and keeps names without notes as they are', () => {
    assert.equal(collectionName('  Original   Content '), 'Original Content');
    assert.equal(collectionName('Original Content'), 'Original Content');
  });
});

describe('collectionChips', () => {
  it('keeps each collection once, ignoring case and notes', () => {
    assert.deepEqual(
      collectionChips([
        'Curse of Strahd [In Progress]',
        'curse of strahd',
        'Original Content',
      ]),
      ['Curse of Strahd', 'Original Content'],
    );
  });

  it('skips collections whose name is only a note or empty', () => {
    assert.deepEqual(collectionChips(['[In Progress]', '', 'Waterdeep']), [
      'Waterdeep',
    ]);
  });
});
