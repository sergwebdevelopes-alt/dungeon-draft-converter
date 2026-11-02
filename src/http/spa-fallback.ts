import path from 'node:path';
import express, { type RequestHandler } from 'express';
import { cacheControlFor } from './cache-control.ts';
import { servePrecompressed } from './precompressed.ts';

function isPageRequest(method: string, urlPath: string): boolean {
  const isRead = method === 'GET' || method === 'HEAD';

  return isRead && !urlPath.startsWith('/api/') && path.extname(urlPath) === '';
}

function spaFallback(indexFile: string): RequestHandler {
  return (req, res, next) => {
    if (!isPageRequest(req.method, req.path)) {
      next();
      return;
    }

    res.sendFile(indexFile, (error) => {
      if (error) {
        next(error);
      }
    });
  };
}

const setCacheControl: RequestHandler = (req, res, next) => {
  res.set('Cache-Control', cacheControlFor(req.path));
  next();
};

function serveWebApp(distDir: string): RequestHandler[] {
  return [
    setCacheControl,
    servePrecompressed(distDir),
    express.static(distDir, { redirect: false, cacheControl: false }),
    spaFallback(path.join(distDir, 'index.html')),
  ];
}

export { serveWebApp };
