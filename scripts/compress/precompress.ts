import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

const COMPRESSIBLE = new Set(['.js', '.css', '.html', '.json', '.svg']);
const MIN_BYTES = 1024;

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

function isCompressible(file: string, size: number): boolean {
  return COMPRESSIBLE.has(path.extname(file)) && size >= MIN_BYTES;
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

async function compressFile(file: string): Promise<void> {
  const content = await fs.readFile(file);

  const br = await brotli(content, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: content.length,
    },
  });
  const gz = await gzip(content, { level: zlib.constants.Z_BEST_COMPRESSION });

  await fs.writeFile(`${file}.br`, br);
  await fs.writeFile(`${file}.gz`, gz);
}

async function precompress(dir: string): Promise<string[]> {
  const compressed: string[] = [];

  for (const file of await listFiles(dir)) {
    const { size } = await fs.stat(file);
    if (isCompressible(file, size)) {
      await compressFile(file);
      compressed.push(path.relative(dir, file));
    }
  }

  return compressed;
}

export { precompress };
