import path from 'node:path';
import type { Request } from 'express';
import { MAX_LOGO_BYTES, MAX_MAP_NAME_LENGTH } from '../../config.ts';
import { MAP_EXTENSION, type LoadedMap } from '../../core/dd2vtt.ts';
import {
  checkLogoImage,
  checkLogoPercent,
  FORMAT_PRESETS,
  LOGO_LIMITS,
  VARIANTS,
  type FormatPreset,
  type LogoOptions,
  type LogoSetting,
  type Variant,
} from '../../core/images.ts';
import type { ConversionQueue } from '../../queue/conversion-queue.ts';
import { formatMegabytes } from '../../utils/format.ts';
import { HttpError } from '../errors.ts';
import {
  LOGO_FIELD,
  MAP_FIELD,
  type UploadedFile,
  type Uploads,
} from '../upload/index.ts';

const TICKET_PATTERN = /^[0-9a-f]{32}$/;

type Query = Request['query'];

interface ConvertRequest {
  presets: FormatPreset[];
  variants: Variant[];
  ticket?: string;
  levels: LoadedMap[];
  original?: string;
  logo?: LogoOptions;
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseList<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  label: string,
): T[] {
  if (!raw) {
    return [...allowed];
  }

  const values = raw.split(',').filter(Boolean);
  const unknown = values.filter((v) => !allowed.includes(v as T));

  if (unknown.length > 0 || values.length === 0) {
    throw new HttpError(400, `Unknown ${label}: ${unknown.join(', ')}`);
  }

  return values as T[];
}

function parsePresets(raw: unknown): FormatPreset[] {
  const names = parseList(
    queryString(raw),
    FORMAT_PRESETS.map((p) => p.name),
    'presets',
  );

  return FORMAT_PRESETS.filter((p) => names.includes(p.name));
}

function parseVariants(raw: unknown): Variant[] {
  return parseList<Variant>(queryString(raw), VARIANTS, 'variants');
}

function parseLogoPercent(raw: unknown, setting: LogoSetting): number {
  if (raw === undefined || raw === '') {
    return LOGO_LIMITS[setting].default;
  }

  const value =
    typeof raw === 'string' && /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;

  checkLogoPercent(setting, value);

  return value;
}

function parseTicket(raw: unknown, queue: ConversionQueue): string | undefined {
  const ticket = queryString(raw);

  if (ticket === undefined) {
    return undefined;
  }

  if (!TICKET_PATTERN.test(ticket)) {
    throw new HttpError(400, 'The queue ticket is not valid.');
  }

  if (queue.hasTicket(ticket)) {
    throw new HttpError(409, 'This queue ticket is already in use.');
  }

  return ticket;
}

function parseOptions(query: Query, queue: ConversionQueue) {
  return {
    presets: parsePresets(query.presets),
    variants: parseVariants(query.variants),
    logoPlacement: {
      size: parseLogoPercent(query.logoSize, 'size'),
      margin: parseLogoPercent(query.logoMargin, 'margin'),
    },
    ticket: parseTicket(query.ticket, queue),
  };
}

function safeMapFileName(raw: string | undefined): string {
  const base = path.basename(raw ?? `map${MAP_EXTENSION}`);

  if (!base.toLowerCase().endsWith(MAP_EXTENSION)) {
    throw new HttpError(
      400,
      `"${base.slice(0, MAX_MAP_NAME_LENGTH)}" is not a .dd2vtt file.`,
    );
  }

  const stem = base
    .slice(0, -MAP_EXTENSION.length)
    .replace(/[^\p{L}\p{N} _.()-]/gu, '_')
    .slice(0, MAX_MAP_NAME_LENGTH)
    .replace(/^[. ]+|[. ]+$/g, '');

  return `${stem || 'map'}${MAP_EXTENSION}`;
}

function parseLevels(
  files: UploadedFile[],
  mainName: string | undefined,
): LoadedMap[] {
  if (files.length === 0) {
    throw new HttpError(400, 'Please upload a .dd2vtt map file.');
  }

  return files.map((file, index) => {
    const fileName = safeMapFileName(
      index === 0 ? (mainName ?? file.name) : file.name,
    );

    if (!file.map) {
      throw new HttpError(400, `"${fileName}" could not be read.`);
    }

    return {
      ...file.map,
      fileNameWithExt: fileName,
      fileNameWithoutExt: path.parse(fileName).name,
    };
  });
}

async function parseLogoImage(
  file: UploadedFile | undefined,
): Promise<Buffer | undefined> {
  if (!file?.buffer) {
    return undefined;
  }

  if (file.size > MAX_LOGO_BYTES) {
    throw new HttpError(
      413,
      `Logo is too large (max ${formatMegabytes(MAX_LOGO_BYTES)}).`,
    );
  }

  await checkLogoImage(file.buffer);

  return file.buffer;
}

async function parseUploads(query: Query, files: Uploads) {
  const mapFiles = files[MAP_FIELD] ?? [];
  const levels = parseLevels(mapFiles, queryString(query.name));

  return {
    levels,
    original: levels.length === 1 ? mapFiles[0].path : undefined,
    logoImage: await parseLogoImage(files[LOGO_FIELD]?.[0]),
  };
}

async function parseConvertRequest(
  { query, files }: { query: Query; files: Uploads },
  queue: ConversionQueue,
): Promise<ConvertRequest> {
  const { presets, variants, logoPlacement, ticket } = parseOptions(
    query,
    queue,
  );
  const { levels, original, logoImage } = await parseUploads(query, files);

  const logo = logoImage && { image: logoImage, ...logoPlacement };

  return { presets, variants, ticket, levels, original, logo };
}

export { parseConvertRequest };
export type { ConvertRequest };
