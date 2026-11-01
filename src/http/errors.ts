import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { MAX_LEVELS, MAX_UPLOAD_BYTES } from '../config.ts';
import {
  InvalidLogoPlacementError,
  InvalidMapImageError,
  MapTooLargeError,
} from '../core/convert.ts';
import { InvalidMapFileError } from '../core/dd2vtt.ts';
import { LevelMismatchError } from '../core/merge.ts';

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const ERROR_STATUSES: [abstract new (...args: never[]) => Error, number][] = [
  [InvalidMapFileError, 400],
  [InvalidMapImageError, 400],
  [InvalidLogoPlacementError, 400],
  [LevelMismatchError, 422],
];

function uploadError(error: MulterError): HttpError {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new HttpError(
      413,
      `Each file can be at most ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
    );
  }
  if (
    error.code === 'LIMIT_FILE_COUNT' ||
    (error.code === 'LIMIT_UNEXPECTED_FILE' && error.field === 'maps')
  ) {
    return new HttpError(400, `At most ${MAX_LEVELS} maps can be combined.`);
  }
  return new HttpError(400, `Invalid upload: ${error.message}.`);
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  if (error instanceof MapTooLargeError) {
    return new HttpError(
      422,
      `${error.message} Try unselecting the larger formats.`,
    );
  }
  if (error instanceof MulterError) {
    return uploadError(error);
  }
  const match = ERROR_STATUSES.find(([type]) => error instanceof type);
  if (match && error instanceof Error) {
    return new HttpError(match[1], error.message);
  }
  console.error(error);
  return new HttpError(500, 'Conversion failed.');
}

const notFound: RequestHandler = () => {
  throw new HttpError(404, 'Not found.');
};

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (req.socket.destroyed) {
    return;
  }
  const httpError = toHttpError(error);
  res.status(httpError.status).json({ error: httpError.message });
};

export { HttpError, errorHandler, notFound };
