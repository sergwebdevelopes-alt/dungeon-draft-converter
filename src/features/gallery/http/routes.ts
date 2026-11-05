import express, { Router, type Request, type RequestHandler } from 'express';
import { HttpError } from '../../../infrastructure/http-server/http-errors.ts';
import type { GallerySync } from '../application/sync-gallery.ts';
import type { GalleryStores } from '../ports/gallery-stores.ts';
import { toMapEntry, type MapEntry } from './map-entry.ts';
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
  log?: (entry: WebhookLogEntry) => void;
}

function logToConsole(entry: WebhookLogEntry): void {
  console.log(JSON.stringify(entry));
}

async function listEntries({
  maps,
  images,
}: GalleryStores): Promise<MapEntry[]> {
  const stored = await maps.listMaps();

  return stored.map((map) => toMapEntry(map, (key) => images.urlFor(key)));
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
  log = logToConsole,
}: GalleryRoutesDeps): Router {
  const router = Router();

  router.get('/maps', async (_req, res) => {
    const maps = stores ? await listEntries(stores) : [];

    res.set('Cache-Control', 'no-cache');
    res.json({ maps });
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
