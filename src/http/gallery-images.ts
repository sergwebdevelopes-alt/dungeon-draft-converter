import express, { type RequestHandler } from 'express';
import { cacheControlFor } from '../infrastructure/http-server/cache-control.ts';

function serveGalleryImages(dir: string): RequestHandler {
  return express.static(dir, {
    redirect: false,
    cacheControl: false,
    setHeaders(res) {
      res.set('Cache-Control', cacheControlFor(res.req.baseUrl + res.req.path));
    },
  });
}

export { serveGalleryImages };
