import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request, RequestHandler } from 'express';
import {
  MAX_LEVELS,
  MAX_MAP_NAME_LENGTH,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  MULTIPART_OVERHEAD_BYTES,
} from '../../../../config.ts';
import {
  InvalidMapFileError,
  MAP_EXTENSION,
  readDd2vttStream,
} from '../../image-processing/read-dd2vtt-file.ts';
import type { LoadedMap } from '../../domain/loaded-map.ts';
import { formatMegabytes } from '../../../../shared/utils/format.ts';
import { HttpError } from '../../../../infrastructure/http-server/http-errors.ts';
import { createMulterMultipartParser } from '../../adapters/multer-multipart-parser.ts';
import {
  MultipartLimitError,
  type CreateMultipartParser,
  type MultipartFile,
  type MultipartFiles,
} from '../../ports/multipart-parser.ts';
import { uploadDirOf } from './upload-dir.ts';

const MAP_FIELD = 'maps';
const LOGO_FIELD = 'logo';

interface UploadedFile {
  name: string;
  size: number;
  path?: string;
  buffer?: Buffer;
  map?: LoadedMap;
}

type Uploads = MultipartFiles<UploadedFile>;

const createMultipartParser: CreateMultipartParser =
  createMulterMultipartParser;

const uploadsByRequest = new WeakMap<Request, Uploads>();

async function readAll(source: AsyncIterable<Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of source) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function storeMap(
  req: Request,
  file: MultipartFile,
): Promise<UploadedFile> {
  const fileName = path.basename(file.name);

  if (!fileName.toLowerCase().endsWith(MAP_EXTENSION)) {
    throw new InvalidMapFileError(
      `"${fileName.slice(0, MAX_MAP_NAME_LENGTH)}" is not a ${MAP_EXTENSION} file.`,
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

  return { name: file.name, size: rawBytes, path: paths.raw, map };
}

async function storeLogo(file: MultipartFile): Promise<UploadedFile> {
  const buffer = await readAll(file.stream);

  return { name: file.name, size: buffer.length, buffer };
}

function storeFile(req: Request, file: MultipartFile): Promise<UploadedFile> {
  return file.field === MAP_FIELD ? storeMap(req, file) : storeLogo(file);
}

async function removeFile(file: UploadedFile): Promise<void> {
  const paths = [file.path, file.map?.image].filter(
    (value): value is string => typeof value === 'string',
  );

  await Promise.all(paths.map((p) => fs.rm(p, { force: true })));
}

const parseMultipart = createMultipartParser<UploadedFile>({
  fields: [
    { name: MAP_FIELD, maxCount: MAX_LEVELS },
    { name: LOGO_FIELD, maxCount: 1 },
  ],
  maxFileBytes: MAX_UPLOAD_BYTES,
  maxFiles: MAX_LEVELS + 1,
  store: storeFile,
  remove: removeFile,
});

function uploadError(error: MultipartLimitError): HttpError {
  if (error.limit === 'file-too-large') {
    return new HttpError(
      413,
      `Each file can be at most ${formatMegabytes(MAX_UPLOAD_BYTES)}.`,
    );
  }

  if (
    error.limit === 'too-many-files' ||
    (error.limit === 'unexpected-field' && error.field === MAP_FIELD)
  ) {
    return new HttpError(400, `At most ${MAX_LEVELS} maps can be combined.`);
  }

  return new HttpError(400, `Invalid upload: ${error.message}.`);
}

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

const uploadFiles: RequestHandler = async (req, res, next) => {
  try {
    uploadsByRequest.set(req, await parseMultipart(req, res));
  } catch (error) {
    throw error instanceof MultipartLimitError ? uploadError(error) : error;
  }

  next();
};

function uploadsOf(req: Request): Uploads {
  return uploadsByRequest.get(req) ?? {};
}

export { LOGO_FIELD, MAP_FIELD, limitTotalUpload, uploadFiles, uploadsOf };
export type { UploadedFile, Uploads };
