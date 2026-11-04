import { Router } from 'express';
import { toMapEntry, type MapEntry } from '../../gallery/model/map-entry.ts';
import type { GalleryStores } from '../../gallery/setup.ts';

async function listEntries({
  maps,
  images,
}: GalleryStores): Promise<MapEntry[]> {
  const stored = await maps.listMaps();

  return stored.map((map) => toMapEntry(map, (key) => images.urlFor(key)));
}

function mapsRouter(galleryStores: GalleryStores | undefined): Router {
  const router = Router();
  router.get('/maps', async (_req, res) => {
    const maps = galleryStores ? await listEntries(galleryStores) : [];

    res.set('Cache-Control', 'no-cache');
    res.json({ maps });
  });
  return router;
}

export { mapsRouter };
