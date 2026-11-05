import { Zip, ZipPassThrough } from 'fflate';
import type { CreateZipWriter } from '../ports/zip-writer.ts';

const createFflateZipWriter: CreateZipWriter = (output) => {
  const zip = new Zip((error, chunk, final) => {
    if (error) {
      output.fail(error);
      return;
    }

    output.write(chunk);

    if (final) {
      output.end();
    }
  });

  return {
    addFile(path) {
      const file = new ZipPassThrough(path);
      zip.add(file);

      return {
        write: (chunk) => file.push(chunk),
        close: () => file.push(new Uint8Array(0), true),
      };
    },
    finish: () => zip.end(),
  };
};

export { createFflateZipWriter };
