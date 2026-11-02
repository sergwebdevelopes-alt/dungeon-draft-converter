import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request, RequestHandler } from 'express';
import { STALE_UPLOAD_DIR_MS, UPLOAD_ROOT } from '../../config.ts';
import { HttpError } from '../errors.ts';

const UPLOAD_DIR_PREFIX = 'dd2vtt-';

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
    if (!(await isStale(dir))) {
      continue;
    }

    const wasRemoved = await removeDirLogged(dir);

    if (wasRemoved) {
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

export {
  createUploadDir,
  keepUploadsDuring,
  removeStaleUploadDirs,
  uploadDirOf,
};
