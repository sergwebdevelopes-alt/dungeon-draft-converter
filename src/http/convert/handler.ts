import type { Request, Response } from 'express';
import { CONVERSION_TIMEOUT_MS } from '../../config.ts';
import { convertLevels } from '../../core/conversion.ts';
import type { ConversionQueue } from '../../queue/index.ts';
import { formatDuration } from '../../utils/format.ts';
import {
  keepUploadsDuring,
  uploadDirOf,
  uploadsOf,
  type Uploads,
} from '../upload/index.ts';
import { addToConversionLog } from './conversion-log.ts';
import { parseConvertRequest } from './request.ts';
import { streamZip } from './zip.ts';

function uploadedBytes(uploads: Uploads): number {
  return Object.values(uploads)
    .flatMap((files) => files ?? [])
    .reduce((total, file) => total + file.size, 0);
}

function convertHandler(
  queue: ConversionQueue,
  timeoutMs = CONVERSION_TIMEOUT_MS,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const stop = new AbortController();

    res.on('close', () => {
      if (!res.writableFinished) {
        stop.abort();
      }
    });

    const uploads = uploadsOf(req);
    addToConversionLog(res, {
      uploadedAt: Date.now(),
      uploadBytes: uploadedBytes(uploads),
    });

    const request = await parseConvertRequest(
      { query: req.query, files: uploads },
      queue,
    );
    addToConversionLog(res, {
      levels: request.levels.length,
      presets: request.presets.map((preset) => preset.name),
      variants: request.variants,
    });
    const workDir = uploadDirOf(req);

    let timedOut = false;

    const stopped = () => stop.signal.aborted;

    const task = async () => {
      addToConversionLog(res, { startedAt: Date.now() });

      const timer = setTimeout(() => {
        timedOut = true;
        addToConversionLog(res, { timedOut: true });
        stop.abort();

        if (res.headersSent) {
          res.destroy();
          return;
        }

        res.status(503).json({
          error: `The conversion took longer than ${formatDuration(timeoutMs)} and was stopped. Try fewer formats or a smaller map.`,
        });
      }, timeoutMs);

      try {
        const { name, files } = await convertLevels(request, workDir);

        if (!stopped()) {
          await streamZip(res, name, files, stopped);
        }
      } finally {
        clearTimeout(timer);
      }
    };

    const work = queue.run(task, {
      ticket: request.ticket,
      signal: stop.signal,
    });

    keepUploadsDuring(req, work);

    try {
      await work;
    } catch (error) {
      if (!timedOut) {
        throw error;
      }
    }
  };
}

export { convertHandler };
