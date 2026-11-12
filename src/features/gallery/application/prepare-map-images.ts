import type { RenderMapImages } from '../ports/map-image-renderer.ts';
import type { FetchMapImage } from '../ports/map-image-source.ts';
import { errorMessage } from '../../../shared/utils/error-message.ts';
import type { ImageStorage } from '../ports/image-storage.ts';
import {
  coverImage,
  imageKey,
  imageNamesFor,
  type ImageName,
} from '../domain/map-image-keys.ts';
import type { MapImage, MapRecord } from '../domain/map-record.ts';

interface MapImagePreparerDeps {
  fetchImage: FetchMapImage;
  images: ImageStorage;
  render: RenderMapImages;
  signal?: AbortSignal;
}

interface PreparedMap {
  map: MapRecord | null;
  failed: boolean;
}

interface MapImagePreparer {
  prepare(map: MapRecord, previous?: MapRecord): Promise<PreparedMap>;
}

function withKnownSize(
  image: MapImage,
  previous: MapRecord | undefined,
): MapImage {
  const known = previous?.images.find(
    (stored) => stored.mediaId === image.mediaId,
  );

  return known ? { ...image, width: known.width, height: known.height } : image;
}

function createMapImagePreparer({
  fetchImage,
  images,
  render,
  signal,
}: MapImagePreparerDeps): MapImagePreparer {
  async function missingNames(
    map: MapRecord,
    image: MapImage,
  ): Promise<ImageName[]> {
    const missing: ImageName[] = [];

    for (const name of imageNamesFor(map, image)) {
      if (!(await images.has(imageKey(map, image, name)))) {
        missing.push(name);
      }
    }

    return missing;
  }

  async function renderImage(
    map: MapRecord,
    image: MapImage,
    names: ImageName[],
  ): Promise<MapImage> {
    const original = await fetchImage(image.url, signal);
    const { width, height, files } = await render(original, names);

    for (const name of names) {
      const data = files[name];
      if (!data) {
        throw new Error(`The ${name} image was not rendered.`);
      }
      await images.put(imageKey(map, image, name), data);
    }

    return { ...image, width, height };
  }

  async function readyImage(
    map: MapRecord,
    image: MapImage,
    previous: MapRecord | undefined,
  ): Promise<MapImage | null> {
    const names = await missingNames(map, image);
    if (names.length === 0) {
      return withKnownSize(image, previous);
    }

    try {
      return await renderImage(map, image, names);
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      console.error(
        `Gallery images for post ${map.postId} failed: ${errorMessage(error)}`,
      );
      return null;
    }
  }

  return {
    async prepare(map, previous) {
      const cover = await readyImage(map, coverImage(map), previous);
      if (!cover) {
        return { map: previous ?? null, failed: true };
      }

      const ready = [cover];
      for (const image of map.images.slice(1)) {
        const prepared = await readyImage(map, image, previous);
        if (prepared) {
          ready.push(prepared);
        }
      }

      return {
        map: { ...map, images: ready },
        failed: ready.length < map.images.length,
      };
    },
  };
}

export { createMapImagePreparer };
export type { MapImagePreparer, PreparedMap };
