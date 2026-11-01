import type { Request, Response } from 'express';
import { CONVERSION_TIMEOUT_MS } from '../../config.ts';
import { convertLevels } from '../../core/conversion.ts';
import type { ConversionQueue } from '../../queue/conversion-queue.ts';
import { formatDuration } from '../../utils/format.ts';
import { keepUploadsDuring, uploadDirOf } from '../upload.ts';
import { parseConvertRequest } from './request.ts';
import { streamZip } from './zip.ts';

function convertHandler(
  queue: ConversionQueue,
  timeoutMs = CONVERSION_TIMEOUT_MS,
) {
  return async (req: Request, res: Response): Promise<void> => {
    let clientGone = false;
    let ticket: string | undefined = undefined;

    res.on('close', () => {
      clientGone = !res.writableFinished;

      if (ticket) {
        queue.forget(ticket);
      }
    });

    const request = await parseConvertRequest(req, queue);
    const workDir = uploadDirOf(req);

    ticket = request.ticket;

    let timedOut = false;

    const stopped = () => clientGone || timedOut;

    const task = async () => {
      const timer = setTimeout(() => {
        timedOut = true;

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

    const work = queue.run(task, { ticket, stopped });

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
