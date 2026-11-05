import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'upload-dir-test-'));
process.env.TMPDIR = root;

const {
  createUploadDir,
  keepUploadsDuring,
  removeStaleUploadDirs,
  uploadDirOf,
} = await import('./upload-dir.ts');

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

async function exists(target: string): Promise<boolean> {
  return fs.access(target).then(
    () => true,
    () => false,
  );
}

async function waitUntilGone(target: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (await exists(target)) {
    if (Date.now() > deadline) {
      throw new Error(`${target} was not removed.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function startRequest() {
  const req = {} as Request;
  const res = new EventEmitter() as unknown as Response;
  let nextError: unknown;

  await createUploadDir(req, res, ((error?: unknown) => {
    nextError = error;
  }) as NextFunction);

  return { req, res, nextError };
}

async function makeDir(
  name: string,
  ageMs = 0,
  files: string[] = [],
): Promise<string> {
  const dir = path.join(root, name);
  await fs.mkdir(dir);

  for (const file of files) {
    await fs.writeFile(path.join(dir, file), 'x');
  }

  if (ageMs > 0) {
    const time = new Date(Date.now() - ageMs);
    await fs.utimes(dir, time, time);
  }

  return dir;
}

describe('upload dirs', () => {
  after(() => fs.rm(root, { recursive: true, force: true }));

  it('creates a folder for each request', async () => {
    const { req, res, nextError } = await startRequest();
    const dir = uploadDirOf(req);

    assert.equal(nextError, undefined);
    assert.equal(path.dirname(dir), root);
    assert.match(path.basename(dir), /^dd2vtt-/);
    assert.equal(await exists(dir), true);

    res.emit('close');
    await waitUntilGone(dir);
  });

  it('removes the folder only after the request work has finished', async () => {
    const { req, res } = await startRequest();
    const dir = uploadDirOf(req);
    let finishWork = () => undefined as void;
    keepUploadsDuring(
      req,
      new Promise<void>((resolve) => {
        finishWork = resolve;
      }),
    );

    res.emit('close');
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(await exists(dir), true);

    finishWork();
    await waitUntilGone(dir);
  });

  it('removes the folder even when the work failed', async () => {
    const { req, res } = await startRequest();
    const dir = uploadDirOf(req);
    keepUploadsDuring(req, Promise.reject(new Error('conversion failed')));

    res.emit('close');

    await waitUntilGone(dir);
  });

  it('fails clearly when asked for a folder that was never created', () => {
    assert.throws(() => uploadDirOf({} as Request), {
      message: 'The upload folder was not created.',
    });
  });

  it('answers 503 when the folder cannot be created', async () => {
    await fs.chmod(root, 0o555);
    const originalError = console.error;
    console.error = () => undefined;

    try {
      await assert.rejects(startRequest(), {
        status: 503,
        message:
          "The server can't accept uploads right now. Please try again later.",
      });
    } finally {
      console.error = originalError;
      await fs.chmod(root, 0o755);
    }
  });

  it('removes only upload folders older than the limit', async () => {
    const old = await makeDir('dd2vtt-old', THREE_HOURS_MS, ['left-over.png']);
    const recent = await makeDir('dd2vtt-recent');
    const unrelated = await makeDir('other-old', THREE_HOURS_MS);

    const removed = await removeStaleUploadDirs();

    assert.equal(removed, 1);
    assert.equal(await exists(old), false);
    assert.equal(await exists(recent), true);
    assert.equal(await exists(unrelated), true);
  });
});
