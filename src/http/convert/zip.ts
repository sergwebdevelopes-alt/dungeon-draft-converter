import type { Response } from 'express';
import { createFflateZipWriter } from '../../zip/fflate-zip-writer.ts';
import type { CreateZipWriter, ZipWriter } from '../../zip/zip-writer.ts';

const createZipWriter: CreateZipWriter = createFflateZipWriter;

interface ZipEntry {
  path: string;
  data: Buffer | AsyncIterable<Buffer>;
}

function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\w.-]/g, '_');

  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function startDownload(res: Response, fileName: string): void {
  res.status(200).set({
    'Content-Type': 'application/zip',
    'Content-Disposition': contentDisposition(fileName),
  });
}

function zipToResponse(res: Response): ZipWriter {
  return createZipWriter({
    write: (chunk) => res.write(chunk),
    end: () => res.end(),
    fail: (error) => res.destroy(error),
  });
}

function waitForDrain(res: Response): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      res.off('drain', done);
      res.off('close', done);
      resolve();
    };

    res.on('drain', done);
    res.on('close', done);
  });
}

function asChunks(
  data: ZipEntry['data'],
): Iterable<Buffer> | AsyncIterable<Buffer> {
  return Buffer.isBuffer(data) ? [data] : data;
}

async function writeEntry(
  zip: ZipWriter,
  path: string,
  data: ZipEntry['data'],
  res: Response,
  stopped: () => boolean,
): Promise<void> {
  const file = zip.addFile(path);

  for await (const chunk of asChunks(data)) {
    if (stopped()) {
      return;
    }

    file.write(chunk);

    if (res.writableNeedDrain) {
      await waitForDrain(res);
    }
  }

  file.close();
}

async function streamZip(
  res: Response,
  root: string,
  entries: AsyncIterable<ZipEntry>,
  stopped: () => boolean,
): Promise<void> {
  startDownload(res, `${root}.zip`);
  const zip = zipToResponse(res);

  for await (const entry of entries) {
    await writeEntry(zip, `${root}/${entry.path}`, entry.data, res, stopped);

    if (stopped()) {
      return;
    }
  }

  zip.finish();
}

export { streamZip };
export type { ZipEntry };
