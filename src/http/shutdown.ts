import type { RequestHandler } from 'express';
import { HttpError } from './errors.ts';
import { isSafeMethod } from './methods.ts';

function refuseNewWorkDuringShutdown(
  isShuttingDown: () => boolean,
): RequestHandler {
  return (req, res, next) => {
    if (isShuttingDown()) {
      res.set('Connection', 'close');
      if (!isSafeMethod(req.method)) {
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
