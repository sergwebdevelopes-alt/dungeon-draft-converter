import type { RenderMapImages } from '../ports/map-image-renderer.ts';
import type { FetchMapImage } from '../ports/map-image-source.ts';
import { messageOf } from '../../../shared/utils/error-message.ts';
import type { ImageStore } from '../ports/image-storage.ts';
import { IMAGE_NAMES, imageKey } from '../domain/map-image-keys.ts';
import type { MapRecord } from '../domain/map-record.ts';

interface MapImagesDeps {
  fetchImage: FetchMapImage;
  images: ImageStore;
  render: RenderMapImages;
  signal?: AbortSignal;
}

interface Prepared {
  map: MapRecord | null;
  failed: boolean;
}

interface MapImages {
  prepare(map: MapRecord, previous?: MapRecord): Promise<Prepared>;
}

function createMapImages({
  fetchImage,
  images,
  render,
  signal,
}: MapImagesDeps): MapImages {
  async function hasImages(map: MapRecord): Promise<boolean> {
    for (const name of IMAGE_NAMES) {
      if (!(await images.has(imageKey(map, name)))) {
        return false;
      }
    }

    return true;
  }

  async function renderImages(map: MapRecord): Promise<void> {
    const original = await fetchImage(map.image.url, signal);
    const rendered = await render(original);

    for (const name of IMAGE_NAMES) {
      await images.put(imageKey(map, name), rendered[name]);
    }
  }

  return {
    async prepare(map, previous) {
      if (await hasImages(map)) {
        return { map, failed: false };
      }

      try {
        await renderImages(map);
        return { map, failed: false };
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }
        console.error(
          `Gallery images for post ${map.postId} failed: ${messageOf(error)}`,
        );
        return { map: previous ?? null, failed: true };
      }
    },
  };
}

export { createMapImages };
export type { MapImages, Prepared };
