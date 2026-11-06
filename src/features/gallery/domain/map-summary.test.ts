import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapSummary } from './map-summary.ts';

describe('mapSummary', () => {
  it('turns post HTML into one line of plain text', () => {
    assert.equal(
      mapSummary(
        '<p>A <strong>roaring</strong> waterfall.</p><ul><li>Two levels</li><li>VTT<br>files</li></ul>',
        200,
      ),
      'A roaring waterfall. Two levels VTT files',
    );
  });

  it('decodes entities after removing the tags', () => {
    assert.equal(
      mapSummary(
        '<p>Tom &amp; Jerry&nbsp;&quot;&#39;&#x2014;&lt;b&gt;&apos;&copy;</p>',
        200,
      ),
      `Tom & Jerry "'—<b>'&copy;`,
    );
  });

  it('keeps an entity beyond Unicode as it is', () => {
    assert.equal(mapSummary('A &#x110000; B', 200), 'A &#x110000; B');
  });

  it('cuts a long text at a word and ends it with an ellipsis', () => {
    assert.equal(
      mapSummary('<p>Castle Ravenloft, the largest location.</p>', 20),
      'Castle Ravenloft…',
    );
  });

  it('cuts inside a word when the last space is too early', () => {
    assert.equal(
      mapSummary('A Dungeondraftmapwithlongwords', 10),
      'A Dungeon…',
    );
  });

  it('keeps a text that fits', () => {
    assert.equal(mapSummary('Short.', 6), 'Short.');
    assert.equal(mapSummary('<p> </p>', 10), '');
  });
});
