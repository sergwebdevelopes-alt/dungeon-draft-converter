import type { ErrorRequestHandler } from 'express';
import type { ErrorReporter } from '../error-reporting/error-reporter.ts';
import { isUnexpected } from './http-errors.ts';

function reportUnexpectedErrors(reporter: ErrorReporter): ErrorRequestHandler {
  return (error, req, _res, next) => {
    if (isUnexpected(error) && !req.socket.destroyed) {
      reporter.report(error, {
        where: 'http',
        method: req.method,
        path: req.path,
      });
    }
    next(error);
  };
}

export { reportUnexpectedErrors };
