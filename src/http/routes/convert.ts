import { Router, type RequestHandler } from 'express';
import type { ConversionQueue } from '../../queue/conversion-queue.ts';
import { convertHandler } from '../convert/handler.ts';
import { HttpError } from '../errors.ts';
import { createUploadDir, limitTotalUpload, uploadFiles } from '../upload.ts';

function limitPendingConversions(queue: ConversionQueue): RequestHandler {
  return (_req, res, next) => {
    if (!queue.reserve()) {
      res.set({ 'Retry-After': '30', Connection: 'close' });
      throw new HttpError(
        503,
        'The server is busy converting other maps. Please try again in a minute.',
      );
    }
    res.once('close', () => queue.release());
    next();
  };
}

function convertRouter(queue: ConversionQueue): Router {
  const router = Router();
  router.post(
    '/convert',
    limitPendingConversions(queue),
    limitTotalUpload,
    createUploadDir,
    uploadFiles,
    convertHandler(queue),
  );
  return router;
}

export { convertRouter };
