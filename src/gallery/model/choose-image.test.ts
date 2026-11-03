import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PostImage } from '../patreon/post-details.ts';
import { chooseImage } from './choose-image.ts';

function image(mediaId: string, fileName?: string, isMain = false): PostImage {
  return {
    url: `https://cdn.test/${mediaId}`,
    width: 1,
    height: 1,
    mediaId,
    isMain,
    fileName,
  };
}

describe('chooseImage', () => {
  it('takes the main image of an Image-tab post', () => {
    assert.equal(
      chooseImage([
        image('a', 'Map_NoGrid.jpg'),
        image('b', 'Map_Grid.jpg', true),
      ])?.mediaId,
      'b',
    );
  });

  it('otherwise prefers the version without a grid', () => {
    assert.equal(
      chooseImage([
        image('a', 'Falls_Grid.jpg'),
        image('b', 'Falls_No-Grid.jpg'),
      ])?.mediaId,
      'b',
    );
  });

  it('then any image whose name does not mention a grid', () => {
    assert.equal(
      chooseImage([image('a', 'Falls_Grid.jpg'), image('b', 'Falls_L1.jpg')])
        ?.mediaId,
      'b',
    );
  });

  it('falls back to the first image, and to nothing without images', () => {
    assert.equal(
      chooseImage([image('a', 'A_Grid.jpg'), image('b')])?.mediaId,
      'b',
    );
    assert.equal(chooseImage([image('a', 'A_Grid.jpg')])?.mediaId, 'a');
    assert.equal(chooseImage([]), null);
  });
});
