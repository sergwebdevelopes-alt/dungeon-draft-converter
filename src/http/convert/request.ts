import path from 'node:path';
import type { Request } from 'express';
import sharp from 'sharp';
import { MAX_LOGO_BYTES, MAX_LOGO_PIXELS } from '../../config.ts';
import {
  checkLogoPercent,
  FORMAT_PRESETS,
  LOGO_LIMITS,
  VARIANTS,
  type FormatPreset,
  type LogoOptions,
  type LogoSetting,
  type Variant,
} from '../../core/images.ts';
import { MAP_EXTENSION, type LoadedMap } from '../../core/dd2vtt.ts';
import type { ConversionQueue } from '../../queue/conversion-queue.ts';
import { HttpError } from '../errors.ts';
import { formatMegabytes, formatMegapixels } from '../../utils/format.ts';
import { MAP_FIELD, type UploadedFile } from '../upload.ts';

const MAX_MAP_NAME_LENGTH = 100;
const LOGO_FORMATS = new Set(['png', 'jpeg', 'webp']);
const TICKET_PATTERN = /^[0-9a-f]{32}$/;

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

function parseLogoPercent(raw: unknown, setting: LogoSetting): number {
  if (raw === undefined || raw === '') {
    return LOGO_LIMITS[setting].default;
  }

  const value =
    typeof raw === 'string' && /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
  checkLogoPercent(setting, value);
  return value;
}

function parseTicket(
  value: unknown,
  queue: ConversionQueue,
): string | undefined {
  const ticket = queryString(value);
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

function takeUploadedFiles(
  req: Request,
  field: typeof MAP_FIELD | 'logo',
): UploadedFile[] {
  const files = req.files;
  if (!files || Array.isArray(files)) {
    return [];
  }
  const taken = files[field] ?? [];
  delete files[field];
  return taken;
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
      index === 0 ? (mainName ?? file.originalname) : file.originalname,
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

async function validateLogo(
  file: Express.Multer.File | undefined,
): Promise<Buffer | undefined> {
  if (!file) {
    return undefined;
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new HttpError(
      413,
      `Logo is too large (max ${formatMegabytes(MAX_LOGO_BYTES)}).`,
    );
  }

  const invalidLogo = new HttpError(
    400,
    'Logo must be a PNG, JPG or WebP image.',
  );
  let metadata;
  try {
    metadata = await sharp(file.buffer).metadata();
  } catch {
    throw invalidLogo;
  }
  if (!LOGO_FORMATS.has(metadata.format)) {
    throw invalidLogo;
  }
  if (metadata.width * metadata.height > MAX_LOGO_PIXELS) {
    throw new HttpError(
      400,
      `Logo dimensions are too large (max ${formatMegapixels(MAX_LOGO_PIXELS)}).`,
    );
  }

  return file.buffer;
}

async function parseConvertRequest(
  req: Request,
  queue: ConversionQueue,
): Promise<ConvertRequest> {
  const presetNames = parseList(
    queryString(req.query.presets),
    FORMAT_PRESETS.map((p) => p.name),
    'presets',
  );
  const presets = FORMAT_PRESETS.filter((p) => presetNames.includes(p.name));
  const variants = parseList<Variant>(
    queryString(req.query.variants),
    VARIANTS,
    'variants',
  );
  const logoSize = parseLogoPercent(req.query.logoSize, 'size');
  const logoMargin = parseLogoPercent(req.query.logoMargin, 'margin');
  const ticket = parseTicket(req.query.ticket, queue);

  const mapFiles = takeUploadedFiles(req, MAP_FIELD);
  const levels = parseLevels(mapFiles, queryString(req.query.name));
  const original = levels.length === 1 ? mapFiles[0].path : undefined;

  const logoImage = await validateLogo(takeUploadedFiles(req, 'logo')[0]);
  const logo = logoImage && {
    image: logoImage,
    size: logoSize,
    margin: logoMargin,
  };

  return { presets, variants, ticket, levels, original, logo };
}

export { parseConvertRequest };
export type { ConvertRequest };
