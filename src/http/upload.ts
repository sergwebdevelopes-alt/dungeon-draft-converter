import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Request, RequestHandler } from 'express';
import multer, { MulterError, type StorageEngine } from 'multer';
import {
  MAX_LEVELS,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  MULTIPART_OVERHEAD_BYTES,
  STALE_UPLOAD_DIR_MS,
  UPLOAD_ROOT,
} from '../config.ts';
import {
  InvalidMapFileError,
  MAP_EXTENSION,
  readDd2vttStream,
  type LoadedMap,
} from '../core/dd2vtt.ts';
import { HttpError } from './errors.ts';
import { formatMegabytes } from '../utils/format.ts';

const UPLOAD_DIR_PREFIX = 'dd2vtt-';
const MAP_FIELD = 'maps';

type UploadedFile = Express.Multer.File & { map?: LoadedMap };

interface UploadDir {
  path: string;
  work: Promise<unknown>;
}

const uploadDirs = new WeakMap<Request, UploadDir>();

function removeDir(dir: string): Promise<void> {
  return fs.rm(dir, { recursive: true, force: true });
}

async function removeDirLogged(dir: string): Promise<boolean> {
  try {
    await removeDir(dir);
    return true;
  } catch (error) {
    console.error(`Could not remove ${dir}:`, error);
    return false;
  }
}

async function removeWhenFinished(uploadDir: UploadDir): Promise<void> {
  await uploadDir.work.catch(() => undefined);
  await removeDirLogged(uploadDir.path);
}

async function makeUploadDir(): Promise<string> {
  try {
    return await fs.mkdtemp(path.join(UPLOAD_ROOT, UPLOAD_DIR_PREFIX));
  } catch (error) {
    console.error('Could not create upload folder:', error);
    throw new HttpError(
      503,
      "The server can't accept uploads right now. Please try again later.",
    );
  }
}

const createUploadDir: RequestHandler = async (req, res, next) => {
  const dir = await makeUploadDir();
  const uploadDir: UploadDir = { path: dir, work: Promise.resolve() };
  uploadDirs.set(req, uploadDir);
  res.once('close', () => void removeWhenFinished(uploadDir));
  next();
};

async function isStale(dir: string): Promise<boolean> {
  try {
    const { mtimeMs } = await fs.stat(dir);
    return Date.now() - mtimeMs > STALE_UPLOAD_DIR_MS;
  } catch {
    return false;
  }
}

async function removeStaleUploadDirs(): Promise<number> {
  const entries = await fs.readdir(UPLOAD_ROOT, { withFileTypes: true });
  const uploadDirPaths = entries
    .filter((e) => e.isDirectory() && e.name.startsWith(UPLOAD_DIR_PREFIX))
    .map((e) => path.join(UPLOAD_ROOT, e.name));

  let removed = 0;
  for (const dir of uploadDirPaths) {
    if ((await isStale(dir)) && (await removeDirLogged(dir))) {
      removed++;
    }
  }
  return removed;
}

function uploadDirOf(req: Request): string {
  const uploadDir = uploadDirs.get(req);
  if (!uploadDir) {
    throw new Error('The upload folder was not created.');
  }
  return uploadDir.path;
}

function keepUploadsDuring(req: Request, work: Promise<unknown>): void {
  const uploadDir = uploadDirs.get(req);
  if (uploadDir) {
    uploadDir.work = work;
  }
}

async function readAll(source: AsyncIterable<Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of source) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function storeMap(
  req: Request,
  file: Express.Multer.File,
): Promise<Partial<UploadedFile>> {
  const fileName = path.basename(file.originalname);
  if (!fileName.toLowerCase().endsWith(MAP_EXTENSION)) {
    throw new InvalidMapFileError(
      `"${fileName.slice(0, 100)}" is not a .dd2vtt file.`,
    );
  }
  const uploadDir = uploadDirOf(req);
  const id = randomUUID();
  const paths = {
    raw: path.join(uploadDir, `${id}${MAP_EXTENSION}`),
    image: path.join(uploadDir, `${id}.png`),
  };
  const { rawBytes, ...map } = await readDd2vttStream(
    fileName,
    file.stream.iterator({ destroyOnReturn: false }),
    paths,
  );
  return { path: paths.raw, size: rawBytes, map };
}

async function storeInMemory(
  file: Express.Multer.File,
): Promise<Partial<UploadedFile>> {
  const buffer = await readAll(file.stream);
  return { buffer, size: buffer.length };
}

const uploadStorage: StorageEngine = {
  _handleFile(req, file, callback) {
    const store =
      file.fieldname === MAP_FIELD ? storeMap(req, file) : storeInMemory(file);
    store.then((info) => callback(null, info), callback);
  },
  _removeFile(_req, file: UploadedFile, callback) {
    const paths = [file.path, file.map?.image].filter(
      (value): value is string => typeof value === 'string',
    );
    Promise.all(paths.map((p) => fs.rm(p, { force: true }))).then(
      () => callback(null),
      callback,
    );
  },
};

const limitTotalUpload: RequestHandler = (req, _res, next) => {
  const length = Number(req.headers['content-length']);
  if (!Number.isFinite(length)) {
    throw new HttpError(411, 'The upload size is missing.');
  }
  if (length > MAX_TOTAL_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) {
    throw new HttpError(
      413,
      `All files together can be at most ${formatMegabytes(MAX_TOTAL_UPLOAD_BYTES)}.`,
    );
  }
  next();
};

const receiveFiles = multer({
  storage: uploadStorage,
  defParamCharset: 'utf8',
  limits: { fileSize: MAX_UPLOAD_BYTES, files: MAX_LEVELS + 1 },
}).fields([
  { name: MAP_FIELD, maxCount: MAX_LEVELS },
  { name: 'logo', maxCount: 1 },
]);

function uploadError(error: MulterError): HttpError {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new HttpError(
      413,
      `Each file can be at most ${formatMegabytes(MAX_UPLOAD_BYTES)}.`,
    );
  }
  if (
    error.code === 'LIMIT_FILE_COUNT' ||
    (error.code === 'LIMIT_UNEXPECTED_FILE' && error.field === MAP_FIELD)
  ) {
    return new HttpError(400, `At most ${MAX_LEVELS} maps can be combined.`);
  }
  return new HttpError(400, `Invalid upload: ${error.message}.`);
}

const uploadFiles: RequestHandler = (req, res, next) => {
  receiveFiles(req, res, (error?: unknown) => {
    next(error instanceof MulterError ? uploadError(error) : error);
  });
};

export {
  createUploadDir,
  keepUploadsDuring,
  limitTotalUpload,
  MAP_FIELD,
  removeStaleUploadDirs,
  uploadDirOf,
  uploadFiles,
};
export type { UploadedFile };
