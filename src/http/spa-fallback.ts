import path from 'node:path';
import express, { type RequestHandler } from 'express';

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

function serveWebApp(distDir: string): RequestHandler[] {
  return [
    express.static(distDir, { redirect: false }),
    spaFallback(path.join(distDir, 'index.html')),
  ];
}

export { serveWebApp };
