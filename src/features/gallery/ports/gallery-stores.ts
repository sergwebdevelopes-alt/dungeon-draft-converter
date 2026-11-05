import type { ImageStorage } from './image-storage.ts';
import type { MapRepository } from './map-repository.ts';
import type { PatreonTokenRepository } from './patreon-token-repository.ts';

interface GalleryStores {
  maps: MapRepository;
  images: ImageStorage;
  tokens: PatreonTokenRepository;
}

export type { GalleryStores };
