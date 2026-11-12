import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PostImage } from './patreon-post.ts';
import { chooseImages } from './choose-map-image.ts';

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

function ids(images: PostImage[]): string[] {
  return chooseImages(images).map((image) => image.mediaId);
}

describe('chooseImages', () => {
  it('puts the main image of an Image-tab post first', () => {
    assert.deepEqual(
      ids([image('a', 'Map_L2.jpg'), image('b', 'Map_L1.jpg', true)]),
      ['b', 'a'],
    );
  });

  it('otherwise starts with the version without a grid', () => {
    assert.deepEqual(
      ids([image('a', 'Falls_Grid.jpg'), image('b', 'Falls_No-Grid.jpg')])[0],
      'b',
    );
  });

  it('then with any image whose name does not mention a grid', () => {
    assert.deepEqual(
      ids([image('a', 'Falls_Grid.jpg'), image('b', 'Falls_L1.jpg')]),
      ['b', 'a'],
    );
  });

  it('falls back to the first image, and to nothing without images', () => {
    assert.deepEqual(ids([image('a', 'A_Grid.jpg'), image('b')]), ['b', 'a']);
    assert.deepEqual(ids([image('a', 'A_Grid.jpg')]), ['a']);
    assert.deepEqual(ids([]), []);
  });

  it('keeps the other images in the order of the post', () => {
    assert.deepEqual(
      ids([
        image('l2', 'Inn_L2_NoGrid.jpg'),
        image('l1', 'Inn_L1_NoGrid.jpg', true),
        image('roof', 'Inn_Roof_NoGrid.jpg'),
      ]),
      ['l1', 'l2', 'roof'],
    );
  });

  it('leaves out gridded copies when the post has images without a grid', () => {
    assert.deepEqual(
      ids([
        image('l1', 'Inn_L1_NoGrid.jpg'),
        image('l1-grid', 'Inn_L1_Grid.jpg'),
        image('l2', 'Inn_L2_NoGrid.jpg'),
        image('l2-grid', 'Inn_L2_Grid.jpg'),
      ]),
      ['l1', 'l2'],
    );
  });

  it('keeps a gridded main image as the cover', () => {
    assert.deepEqual(
      ids([image('a', 'Map_NoGrid.jpg'), image('b', 'Map_Grid.jpg', true)]),
      ['b', 'a'],
    );
  });
});
