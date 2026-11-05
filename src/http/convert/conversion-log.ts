import type { RequestHandler, Response } from 'express';
import { toMegabytes } from '../../shared/utils/format.ts';
import { withoutUndefined } from '../../shared/utils/object.ts';
import { elapsed } from '../../shared/utils/time.ts';

type ConversionResult =
  'ok' | 'cancelled' | 'busy' | 'invalid' | 'timeout' | 'error';

interface ConversionDetails {
  receivedAt: number;
  uploadedAt?: number;
  startedAt?: number;
  timedOut?: boolean;
  levels?: number;
  uploadBytes?: number;
  presets?: string[];
  variants?: string[];
}

interface ConversionLogEntry {
  event: 'conversion';
  result: ConversionResult;
  status: number;
  levels?: number;
  uploadMB?: number;
  presets?: string[];
  variants?: string[];
  uploadMs?: number;
  queuedMs?: number;
  convertMs?: number;
  tookMs: number;
}

type LogConversion = (entry: ConversionLogEntry) => void;

const detailsByResponse = new WeakMap<Response, ConversionDetails>();

const logToConsole: LogConversion = (entry) => {
  console.log(JSON.stringify(entry));
};

function conversionResult(
  status: number,
  finished: boolean,
  timedOut: boolean,
): ConversionResult {
  if (timedOut) {
    return 'timeout';
  }
  if (!finished) {
    return 'cancelled';
  }
  if (status === 503) {
    return 'busy';
  }
  if (status >= 500) {
    return 'error';
  }

  return status >= 400 ? 'invalid' : 'ok';
}

function toLogEntry(
  details: ConversionDetails,
  status: number,
  finished: boolean,
  endedAt: number,
): ConversionLogEntry {
  return withoutUndefined({
    event: 'conversion',
    result: conversionResult(status, finished, details.timedOut ?? false),
    status,
    levels: details.levels,
    uploadMB:
      details.uploadBytes === undefined
        ? undefined
        : toMegabytes(details.uploadBytes),
    presets: details.presets,
    variants: details.variants,
    uploadMs: elapsed(details.receivedAt, details.uploadedAt),
    queuedMs: elapsed(details.uploadedAt, details.startedAt),
    convertMs: elapsed(details.startedAt, endedAt),
    tookMs: endedAt - details.receivedAt,
  });
}

function logConversions(log: LogConversion): RequestHandler {
  return (_req, res, next) => {
    const details: ConversionDetails = { receivedAt: Date.now() };
    detailsByResponse.set(res, details);

    res.once('close', () => {
      log(
        toLogEntry(details, res.statusCode, res.writableFinished, Date.now()),
      );
    });

    next();
  };
}

function addToConversionLog(
  res: Response,
  changes: Partial<ConversionDetails>,
): void {
  const details = detailsByResponse.get(res);
  if (details) {
    Object.assign(details, changes);
  }
}

export { addToConversionLog, logConversions, logToConsole, toLogEntry };
export type { ConversionLogEntry, LogConversion };
