import type { ErrorRequestHandler, RequestHandler } from 'express';
import { InvalidInputError, UnprocessableError } from '../../shared/errors.ts';

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const STATUS_BY_KIND = [
  { kind: InvalidInputError, status: 400 },
  { kind: UnprocessableError, status: 422 },
];

function expectedStatus(error: unknown): number | undefined {
  return STATUS_BY_KIND.find(({ kind }) => error instanceof kind)?.status;
}

function isUnexpected(error: unknown): boolean {
  return !(error instanceof HttpError) && expectedStatus(error) === undefined;
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const status = expectedStatus(error);
  if (status !== undefined && error instanceof Error) {
    return new HttpError(status, error.message);
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

export { HttpError, errorHandler, isUnexpected, notFound };
