import {
  mapPageName,
  mapPageTitle,
  type PageText,
} from '../../../contracts/site-pages.ts';
import { mapPageDescription } from '../domain/map-page-description.ts';
import type { GalleryStores } from '../ports/gallery-stores.ts';
import { toMapEntry } from './map-entry.ts';

const SUMMARY_LENGTH = 155;

interface MapPage extends PageText {
  name: string;
  imageUrl: string;
  imageAlt: string;
  patreonUrl: string;
  publishedAt: string;
}

interface MapLink {
  path: string;
  publishedAt: string;
}

type FindMapPage = (slug: string) => Promise<MapPage | null>;
type ListMapLinks = () => Promise<MapLink[]>;

function mapPagePath(slug: string): string {
  return `/maps?map=${encodeURIComponent(slug)}`;
}

function createFindMapPage(stores: GalleryStores | undefined): FindMapPage {
  return async (slug) => {
    const map = stores ? await stores.maps.findMap(slug) : null;
    if (!stores || !map) {
      return null;
    }

    const entry = toMapEntry(map, (key) => stores.images.urlFor(key));
    return {
      title: mapPageTitle(entry),
      name: entry.title,
      description: mapPageDescription(entry, SUMMARY_LENGTH),
      imageUrl: entry.images.view,
      imageAlt: mapPageName(entry),
      patreonUrl: map.patreonUrl,
      publishedAt: map.publishedAt,
    };
  };
}

function createListMapLinks(stores: GalleryStores | undefined): ListMapLinks {
  return async () => {
    const maps = stores ? await stores.maps.listMaps() : [];

    return maps.map((map) => ({
      path: mapPagePath(map.slug),
      publishedAt: map.publishedAt,
    }));
  };
}

export { createFindMapPage, createListMapLinks, mapPagePath };
export type { FindMapPage, ListMapLinks, MapLink, MapPage };
