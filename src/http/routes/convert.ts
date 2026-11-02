import { Router, type RequestHandler } from 'express';
import type { ConversionQueue, PendingLimit } from '../../queue/index.ts';
import { convertHandler } from '../convert/handler.ts';
import { HttpError } from '../errors.ts';
import {
  createUploadDir,
  limitTotalUpload,
  uploadFiles,
} from '../upload/index.ts';

function limitPendingConversions(pendingLimit: PendingLimit): RequestHandler {
  return (_req, res, next) => {
    const release = pendingLimit.reserve();

    if (!release) {
      res.set({ 'Retry-After': '30', Connection: 'close' });
      throw new HttpError(
        503,
        'The server is busy converting other maps. Please try again in a minute.',
      );
    }

    res.once('close', release);
    next();
  };
}

function convertRouter(
  queue: ConversionQueue,
  pendingLimit: PendingLimit,
): Router {
  const router = Router();
  router.post(
    '/convert',
    limitPendingConversions(pendingLimit),
    limitTotalUpload,
    createUploadDir,
    uploadFiles,
    convertHandler(queue),
  );
  return router;
}

export { convertRouter };
