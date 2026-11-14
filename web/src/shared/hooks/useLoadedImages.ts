import { useEffect, useRef, useState } from 'react';

interface LoadingImage {
  addEventListener(type: 'load', listener: () => void): void;
  decode?: () => Promise<void>;
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
  const kept = useRef(new Map<string, LoadingImage>());
  const wanted = urls.join(' ');

  useEffect(() => {
    function markLoaded(url: string) {
      setLoaded((before) => new Set(before).add(url));
    }

    async function markWhenDecoded(image: LoadingImage, url: string) {
      try {
        await image.decode?.();
      } catch {
        return;
      }
      markLoaded(url);
    }

    for (const url of wanted.split(' ').filter(Boolean)) {
      const image = createImage();
      kept.current.set(url, image);
      image.addEventListener('load', () => {
        if (image.decode) {
          void markWhenDecoded(image, url);
        } else {
          markLoaded(url);
        }
      });
      image.src = url;
    }
  }, [wanted, createImage]);

  return loaded;
}

export { useLoadedImages };
export type { LoadingImage };
