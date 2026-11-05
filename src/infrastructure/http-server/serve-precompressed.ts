import fs from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from 'express';
import { cacheControlFor } from './cache-control.ts';

type Encoding = 'br' | 'gzip';

const PREFERRED: Encoding[] = ['br', 'gzip'];
const EXTENSIONS: Record<Encoding, string> = { br: '.br', gzip: '.gz' };

function acceptedEncodings(header: string): Set<string> {
  const accepted = new Set<string>();

  for (const part of header.split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    if (name && (!q || Number(q.slice(2)) > 0)) {
      accepted.add(name);
    }
  }

  return accepted;
}

function preferredEncodings(header: string | undefined): Encoding[] {
  const accepted = acceptedEncodings(header ?? '');

  return PREFERRED.filter((encoding) => accepted.has(encoding));
}

function isRead(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

function fileIn(rootDir: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  return path.join(rootDir, path.normalize(`/${decoded}`));
}

async function isFile(file: string): Promise<boolean> {
  try {
    return (await fs.stat(file)).isFile();
  } catch {
    return false;
  }
}

async function findVariant(
  file: string,
  encodings: Encoding[],
): Promise<{ encoding: Encoding; file: string } | null> {
  for (const encoding of encodings) {
    const variant = file + EXTENSIONS[encoding];
    if (await isFile(variant)) {
      return { encoding, file: variant };
    }
  }

  return null;
}

function servePrecompressed(rootDir: string): RequestHandler {
  return async (req, res, next) => {
    const file = isRead(req.method) ? fileIn(rootDir, req.path) : null;
    const encodings = preferredEncodings(req.get('Accept-Encoding'));
    const variant =
      file && encodings.length > 0 ? await findVariant(file, encodings) : null;

    if (!file || !variant) {
      next();
      return;
    }

    res.type(path.extname(file));
    res.set({
      'Content-Encoding': variant.encoding,
      'Cache-Control': cacheControlFor(req.path),
      Vary: 'Accept-Encoding',
    });
    res.sendFile(variant.file, { cacheControl: false }, (error) => {
      if (error) {
        next(error);
      }
    });
  };
}

export { servePrecompressed };
