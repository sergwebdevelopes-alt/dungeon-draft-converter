import os from 'node:os';
import path from 'node:path';

const ROOT_DIR = path.join(import.meta.dirname, '..');
const WEB_DIST_DIR = path.join(ROOT_DIR, 'web/dist');
const UPLOAD_ROOT = os.tmpdir();

const PORT = Number(process.env.PORT ?? 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_BYTES = 400 * 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const MAX_LEVELS = 10;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_PIXELS = 25_000_000;
const MAX_MAP_NAME_LENGTH = 100;
const STALE_UPLOAD_DIR_MS = 2 * 60 * 60 * 1000;
const STALE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const MAX_PENDING_CONVERSIONS = 10;
const MAX_PARALLEL_CONVERSIONS = Number(
  process.env.MAX_PARALLEL_CONVERSIONS ?? 1,
);
const CONVERSION_TIMEOUT_MS =
  Number(process.env.CONVERSION_TIMEOUT_SECONDS ?? 300) * 1000;
const MAX_PARALLEL_IMAGES = Number(process.env.MAX_PARALLEL_IMAGES ?? 2);
const SHARP_CONCURRENCY = Number(process.env.SHARP_CONCURRENCY ?? 0);
const SHUTDOWN_TIMEOUT_MS =
  Number(process.env.SHUTDOWN_TIMEOUT_SECONDS ?? 300) * 1000;

const HTTP_CLIENT_TIMEOUT_MS =
  Number(process.env.HTTP_CLIENT_TIMEOUT_SECONDS ?? 30) * 1000;

const PATREON_SITE_URL = 'https://www.patreon.com';
const PATREON_API_URL = `${PATREON_SITE_URL}/api/oauth2/v2`;
const PATREON_WEBSITE_API_URL = `${PATREON_SITE_URL}/api`;
const PATREON_API_PAGE_SIZE = 50;
const PATREON_WEBSITE_PAGE_SIZE = 20;
const PATREON_WEBSITE_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0 Safari/537.36';
const PATREON_CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID ?? '';
const PATREON_CREATOR_TOKEN = process.env.PATREON_CREATOR_TOKEN ?? '';

const GALLERY_TAG = process.env.GALLERY_TAG ?? 'portfolio';
const GALLERY_GENERIC_TAGS = [
  'battle map',
  'battlemap',
  'battlemaps',
  'dnd',
  'dnd maps',
  'dndart',
  'dndmaps',
  'dungeondraft',
  'foundry',
  'foundryvtt',
  'free',
  'map',
  'maps',
  'roll20',
  'rpg',
  'rpgmaps',
  'ttrpg',
  'vtt',
];

export {
  CONVERSION_TIMEOUT_MS,
  GALLERY_GENERIC_TAGS,
  GALLERY_TAG,
  HTTP_CLIENT_TIMEOUT_MS,
  IS_PRODUCTION,
  MAX_LEVELS,
  MAX_LOGO_BYTES,
  MAX_LOGO_PIXELS,
  MAX_MAP_NAME_LENGTH,
  MAX_PARALLEL_CONVERSIONS,
  MAX_PARALLEL_IMAGES,
  MAX_PENDING_CONVERSIONS,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  MULTIPART_OVERHEAD_BYTES,
  PATREON_API_PAGE_SIZE,
  PATREON_API_URL,
  PATREON_CAMPAIGN_ID,
  PATREON_CREATOR_TOKEN,
  PATREON_SITE_URL,
  PATREON_WEBSITE_API_URL,
  PATREON_WEBSITE_PAGE_SIZE,
  PATREON_WEBSITE_USER_AGENT,
  PORT,
  ROOT_DIR,
  SHARP_CONCURRENCY,
  SHUTDOWN_TIMEOUT_MS,
  STALE_CLEANUP_INTERVAL_MS,
  STALE_UPLOAD_DIR_MS,
  UPLOAD_ROOT,
  WEB_DIST_DIR,
};
