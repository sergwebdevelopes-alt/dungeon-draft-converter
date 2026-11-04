import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ImageStore } from './image-store.ts';

interface LocalImageStoreOptions {
  dir: string;
  baseUrl: string;
}

function fileFor(root: string, key: string): string {
  const file = path.resolve(root, key);
  if (!file.startsWith(root + path.sep)) {
    throw new Error(`Image key is outside the image folder: ${key}`);
  }

  return file;
}

function createLocalImageStore({
  dir,
  baseUrl,
}: LocalImageStoreOptions): ImageStore {
  const root = path.resolve(dir);

  return {
    async put(key, data) {
      const file = fileFor(root, key);
      const temp = `${file}.${randomUUID()}.tmp`;

      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(temp, data);
      await fs.rename(temp, file);
    },

    async removeFolder(prefix) {
      await fs.rm(fileFor(root, prefix), { recursive: true, force: true });
    },

    urlFor(key) {
      return `${baseUrl}/${key}`;
    },
  };
}

export { createLocalImageStore };
