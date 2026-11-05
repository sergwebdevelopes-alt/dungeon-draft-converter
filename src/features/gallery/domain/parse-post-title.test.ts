import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTitle, sizeFromFileName } from './parse-post-title.ts';

describe('parseTitle', () => {
  it('reads the name, adventure and size from the bracket style', () => {
    assert.deepEqual(
      parseTitle(
        "[Battlemap] Vallaki Burgomaster's Mansion [Curse of Strahd] [34x16]",
      ),
      {
        title: "Vallaki Burgomaster's Mansion",
        subtitle: 'Curse of Strahd',
        squares: { x: 34, y: 16 },
      },
    );
  });

  it('reads the pipe style, using the second part as the subtitle', () => {
    assert.deepEqual(parseTitle('Yawning Portal 1 floor | Battlemap'), {
      title: 'Yawning Portal 1 floor',
    });
    assert.deepEqual(
      parseTitle('Field of Triumph | Interior spaces | Battlemap'),
      { title: 'Field of Triumph', subtitle: 'Interior spaces' },
    );
  });

  it('reads parentheses as the subtitle and a size without brackets', () => {
    assert.deepEqual(
      parseTitle("Bildrath's Mercantile (Curse of Strahd) 18x22"),
      {
        title: "Bildrath's Mercantile",
        subtitle: 'Curse of Strahd',
        squares: { x: 18, y: 22 },
      },
    );
  });

  it('drops the word Battlemap wherever it stands', () => {
    assert.deepEqual(parseTitle('Small Fortress Battlemap'), {
      title: 'Small Fortress',
    });
    assert.deepEqual(parseTitle('The Execution Square Battlemap 32x24'), {
      title: 'The Execution Square',
      squares: { x: 32, y: 24 },
    });
  });

  it('closes the gap the word Battlemap leaves before punctuation', () => {
    assert.deepEqual(
      parseTitle(
        'Curse of Strahd Begins! Free Battlemap: The Gates of Barovia [40x30]',
      ),
      {
        title: 'Curse of Strahd Begins! Free: The Gates of Barovia',
        squares: { x: 40, y: 30 },
      },
    );
    assert.equal(parseTitle('Ruins Battlemap, Night').title, 'Ruins, Night');
  });

  it('accepts a size with spaces or a multiplication sign', () => {
    assert.deepEqual(parseTitle('Cave [ 20 × 30 ]').squares, { x: 20, y: 30 });
  });

  it('keeps an ordinary title as it is, trimming stray punctuation', () => {
    assert.deepEqual(parseTitle('  Chalet Brantifax – 1st Floor Map – '), {
      title: 'Chalet Brantifax – 1st Floor Map',
    });
  });

  it('uses a bracket as the title when nothing else is left', () => {
    assert.deepEqual(parseTitle('[Battlemap] [Tser Pool] [20x30]'), {
      title: 'Tser Pool',
      squares: { x: 20, y: 30 },
    });
  });
});

describe('sizeFromFileName', () => {
  it('reads the size between underscores', () => {
    assert.deepEqual(sizeFromFileName('TserFalls_60x40_140px_NoGrid.jpg'), {
      x: 60,
      y: 40,
    });
  });

  it('gives nothing without a size or a name', () => {
    assert.equal(sizeFromFileName('TserFalls_NoGrid.jpg'), undefined);
    assert.equal(sizeFromFileName(undefined), undefined);
  });
});
