import type { RequestHandler } from 'express';

const noIndex: RequestHandler = (_req, res, next) => {
  res.set('X-Robots-Tag', 'noindex');
  next();
};

export { noIndex };
