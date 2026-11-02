import type { Request } from 'express';
import multer, { MulterError, type StorageEngine } from 'multer';
import {
  MultipartLimitError,
  type MultipartFiles,
  type MultipartLimit,
  type MultipartOptions,
  type MultipartParser,
} from './multipart-parser.ts';

interface StoredFile<T> {
  stored: T;
}

const LIMITS: Partial<Record<string, MultipartLimit>> = {
  LIMIT_FILE_SIZE: 'file-too-large',
  LIMIT_FILE_COUNT: 'too-many-files',
  LIMIT_UNEXPECTED_FILE: 'unexpected-field',
};

function toLimitError(error: MulterError): MultipartLimitError {
  return new MultipartLimitError(
    LIMITS[error.code] ?? 'invalid',
    error.message,
    error.field,
  );
}

function toError(error: unknown): Error {
  if (error instanceof MulterError) {
    return toLimitError(error);
  }

  return error instanceof Error ? error : new Error(String(error));
}

function storedFiles<T>(files: Request['files']): MultipartFiles<T> {
  if (!files || Array.isArray(files)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(files).map(([field, list]) => [
      field,
      list.map((file) => (file as unknown as StoredFile<T>).stored),
    ]),
  );
}

function createMulterMultipartParser<T>(
  options: MultipartOptions<T>,
): MultipartParser<T> {
  const storage: StorageEngine = {
    _handleFile(req, file, callback) {
      options
        .store(req, {
          field: file.fieldname,
          name: file.originalname,
          stream: file.stream,
        })
        .then(
          (stored) =>
            callback(null, { stored } as Partial<Express.Multer.File>),
          callback,
        );
    },
    _removeFile(_req, file, callback) {
      options
        .remove((file as unknown as StoredFile<T>).stored)
        .then(() => callback(null), callback);
    },
  };

  const receive = multer({
    storage,
    defParamCharset: 'utf8',
    limits: { fileSize: options.maxFileBytes, files: options.maxFiles },
  }).fields(options.fields);

  return (req, res) =>
    new Promise((resolve, reject) => {
      receive(req, res, (error?: unknown) => {
        if (error) {
          reject(toError(error));
          return;
        }

        resolve(storedFiles<T>(req.files));
      });
    });
}

export { createMulterMultipartParser };
