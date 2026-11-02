import type { RequestHandler } from 'express';
import { IS_PRODUCTION } from '../config.ts';
import { HttpError } from './errors.ts';
import { isSafeMethod } from './methods.ts';

const ALLOWED_FETCH_SITES = new Set(['same-origin', 'none']);

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders: RequestHandler = (_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (IS_PRODUCTION) {
    res.set({
      'Content-Security-Policy': CONTENT_SECURITY_POLICY,
      'Strict-Transport-Security': 'max-age=15552000',
    });
  }
  next();
};

const blockCrossSiteRequests: RequestHandler = (req, _res, next) => {
  const site = req.get('Sec-Fetch-Site');
  if (
    !isSafeMethod(req.method) &&
    site !== undefined &&
    !ALLOWED_FETCH_SITES.has(site)
  ) {
    throw new HttpError(403, 'Requests from other websites are not allowed.');
  }
  next();
};

export { blockCrossSiteRequests, securityHeaders };
