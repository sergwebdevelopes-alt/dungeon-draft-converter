import type { GalleryImages } from '../core/gallery-images.ts';
import {
  isAbortError,
  type HttpClient,
} from '../infrastructure/http-client/http-client.ts';
import { messageOf } from '../shared/utils/error-message.ts';
import type { ImageStore } from './image-store.ts';
import { IMAGE_NAMES, imageKey } from './model/image-keys.ts';
import type { MapRecord } from './model/types.ts';

interface MapImagesDeps {
  http: HttpClient;
  images: ImageStore;
  render: (original: Buffer) => Promise<GalleryImages>;
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
  http,
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
    const original = await http.getBytes(map.image.url, { signal });
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
        if (isAbortError(error)) {
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
