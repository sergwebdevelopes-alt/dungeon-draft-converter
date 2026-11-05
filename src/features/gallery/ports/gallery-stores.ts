import type { ImageStore } from './image-storage.ts';
import type { MapStore } from './map-repository.ts';
import type { TokenStore } from './patreon-token-repository.ts';

interface GalleryStores {
  maps: MapStore;
  images: ImageStore;
  tokens: TokenStore;
}

export type { GalleryStores };
