import type { PageText } from '../../../contracts/site-pages.ts';
import { mapSummary } from '../domain/map-summary.ts';
import type { GalleryStores } from '../ports/gallery-stores.ts';
import { toMapEntry } from './map-entry.ts';

const SUMMARY_LENGTH = 155;

interface MapPage extends PageText {
  imageUrl: string;
  imageAlt: string;
}

type FindMapPage = (slug: string) => Promise<MapPage | null>;

function describe(description: string | undefined, fallback: string): string {
  const summary = description ? mapSummary(description, SUMMARY_LENGTH) : '';
  return summary || fallback;
}

function createFindMapPage(
  stores: GalleryStores | undefined,
  fallbackDescription: string,
): FindMapPage {
  return async (slug) => {
    const map = stores ? await stores.maps.findMap(slug) : null;
    if (!stores || !map) {
      return null;
    }

    const entry = toMapEntry(map, (key) => stores.images.urlFor(key));
    return {
      title: entry.title,
      description: describe(entry.description, fallbackDescription),
      imageUrl: entry.images.view,
      imageAlt: entry.title,
    };
  };
}

export { createFindMapPage };
export type { FindMapPage, MapPage };
