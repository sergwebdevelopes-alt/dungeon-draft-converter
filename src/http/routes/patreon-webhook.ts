import express, { Router, type Request, type RequestHandler } from 'express';
import { isValidSignature } from '../../gallery/patreon/webhook-signature.ts';
import type { GallerySync } from '../../gallery/sync.ts';
import { HttpError } from '../../infrastructure/http-server/http-errors.ts';

const MAX_WEBHOOK_BYTES = 1024 * 1024;
const POST_EVENTS = 'posts:';

interface WebhookLogEntry {
  event: 'patreon-webhook';
  trigger: string;
  result: 'sync' | 'ignored';
}

interface PatreonWebhookOptions {
  secret: string | undefined;
  sync: GallerySync | undefined;
  log?: (entry: WebhookLogEntry) => void;
}

function logToConsole(entry: WebhookLogEntry): void {
  console.log(JSON.stringify(entry));
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

function patreonWebhookRouter({
  secret,
  sync,
  log = logToConsole,
}: PatreonWebhookOptions): Router {
  const router = Router();
  router.post('/patreon/webhook', rawBody, (req, res) => {
    if (!secret || !sync) {
      throw new HttpError(404, 'Not found.');
    }
    if (
      !isValidSignature(rawBodyOf(req), req.get('X-Patreon-Signature'), secret)
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

export { patreonWebhookRouter };
export type { WebhookLogEntry };
