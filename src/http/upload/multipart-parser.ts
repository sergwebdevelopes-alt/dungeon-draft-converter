import type { Readable } from 'node:stream';
import type { Request, Response } from 'express';

interface MultipartFile {
  field: string;
  name: string;
  stream: Readable;
}

interface MultipartField {
  name: string;
  maxCount: number;
}

interface MultipartOptions<T> {
  fields: MultipartField[];
  maxFileBytes: number;
  maxFiles: number;
  store(req: Request, file: MultipartFile): Promise<T>;
  remove(file: T): Promise<void>;
}

type MultipartFiles<T> = Partial<Record<string, T[]>>;

type MultipartLimit =
  'file-too-large' | 'too-many-files' | 'unexpected-field' | 'invalid';

class MultipartLimitError extends Error {
  name = 'MultipartLimitError';
  readonly limit: MultipartLimit;
  readonly field?: string;

  constructor(limit: MultipartLimit, message: string, field?: string) {
    super(message);
    this.limit = limit;
    this.field = field;
  }
}

type MultipartParser<T> = (
  req: Request,
  res: Response,
) => Promise<MultipartFiles<T>>;

type CreateMultipartParser = <T>(
  options: MultipartOptions<T>,
) => MultipartParser<T>;

export { MultipartLimitError };
export type {
  CreateMultipartParser,
  MultipartField,
  MultipartFile,
  MultipartFiles,
  MultipartLimit,
  MultipartOptions,
  MultipartParser,
};
