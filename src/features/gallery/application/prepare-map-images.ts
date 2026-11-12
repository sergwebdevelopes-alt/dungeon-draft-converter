import type { RenderMapImages } from '../ports/map-image-renderer.ts';
import type { FetchMapImage } from '../ports/map-image-source.ts';
import { messageOf } from '../../../shared/utils/error-message.ts';
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
  ): Promise<void> {
    const original = await fetchImage(image.url, signal);
    const rendered = await render(original, names);

    for (const name of names) {
      const data = rendered[name];
      if (!data) {
        throw new Error(`The ${name} image was not rendered.`);
      }
      await images.put(imageKey(map, image, name), data);
    }
  }

  async function isReady(map: MapRecord, image: MapImage): Promise<boolean> {
    const names = await missingNames(map, image);
    if (names.length === 0) {
      return true;
    }

    try {
      await renderImage(map, image, names);
      return true;
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      console.error(
        `Gallery images for post ${map.postId} failed: ${messageOf(error)}`,
      );
      return false;
    }
  }

  return {
    async prepare(map, previous) {
      const cover = coverImage(map);
      if (!(await isReady(map, cover))) {
        return { map: previous ?? null, failed: true };
      }

      const ready = [cover];
      for (const image of map.images.slice(1)) {
        if (await isReady(map, image)) {
          ready.push(image);
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
