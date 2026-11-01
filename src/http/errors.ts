import type { ErrorRequestHandler, RequestHandler } from 'express';
import { InvalidInputError, UnprocessableError } from '../core/errors.ts';

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  if (error instanceof InvalidInputError) {
    return new HttpError(400, error.message);
  }
  if (error instanceof UnprocessableError) {
    return new HttpError(422, error.message);
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
