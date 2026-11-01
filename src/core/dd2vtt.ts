import { randomUUID } from 'crypto';
import { createReadStream, createWriteStream, type WriteStream } from 'fs';
import { once } from 'events';
import path from 'path';

const QUOTE = 0x22;
const BACKSLASH = 0x5c;
const SLASH = 0x2f;
const BASE64_CHUNK_BYTES = 3 * 64 * 1024;
const MAX_METADATA_BYTES = 8 * 1024 * 1024;

interface Dd2vttData {
  format?: number;
  resolution?: {
    pixels_per_grid?: number;
  };
  image?: unknown;
}

type MapImage = string;

interface LoadedMap {
  fileNameWithExt: string;
  fileNameWithoutExt: string;
  image: MapImage;
  pixelsPerGrid?: number;
  metadata: Record<string, unknown>;
}

class InvalidMapFileError extends Error {
  name = 'InvalidMapFileError';
}

function parseJson(
  fileName: string,
  content: string,
): Dd2vttData & Record<string, unknown> {
  try {
    return JSON.parse(content) as Dd2vttData & Record<string, unknown>;
  } catch (error) {
    throw new InvalidMapFileError(
      `Invalid JSON in "${fileName}": ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function readPixelsPerGrid(
  fileName: string,
  json: Dd2vttData,
): number | undefined {
  const pixelsPerGrid = json.resolution?.pixels_per_grid;
  if (
    pixelsPerGrid !== undefined &&
    (!Number.isFinite(pixelsPerGrid) || pixelsPerGrid <= 0)
  ) {
    throw new InvalidMapFileError(
      `The "resolution.pixels_per_grid" field in "${fileName}" must be a positive number, got: ${JSON.stringify(pixelsPerGrid)}`,
    );
  }
  return pixelsPerGrid;
}

function missingImageError(fileName: string): InvalidMapFileError {
  return new InvalidMapFileError(
    `The file "${fileName}" does not contain a base64 "image" string.`,
  );
}

function emptyImageError(fileName: string): InvalidMapFileError {
  return new InvalidMapFileError(
    `The "image" field in "${fileName}" is not valid base64 image data.`,
  );
}

function toLoadedMap(
  fileName: string,
  json: Dd2vttData & Record<string, unknown>,
  image: MapImage,
): LoadedMap {
  const pixelsPerGrid = readPixelsPerGrid(fileName, json);
  const metadata: Record<string, unknown> = { ...json };
  delete metadata.image;

  return {
    fileNameWithExt: fileName,
    fileNameWithoutExt: path.parse(fileName).name,
    image,
    pixelsPerGrid,
    metadata,
  };
}

function newImagePath(workDir: string, extension = 'png'): MapImage {
  return path.join(workDir, `${randomUUID()}.${extension}`);
}

class Dd2vttScanner {
  private readonly metadata: Buffer[] = [];
  private metadataBytes = 0;
  private depth = 0;
  private inString = false;
  private escaped = false;
  private expectKey = false;
  private readingKey = false;
  private key = '';
  private lastKey = '';
  private awaitingValue = false;
  private inImage = false;
  private imageFound = false;
  private carry = Buffer.alloc(0);

  private readonly fileName: string;
  private readonly maxMetadataBytes: number;

  constructor(fileName: string, maxMetadataBytes: number) {
    this.fileName = fileName;
    this.maxMetadataBytes = maxMetadataBytes;
  }

  scan(chunk: Buffer, writeImage: (data: Buffer) => void): void {
    let start = 0;
    let i = 0;
    while (i < chunk.length) {
      if (this.inImage) {
        i = this.scanImage(chunk, i, writeImage);
        start = i;
        continue;
      }

      const byte = chunk[i];
      if (this.inString) {
        if (this.escaped) {
          this.escaped = false;
        } else if (byte === BACKSLASH) {
          this.escaped = true;
        } else if (byte === QUOTE) {
          this.inString = false;
          if (this.readingKey) {
            this.readingKey = false;
            this.lastKey = this.key;
          }
        } else if (this.readingKey && this.key.length <= 16) {
          this.key += String.fromCharCode(byte);
        }
        i++;
        continue;
      }

      if (byte === QUOTE) {
        if (this.awaitingValue && this.depth === 1) {
          this.awaitingValue = false;
          this.keepMetadata(chunk.subarray(start, i));
          this.keepMetadata(Buffer.from('null'));
          this.inImage = true;
          this.imageFound = true;
          i++;
          start = i;
          continue;
        }
        this.inString = true;
        this.readingKey = this.expectKey && this.depth === 1;
        this.expectKey = false;
        this.key = '';
      } else if (byte === 0x7b || byte === 0x5b) {
        this.depth++;
        this.expectKey = byte === 0x7b && this.depth === 1;
      } else if (byte === 0x7d || byte === 0x5d) {
        this.depth--;
      } else if (byte === 0x2c && this.depth === 1) {
        this.expectKey = true;
      } else if (byte === 0x3a && this.depth === 1) {
        this.awaitingValue = this.lastKey === 'image' && !this.imageFound;
      }
      if (
        this.awaitingValue &&
        byte > 0x20 &&
        byte !== 0x3a &&
        byte !== QUOTE
      ) {
        this.awaitingValue = false;
      }
      i++;
    }
    this.keepMetadata(chunk.subarray(start, i));
  }

  finish(
    writeImage: (data: Buffer) => void,
  ): Dd2vttData & Record<string, unknown> {
    if (this.inImage || this.inString || this.depth !== 0) {
      throw new InvalidMapFileError(
        `Invalid JSON in "${this.fileName}": the file ends unexpectedly.`,
      );
    }
    if (this.carry.length > 0) {
      writeImage(Buffer.from(this.carry.toString('latin1'), 'base64'));
    }
    const json = parseJson(
      this.fileName,
      Buffer.concat(this.metadata).toString('utf8'),
    );
    if (!this.imageFound) {
      throw missingImageError(this.fileName);
    }
    return json;
  }

  private scanImage(
    chunk: Buffer,
    from: number,
    writeImage: (data: Buffer) => void,
  ): number {
    if (this.escaped) {
      this.escaped = false;
      if (chunk[from] !== SLASH) {
        throw new InvalidMapFileError(
          `The "image" field in "${this.fileName}" is not valid base64 image data.`,
        );
      }
      this.decode(Buffer.from('/'), writeImage);
      return from + 1;
    }

    const quote = chunk.indexOf(QUOTE, from);
    const backslash = chunk.indexOf(BACKSLASH, from);
    const candidates = [quote, backslash].filter((index) => index !== -1);
    const end = candidates.length > 0 ? Math.min(...candidates) : chunk.length;
    this.decode(chunk.subarray(from, end), writeImage);
    if (end === chunk.length) {
      return end;
    }
    if (chunk[end] === BACKSLASH) {
      this.escaped = true;
    } else {
      this.inImage = false;
    }
    return end + 1;
  }

  private decode(base64: Buffer, writeImage: (data: Buffer) => void): void {
    const text = Buffer.concat([this.carry, base64]);
    const usable = text.length - (text.length % 4);
    if (usable > 0) {
      writeImage(
        Buffer.from(text.subarray(0, usable).toString('latin1'), 'base64'),
      );
    }
    this.carry = Buffer.from(text.subarray(usable));
  }

  private keepMetadata(bytes: Buffer): void {
    if (bytes.length === 0) {
      return;
    }
    this.metadataBytes += bytes.length;
    if (this.metadataBytes > this.maxMetadataBytes) {
      throw new InvalidMapFileError(
        `"${this.fileName}" has more than ${this.maxMetadataBytes / 1024 / 1024} MB of walls, lights and other data besides the image.`,
      );
    }
    this.metadata.push(Buffer.from(bytes));
  }
}

async function write(stream: WriteStream, data: Buffer): Promise<void> {
  if (!stream.write(data)) {
    await once(stream, 'drain');
  }
}

async function close(stream: WriteStream): Promise<void> {
  if (stream.destroyed) {
    return;
  }
  stream.end();
  await once(stream, 'close');
}

async function readDd2vttStream(
  fileName: string,
  source: AsyncIterable<Buffer> | Iterable<Buffer>,
  paths: { raw: string; image: MapImage },
): Promise<LoadedMap & { rawBytes: number }> {
  const raw = createWriteStream(paths.raw);
  const image = createWriteStream(paths.image);
  const scanner = new Dd2vttScanner(fileName, MAX_METADATA_BYTES);
  let rawBytes = 0;
  let imageBytes = 0;

  try {
    for await (const chunk of source) {
      rawBytes += chunk.length;
      await write(raw, chunk);
      const decoded: Buffer[] = [];
      scanner.scan(chunk, (data) => decoded.push(data));
      for (const data of decoded) {
        imageBytes += data.length;
        await write(image, data);
      }
    }
    const tail: Buffer[] = [];
    const metadata = scanner.finish((data) => tail.push(data));
    for (const data of tail) {
      imageBytes += data.length;
      await write(image, data);
    }
    if (imageBytes === 0) {
      throw emptyImageError(fileName);
    }
    return { ...toLoadedMap(fileName, metadata, paths.image), rawBytes };
  } finally {
    await Promise.all([close(raw), close(image)]);
  }
}

async function* serializeDd2vtt(
  metadata: Record<string, unknown>,
  image: MapImage,
): AsyncGenerator<Buffer> {
  const json = JSON.stringify(metadata);
  const head = json === '{}' ? '{' : `${json.slice(0, -1)},`;
  yield Buffer.from(`${head}"image":"`);

  const source = createReadStream(image, { highWaterMark: BASE64_CHUNK_BYTES });
  let carry = Buffer.alloc(0);
  for await (const chunk of source as AsyncIterable<Buffer>) {
    const bytes = carry.length > 0 ? Buffer.concat([carry, chunk]) : chunk;
    const usable = bytes.length - (bytes.length % 3);
    yield Buffer.from(bytes.subarray(0, usable).toString('base64'));
    carry = Buffer.from(bytes.subarray(usable));
  }
  yield Buffer.from(`${carry.toString('base64')}"}`);
}

export { InvalidMapFileError, newImagePath, readDd2vttStream, serializeDd2vtt };
export type { LoadedMap, MapImage };
