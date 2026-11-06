import { Router, type RequestHandler } from 'express';
import {
  MAX_LEVELS,
  MAX_LOGO_BYTES,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
} from '../../../config.ts';
import { HttpError } from '../../../infrastructure/http-server/http-errors.ts';
import type {
  ConfigResponse,
  QueuePosition,
} from '../../../contracts/converter-api.ts';
import type { ConversionQueue } from '../application/conversion-queue.ts';
import type { PendingLimit } from '../application/pending-limit.ts';
import {
  FORMAT_PRESETS,
  LOGO_LIMITS,
  MAX_OUTPUT_PIXELS,
  VARIANTS,
} from '../image-processing/render-map-images.ts';
import {
  logConversions,
  logToConsole,
  type LogConversion,
} from './conversion-log.ts';
import { convertHandler } from './convert-handler.ts';
import { createUploadDir } from './upload/upload-dir.ts';
import { limitTotalUpload, uploadFiles } from './upload/upload.ts';

interface ConverterRoutesDeps {
  queue: ConversionQueue;
  pendingLimit: PendingLimit;
  log?: LogConversion;
}

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

function createRoutes({
  queue,
  pendingLimit,
  log = logToConsole,
}: ConverterRoutesDeps): Router {
  const router = Router();

  router.get('/config', (_req, res) => {
    res.json({
      presets: FORMAT_PRESETS,
      variants: VARIANTS,
      maxUploadBytes: MAX_UPLOAD_BYTES,
      maxTotalUploadBytes: MAX_TOTAL_UPLOAD_BYTES,
      maxLevels: MAX_LEVELS,
      maxLogoBytes: MAX_LOGO_BYTES,
      maxOutputPixels: MAX_OUTPUT_PIXELS,
      logo: LOGO_LIMITS,
    } satisfies ConfigResponse);
  });

  router.get('/queue/:ticket', (req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json(queue.position(req.params.ticket) satisfies QueuePosition);
  });

  router.post(
    '/convert',
    logConversions(log),
    limitPendingConversions(pendingLimit),
    limitTotalUpload,
    createUploadDir,
    uploadFiles,
    convertHandler(queue),
  );

  return router;
}

export { createRoutes };
export type { ConverterRoutesDeps };
