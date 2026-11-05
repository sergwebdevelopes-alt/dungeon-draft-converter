import type { Request } from 'express';
import { InvalidInputError } from '../../../shared/errors.ts';
import type { MapsPageQuery } from '../ports/map-repository.ts';

interface PageSizes {
  pageSize: number;
  maxPageSize: number;
}

class InvalidMapsQueryError extends InvalidInputError {
  name = 'InvalidMapsQueryError';
}

interface Range {
  fallback: number;
  min: number;
  max?: number;
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function rangeText({ min, max }: Range): string {
  return max === undefined ? `${min} or more` : `from ${min} to ${max}`;
}

function wholeNumber(raw: unknown, name: string, range: Range): number {
  const text = queryString(raw);
  if (text === undefined) {
    return range.fallback;
  }

  const value = Number(text);
  const { min, max = Number.MAX_SAFE_INTEGER } = range;
  if (!/^\d+$/.test(text) || value < min || value > max) {
    throw new InvalidMapsQueryError(
      `${name} must be a whole number ${rangeText(range)}.`,
    );
  }

  return value;
}

function parseMapsQuery(
  query: Request['query'],
  { pageSize, maxPageSize }: PageSizes,
): MapsPageQuery {
  const tag = queryString(query.tag);
  const offset = wholeNumber(query.offset, 'offset', { fallback: 0, min: 0 });
  const limit = wholeNumber(query.limit, 'limit', {
    fallback: pageSize,
    min: 1,
    max: maxPageSize,
  });

  return { ...(tag ? { tag } : {}), offset, limit };
}

export { InvalidMapsQueryError, parseMapsQuery };
export type { PageSizes };
