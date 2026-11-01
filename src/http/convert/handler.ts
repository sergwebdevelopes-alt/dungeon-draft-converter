import { createReadStream } from 'node:fs';
import type { Request, Response } from 'express';
import { CONVERSION_TIMEOUT_MS } from '../../config.ts';
import { convertMap, FOUNDRY_DIR } from '../../core/convert.ts';
import { mergeLevels } from '../../core/merge.ts';
import type { ConversionQueue } from '../../queue/conversion-queue.ts';
import { HttpError } from '../errors.ts';
import { keepUploadsDuring, uploadDirOf } from '../upload.ts';
import {
  mergedFileName,
  parseConvertRequest,
  type ConvertRequest,
} from './request.ts';
import { streamZip, type ZipEntry } from './zip.ts';

function formatDuration(ms: number): string {
  const [value, unit] =
    ms >= 60_000 ? [ms / 60_000, 'minute'] : [ms / 1000, 'second'];
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

async function convertAndSend(
  request: ConvertRequest,
  res: Response,
  workDir: string,
  stopped: () => boolean,
): Promise<void> {
  const { levels, original, presets, variants, logo } = request;
  const merged =
    original === undefined
      ? await mergeLevels(
          levels,
          mergedFileName(levels[0].fileNameWithExt),
          workDir,
        )
      : undefined;
  if (stopped()) {
    return;
  }
  const map = merged?.map ?? levels[0];
  const foundryFile = merged?.dd2vtt ?? original;
  const { count, files } = await convertMap(map, workDir, {
    presets,
    variants,
    logo,
  });
  if (count === 0) {
    throw new HttpError(
      422,
      'This map has no grid information, so only "No grid" images can be made.',
    );
  }

  async function* entries(): AsyncGenerator<ZipEntry> {
    if (foundryFile) {
      yield {
        path: `${FOUNDRY_DIR}/${map.fileNameWithExt}`,
        data:
          typeof foundryFile === 'string'
            ? createReadStream(foundryFile)
            : foundryFile,
      };
    }
    yield* files;
  }
  await streamZip(res, map.fileNameWithoutExt, entries(), stopped);
}

function convertHandler(queue: ConversionQueue) {
  return async (req: Request, res: Response): Promise<void> => {
    let clientGone = false;
    res.on('close', () => {
      clientGone = !res.writableFinished;
    });

    const request = await parseConvertRequest(req, queue);
    const { ticket } = request;
    const workDir = uploadDirOf(req);

    let timedOut = false;
    const stopped = () => clientGone || timedOut;
    const stopOnTimeout = () => {
      timedOut = true;
      if (res.headersSent) {
        res.destroy();
        return;
      }
      res.status(503).json({
        error: `The conversion took longer than ${formatDuration(CONVERSION_TIMEOUT_MS)} and was stopped. Try fewer formats or a smaller map.`,
      });
    };

    if (ticket) {
      res.once('close', () => queue.forget(ticket));
    }
    const work = queue.run(
      async () => {
        const timer = setTimeout(stopOnTimeout, CONVERSION_TIMEOUT_MS);
        try {
          await convertAndSend(request, res, workDir, stopped);
        } finally {
          clearTimeout(timer);
        }
      },
      { ticket, stopped },
    );

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
