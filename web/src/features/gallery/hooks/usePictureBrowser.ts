import { useState } from 'react';
import {
  mapPictures,
  wrapIndex,
  type MapEntry,
  type Picture,
} from '../model/catalog.ts';

interface PictureBrowser {
  pictures: Picture[];
  several: boolean;
  position: number;
  index: number;
  picture: Picture;
  moved: boolean;
  pictureAt: (position: number) => Picture;
  showPrevious: () => void;
  showNext: () => void;
  showPicture: (index: number) => void;
}

function usePictureBrowser(map: MapEntry): PictureBrowser {
  const [position, setPosition] = useState(0);
  const [moved, setMoved] = useState(false);

  const pictures = mapPictures(map);
  const index = wrapIndex(position, pictures.length);

  function pictureAt(at: number): Picture {
    return pictures[wrapIndex(at, pictures.length)];
  }

  function move(by: number) {
    if (by !== 0) {
      setPosition(position + by);
      setMoved(true);
    }
  }

  return {
    pictures,
    several: pictures.length > 1,
    position,
    index,
    picture: pictures[index],
    moved,
    pictureAt,
    showPrevious: () => move(-1),
    showNext: () => move(1),
    showPicture: (next) => move(next - index),
  };
}

export { usePictureBrowser };
export type { PictureBrowser };
