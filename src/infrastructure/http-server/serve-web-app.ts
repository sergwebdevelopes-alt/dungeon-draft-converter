import fs from 'node:fs/promises';
import path from 'node:path';
import express, { type Request, type RequestHandler } from 'express';
import { cacheControlFor } from './cache-control.ts';
import { withPageHead, type PageHead } from './page-head.ts';
import { servePrecompressed } from './serve-precompressed.ts';

interface Page {
  head: PageHead;
  status: number;
}

type PageFor = (req: Request) => Promise<Page>;

function isPageRequest(method: string, urlPath: string): boolean {
  const isRead = method === 'GET' || method === 'HEAD';

  return isRead && !urlPath.startsWith('/api/') && path.extname(urlPath) === '';
}

function spaFallback(indexFile: string, pageFor?: PageFor): RequestHandler {
  let template: Promise<string> | null = null;

  return async (req, res, next) => {
    if (!isPageRequest(req.method, req.path)) {
      next();
      return;
    }

    if (!pageFor) {
      res.sendFile(indexFile, (error) => {
        if (error) {
          next(error);
        }
      });
      return;
    }

    try {
      template ??= fs.readFile(indexFile, 'utf8');
      const { head, status } = await pageFor(req);
      res
        .status(status)
        .type('html')
        .send(withPageHead(await template, head));
    } catch (error) {
      template = null;
      next(error);
    }
  };
}

const setCacheControl: RequestHandler = (req, res, next) => {
  res.set('Cache-Control', cacheControlFor(req.path));
  next();
};

function serveWebApp(distDir: string, pageFor?: PageFor): RequestHandler[] {
  return [
    setCacheControl,
    servePrecompressed(distDir),
    express.static(distDir, {
      redirect: false,
      cacheControl: false,
      index: pageFor ? false : 'index.html',
    }),
    spaFallback(path.join(distDir, 'index.html'), pageFor),
  ];
}

export { serveWebApp };
export type { Page, PageFor };
