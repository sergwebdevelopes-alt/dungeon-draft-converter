import fs from 'fs/promises';
import path from 'path';

interface Dd2vttData {
  format?: number;
  resolution?: {
    pixels_per_grid?: number;
  };
  image?: unknown;
}

interface LoadedMap {
  fileNameWithExt: string;
  fileNameWithoutExt: string;
  buffer: Buffer;
  pixelsPerGrid?: number;
}

function parseDd2vtt(fileName: string, content: string): LoadedMap {
  let json: Dd2vttData;
  try {
    json = JSON.parse(content) as Dd2vttData;
  } catch (error) {
    throw new Error(
      `Invalid JSON in "${fileName}": ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  if (typeof json.image !== 'string' || json.image.length === 0) {
    throw new Error(
      `The file "${fileName}" does not contain a base64 "image" string.`,
    );
  }

  const buffer = Buffer.from(json.image, 'base64');
  if (buffer.length === 0) {
    throw new Error(
      `The "image" field in "${fileName}" is not valid base64 image data.`,
    );
  }

  const pixelsPerGrid = json.resolution?.pixels_per_grid;
  if (
    pixelsPerGrid !== undefined &&
    (!Number.isFinite(pixelsPerGrid) || pixelsPerGrid <= 0)
  ) {
    throw new Error(
      `The "resolution.pixels_per_grid" field in "${fileName}" must be a positive number, got: ${JSON.stringify(pixelsPerGrid)}`,
    );
  }

  return {
    fileNameWithExt: fileName,
    fileNameWithoutExt: path.parse(fileName).name,
    buffer,
    pixelsPerGrid,
  };
}

async function loadDd2vttMaps(sourceDir: string): Promise<LoadedMap[]> {
  const files = await fs.readdir(sourceDir);

  const dd2vttFiles = files.filter((file) =>
    file.toLowerCase().endsWith('.dd2vtt'),
  );

  if (dd2vttFiles.length === 0) {
    throw new Error(`No .dd2vtt files found in directory: "${sourceDir}"`);
  }

  return Promise.all(
    dd2vttFiles.map(async (fileName) => {
      const content = await fs.readFile(
        path.join(sourceDir, fileName),
        'utf-8',
      );
      return parseDd2vtt(fileName, content);
    }),
  );
}

export { parseDd2vtt, loadDd2vttMaps };
export type { LoadedMap };
