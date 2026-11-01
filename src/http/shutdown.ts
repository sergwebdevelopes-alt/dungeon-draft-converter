import type { RequestHandler } from 'express';
import { HttpError } from './errors.ts';

const READ_METHODS = new Set(['GET', 'HEAD']);

function refuseNewWorkDuringShutdown(
  isShuttingDown: () => boolean,
): RequestHandler {
  return (req, res, next) => {
    if (isShuttingDown()) {
      res.set('Connection', 'close');
      if (!READ_METHODS.has(req.method)) {
        throw new HttpError(
          503,
          'The server is restarting. Please try again in a minute.',
        );
      }
    }
    next();
  };
}

export { refuseNewWorkDuringShutdown };
