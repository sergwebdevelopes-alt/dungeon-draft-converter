import {
  collectionPageText,
  mapPageName,
  mapPageTitle,
  type PageText,
} from '../../../contracts/site-pages.ts';
import { slugify } from '../domain/map-slugs.ts';
import { mapPageDescription } from '../domain/map-page-description.ts';
import type { GalleryStores } from '../ports/gallery-stores.ts';
import { toMapEntry } from './map-entry.ts';

const SUMMARY_LENGTH = 155;
const MAPS_PATH = '/maps';
const NO_COLLECTION = 'other';

interface MapPage extends PageText {
  name: string;
  path: string;
  imageUrl: string;
  imageAlt: string;
  patreonUrl: string;
  publishedAt: string;
}

interface MapLink {
  path: string;
  publishedAt: string;
}

interface MapLinkSource extends AddressedMap {
  publishedAt: string;
}

interface CollectionPage extends PageText {
  path: string;
}

interface AddressedMap {
  slug: string;
  tags: string[];
}

type FindMapPage = (slug: string) => Promise<MapPage | null>;
type FindCollectionPage = (slug: string) => Promise<CollectionPage | null>;
type ListMapLinks = () => Promise<MapLink[]>;

function collectionPagePath(collection: string): string {
  return `${MAPS_PATH}/${slugify(collection)}`;
}

function mapPagePath({ slug, tags }: AddressedMap): string {
  const collection = tags.length > 0 ? slugify(tags[0]) : NO_COLLECTION;

  return `${MAPS_PATH}/${collection}/${encodeURIComponent(slug)}`;
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
      path: mapPagePath(map),
      description: mapPageDescription(entry, SUMMARY_LENGTH),
      imageUrl: entry.images.view,
      imageAlt: mapPageName(entry),
      patreonUrl: map.patreonUrl,
      publishedAt: map.publishedAt,
    };
  };
}

function createFindCollectionPage(
  stores: GalleryStores | undefined,
): FindCollectionPage {
  return async (slug) => {
    const collections = stores ? await stores.maps.listTags() : [];
    const collection = collections.find((name) => slugify(name) === slug);

    return collection
      ? {
          ...collectionPageText(collection),
          path: collectionPagePath(collection),
        }
      : null;
  };
}

function collectionLinks(maps: MapLinkSource[]): MapLink[] {
  const newest = new Map<string, string>();
  for (const map of maps) {
    for (const collection of map.tags) {
      const known = newest.get(collection);
      if (!known || map.publishedAt > known) {
        newest.set(collection, map.publishedAt);
      }
    }
  }

  return [...newest].map(([collection, publishedAt]) => ({
    path: collectionPagePath(collection),
    publishedAt,
  }));
}

function createListMapLinks(stores: GalleryStores | undefined): ListMapLinks {
  return async () => {
    const maps = stores ? await stores.maps.listMaps() : [];

    return [
      ...collectionLinks(maps),
      ...maps.map((map) => ({
        path: mapPagePath(map),
        publishedAt: map.publishedAt,
      })),
    ];
  };
}

export {
  collectionPagePath,
  createFindCollectionPage,
  createFindMapPage,
  createListMapLinks,
  mapPagePath,
};
export type {
  CollectionPage,
  FindCollectionPage,
  FindMapPage,
  ListMapLinks,
  MapLink,
  MapPage,
};
