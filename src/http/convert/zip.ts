import type { Response } from 'express';
import { Zip, ZipPassThrough } from 'fflate';

interface ZipEntry {
  path: string;
  data: Buffer | AsyncIterable<Buffer>;
}

function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\w.-]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function drained(res: Response): Promise<void> {
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

async function streamZip(
  res: Response,
  root: string,
  entries: AsyncIterable<ZipEntry>,
  stopped: () => boolean,
): Promise<void> {
  res.status(200).set({
    'Content-Type': 'application/zip',
    'Content-Disposition': contentDisposition(`${root}.zip`),
  });
  const zip = new Zip((error, chunk, final) => {
    if (error) {
      res.destroy(error);
      return;
    }
    res.write(chunk);
    if (final) {
      res.end();
    }
  });

  for await (const entry of entries) {
    if (stopped()) {
      return;
    }
    const file = new ZipPassThrough(`${root}/${entry.path}`);
    zip.add(file);
    const chunks = Buffer.isBuffer(entry.data) ? [entry.data] : entry.data;
    for await (const chunk of chunks) {
      if (stopped()) {
        return;
      }
      file.push(chunk);
      if (res.writableNeedDrain) {
        await drained(res);
      }
    }
    file.push(new Uint8Array(0), true);
  }
  zip.end();
}

export { streamZip };
export type { ZipEntry };
