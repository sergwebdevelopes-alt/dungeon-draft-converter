import { useEffect, useState } from 'react';

interface LoadingImage {
  addEventListener(type: 'load', listener: () => void): void;
  src: string;
}

function browserImage(): LoadingImage {
  return new Image();
}

function useLoadedImages(
  urls: string[],
  createImage: () => LoadingImage = browserImage,
): ReadonlySet<string> {
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(new Set());
  const wanted = urls.join(' ');

  useEffect(() => {
    for (const url of wanted.split(' ').filter(Boolean)) {
      const image = createImage();
      image.addEventListener('load', () => {
        setLoaded((before) => new Set(before).add(url));
      });
      image.src = url;
    }
  }, [wanted, createImage]);

  return loaded;
}

export { useLoadedImages };
export type { LoadingImage };
