import http from 'node:http';
import path from 'node:path';
import express, {
  type ErrorRequestHandler,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { zipSync, type Zippable } from 'fflate';
import multer, { MulterError } from 'multer';
import sharp from 'sharp';
import { parseDd2vtt, type LoadedMap } from './dd2vtt.ts';
import {
  checkLogoPercent,
  convertMap,
  FORMAT_PRESETS,
  FOUNDRY_DIR,
  InvalidLogoPlacementError,
  InvalidMapImageError,
  LOGO_LIMITS,
  MapTooLargeError,
  VARIANTS,
  type LogoSetting,
  type Variant,
} from './convert.ts';

const PORT = Number(process.env.PORT ?? 3000);
const MAP_EXTENSION = '.dd2vtt';
const MAX_MAP_NAME_LENGTH = 100;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_PIXELS = 25_000_000;
const LOGO_FORMATS = new Set(['png', 'jpeg', 'webp']);
const MAX_PENDING_CONVERSIONS = 4;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ROOT_DIR = path.join(import.meta.dirname, '..');
const WEB_DIST_DIR = path.join(ROOT_DIR, 'web/dist');

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  queue = result.catch(() => undefined);
  return result;
}

let pendingConversions = 0;

const limitPendingConversions: RequestHandler = (_req, res, next) => {
  if (pendingConversions >= MAX_PENDING_CONVERSIONS) {
    res.set({ 'Retry-After': '30', Connection: 'close' });
    throw new HttpError(
      503,
      'The server is busy converting other maps. Please try again in a minute.',
    );
  }
  pendingConversions++;
  res.once('close', () => {
    pendingConversions--;
  });
  next();
};

const uploadFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 2 },
}).fields([
  { name: 'map', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
]);

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseLogoPercent(raw: unknown, setting: LogoSetting): number {
  if (raw === undefined || raw === '') {
    return LOGO_LIMITS[setting].default;
  }

  const value =
    typeof raw === 'string' && /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
  checkLogoPercent(setting, value);
  return value;
}

function parseList<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  label: string,
): T[] {
  if (!raw) {
    return [...allowed];
  }
  const values = raw.split(',').filter(Boolean);
  const unknown = values.filter((v) => !allowed.includes(v as T));
  if (unknown.length > 0 || values.length === 0) {
    throw new HttpError(400, `Unknown ${label}: ${unknown.join(', ')}`);
  }
  return values as T[];
}

function safeMapFileName(raw: string | undefined): string {
  const base = path.basename(raw ?? `map${MAP_EXTENSION}`);
  if (!base.toLowerCase().endsWith(MAP_EXTENSION)) {
    throw new HttpError(400, 'Please upload a .dd2vtt file.');
  }

  const stem = base
    .slice(0, -MAP_EXTENSION.length)
    .replace(/[^\p{L}\p{N} _.()-]/gu, '_')
    .slice(0, MAX_MAP_NAME_LENGTH)
    .replace(/^[. ]+|[. ]+$/g, '');
  return `${stem || 'map'}${MAP_EXTENSION}`;
}

function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\w.-]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function takeUploadedFile(
  req: Request,
  field: 'map' | 'logo',
): Express.Multer.File | undefined {
  const files = req.files;
  if (!files || Array.isArray(files)) {
    return undefined;
  }
  const file = files[field]?.[0];
  delete files[field];
  return file;
}

function requireMapFile(
  file: Express.Multer.File | undefined,
): Express.Multer.File {
  if (!file || file.size === 0) {
    throw new HttpError(400, 'Please upload a .dd2vtt map file.');
  }
  return file;
}

function parseMap(content: Buffer, fileName: string): LoadedMap {
  try {
    return parseDd2vtt(fileName, content.toString('utf-8'));
  } catch (error) {
    throw new HttpError(
      400,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function validateLogo(
  file: Express.Multer.File | undefined,
): Promise<Buffer | undefined> {
  if (!file) {
    return undefined;
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new HttpError(
      413,
      `Logo is too large (max ${MAX_LOGO_BYTES / 1024 / 1024} MB).`,
    );
  }

  const invalidLogo = new HttpError(
    400,
    'Logo must be a PNG, JPG or WebP image.',
  );
  let metadata;
  try {
    metadata = await sharp(file.buffer).metadata();
  } catch {
    throw invalidLogo;
  }
  if (!LOGO_FORMATS.has(metadata.format)) {
    throw invalidLogo;
  }
  if (metadata.width * metadata.height > MAX_LOGO_PIXELS) {
    throw new HttpError(
      400,
      `Logo dimensions are too large (max ${MAX_LOGO_PIXELS / 1_000_000} megapixels).`,
    );
  }

  return file.buffer;
}

async function handleConvert(req: Request, res: Response): Promise<void> {
  let clientGone = false;
  res.on('close', () => {
    clientGone = !res.writableFinished;
  });

  const fileName = safeMapFileName(queryString(req.query.name));

  const presetNames = parseList(
    queryString(req.query.presets),
    FORMAT_PRESETS.map((p) => p.name),
    'presets',
  );
  const presets = FORMAT_PRESETS.filter((p) => presetNames.includes(p.name));
  const variants = parseList<Variant>(
    queryString(req.query.variants),
    VARIANTS,
    'variants',
  );
  const logoSize = parseLogoPercent(req.query.logoSize, 'size');
  const logoMargin = parseLogoPercent(req.query.logoMargin, 'margin');

  const mapFile = requireMapFile(takeUploadedFile(req, 'map'));
  const map = parseMap(mapFile.buffer, fileName);
  const logoImage = await validateLogo(takeUploadedFile(req, 'logo'));
  const logo = logoImage && {
    image: logoImage,
    size: logoSize,
    margin: logoMargin,
  };

  const files = await enqueue(async () =>
    clientGone ? [] : convertMap(map, { presets, variants, logo }),
  );
  if (clientGone) {
    return;
  }
  if (files.length === 0) {
    throw new HttpError(
      422,
      'This map has no grid information, so only "No grid" images can be made.',
    );
  }

  const entries: Zippable = {
    [`${map.fileNameWithoutExt}/${FOUNDRY_DIR}/${map.fileNameWithExt}`]:
      mapFile.buffer,
  };
  for (const file of files) {
    entries[`${map.fileNameWithoutExt}/${file.path}`] = file.data;
  }
  const zip = zipSync(entries, { level: 0 });

  res
    .status(200)
    .set({
      'Content-Type': 'application/zip',
      'Content-Disposition': contentDisposition(
        `${map.fileNameWithoutExt}.zip`,
      ),
    })
    .end(zip);
}

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (req.socket.destroyed) {
    return;
  }

  let httpError: HttpError;
  if (error instanceof HttpError) {
    httpError = error;
  } else if (error instanceof MapTooLargeError) {
    httpError = new HttpError(
      422,
      `${error.message} Try unselecting the larger formats.`,
    );
  } else if (
    error instanceof InvalidLogoPlacementError ||
    error instanceof InvalidMapImageError
  ) {
    httpError = new HttpError(400, error.message);
  } else if (error instanceof MulterError) {
    httpError =
      error.code === 'LIMIT_FILE_SIZE'
        ? new HttpError(
            413,
            `File is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`,
          )
        : new HttpError(400, `Invalid upload: ${error.message}.`);
  } else {
    console.error(error);
    httpError = new HttpError(500, 'Conversion failed.');
  }

  res.status(httpError.status).json({ error: httpError.message });
};

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
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

async function createApp(server: http.Server): Promise<express.Express> {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);

  app.get('/api/config', (_req, res) => {
    res.json({
      presets: FORMAT_PRESETS,
      variants: VARIANTS,
      maxUploadBytes: MAX_UPLOAD_BYTES,
      maxLogoBytes: MAX_LOGO_BYTES,
      logo: LOGO_LIMITS,
    });
  });

  app.post('/api/convert', limitPendingConversions, uploadFiles, handleConvert);

  app.use('/api', () => {
    throw new HttpError(404, 'Not found.');
  });

  if (IS_PRODUCTION) {
    app.use(express.static(WEB_DIST_DIR));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.join(ROOT_DIR, 'vite.config.ts'),
      server: { middlewareMode: true, hmr: { server } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.use(errorHandler);
  return app;
}

if (import.meta.main) {
  const server = http.createServer();
  server.on('request', await createApp(server));
  server.listen(PORT, () => {
    console.log(
      `Listening on http://localhost:${PORT} (${IS_PRODUCTION ? 'production' : 'dev'})`,
    );
  });
}

export { MAX_UPLOAD_BYTES, createApp };
