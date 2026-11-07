import express, { Router, type Request, type RequestHandler } from 'express';
import { GALLERY_PAGE_SIZE, MAX_GALLERY_PAGE_SIZE } from '../../../config.ts';
import { HttpError } from '../../../infrastructure/http-server/http-errors.ts';
import type { GallerySync } from '../application/sync-gallery.ts';
import { isSyncStale, type SyncSchedule } from '../domain/sync-freshness.ts';
import type { GalleryStores } from '../ports/gallery-stores.ts';
import type {
  MapResponse,
  MapsResponse,
} from '../../../contracts/gallery-api.ts';
import type { MapsPageQuery, StoredMap } from '../ports/map-repository.ts';
import { toMapEntry } from './map-entry.ts';
import { parseMapsQuery, type PageSizes } from './parse-maps-query.ts';
import { isValidSignature } from './patreon-webhook-signature.ts';

const MAX_WEBHOOK_BYTES = 1024 * 1024;
const POST_EVENTS = 'posts:';

interface WebhookLogEntry {
  event: 'patreon-webhook';
  trigger: string;
  result: 'sync' | 'ignored';
}

interface GalleryRoutesDeps {
  stores: GalleryStores | undefined;
  sync: GallerySync | undefined;
  webhookSecret: string | undefined;
  syncSchedule: SyncSchedule;
  pageSizes?: PageSizes;
  log?: (entry: WebhookLogEntry) => void;
  now?: () => Date;
}

const EMPTY_PAGE: MapsResponse = { maps: [], total: 0, tags: [] };

function logToConsole(entry: WebhookLogEntry): void {
  console.log(JSON.stringify(entry));
}

function entryOf({ images }: GalleryStores, map: StoredMap) {
  return toMapEntry(map, (key) => images.urlFor(key));
}

async function listPage(
  stores: GalleryStores,
  query: MapsPageQuery,
): Promise<MapsResponse> {
  const [page, tags] = await Promise.all([
    stores.maps.listMapsPage(query),
    stores.maps.listTags(),
  ]);

  return {
    maps: page.maps.map((map) => entryOf(stores, map)),
    total: page.total,
    tags,
  };
}

async function findEntry(
  stores: GalleryStores | undefined,
  slug: string,
): Promise<MapResponse> {
  const map = stores ? await stores.maps.findMap(slug) : null;
  if (!stores || !map) {
    throw new HttpError(404, 'There is no map at this address.');
  }

  return { map: entryOf(stores, map) };
}

const readRawBody = express.raw({
  type: () => true,
  limit: MAX_WEBHOOK_BYTES,
});

function isTooLarge(error: unknown): boolean {
  return (
    error instanceof Error &&
    'type' in error &&
    error.type === 'entity.too.large'
  );
}

const rawBody: RequestHandler = (req, res, next) => {
  readRawBody(req, res, (error?: unknown) => {
    next(
      isTooLarge(error)
        ? new HttpError(413, 'The webhook body is too large.')
        : error,
    );
  });
};

function rawBodyOf(req: Request): Buffer {
  return Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
}

function createRoutes({
  stores,
  sync,
  webhookSecret,
  pageSizes = {
    pageSize: GALLERY_PAGE_SIZE,
    maxPageSize: MAX_GALLERY_PAGE_SIZE,
  },
  log = logToConsole,
  syncSchedule,
  now = () => new Date(),
}: GalleryRoutesDeps): Router {
  const router = Router();

  router.get('/maps', async (req, res) => {
    const query = parseMapsQuery(req.query, pageSizes);
    const page = stores ? await listPage(stores, query) : EMPTY_PAGE;

    res.set('Cache-Control', 'no-cache');
    res.json(page satisfies MapsResponse);
  });

  router.get('/maps/:slug', async (req, res) => {
    const found = await findEntry(stores, req.params.slug);

    res.set('Cache-Control', 'no-cache');
    res.json(found satisfies MapResponse);
  });

  router.get('/gallery/health', async (_req, res) => {
    if (!stores || !sync) {
      throw new HttpError(404, 'Not found.');
    }

    const lastSyncAt = await stores.maps.lastSyncedAt();
    const stale = isSyncStale(lastSyncAt, now(), syncSchedule);

    res.set('Cache-Control', 'no-store');
    res.status(stale ? 503 : 200).json({ lastSyncAt, stale });
  });

  router.post('/patreon/webhook', rawBody, (req, res) => {
    if (!webhookSecret || !sync) {
      throw new HttpError(404, 'Not found.');
    }
    if (
      !isValidSignature(
        rawBodyOf(req),
        req.get('X-Patreon-Signature'),
        webhookSecret,
      )
    ) {
      throw new HttpError(401, 'The webhook signature is not valid.');
    }

    const trigger = req.get('X-Patreon-Event') ?? '';
    const syncs = trigger.startsWith(POST_EVENTS);
    if (syncs) {
      void sync.run();
    }

    log({
      event: 'patreon-webhook',
      trigger,
      result: syncs ? 'sync' : 'ignored',
    });
    res.status(202).json({ ok: true });
  });

  return router;
}

export { createRoutes };
export type { GalleryRoutesDeps, WebhookLogEntry };
