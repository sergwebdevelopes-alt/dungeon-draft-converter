import os from 'node:os';
import path from 'node:path';
import { readSettings } from './settings/read-settings.ts';

function numberFromEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();

  return value ? Number(value) : fallback;
}

const ROOT_DIR = path.join(import.meta.dirname, '..');
const WEB_DIST_DIR = path.join(ROOT_DIR, 'web/dist');
const UPLOAD_ROOT = os.tmpdir();
const GALLERY_DIR = path.resolve(
  process.env.GALLERY_DIR ?? path.join(ROOT_DIR, '.data/gallery'),
);
const GALLERY_IMAGES_URL = '/maps';

const PORT = numberFromEnv('PORT', 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const MAX_UPLOAD_BYTES = numberFromEnv('MAX_UPLOAD_MB', 200) * 1024 * 1024;
const MAX_TOTAL_UPLOAD_BYTES =
  numberFromEnv('MAX_TOTAL_UPLOAD_MB', 400) * 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const MAX_LEVELS = 10;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_PIXELS = 25_000_000;
const MAX_MAP_NAME_LENGTH = 100;
const STALE_UPLOAD_DIR_MS = 2 * 60 * 60 * 1000;
const STALE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const MAX_PENDING_CONVERSIONS = numberFromEnv('MAX_PENDING_CONVERSIONS', 10);
const MAX_PARALLEL_CONVERSIONS = numberFromEnv('MAX_PARALLEL_CONVERSIONS', 1);
const CONVERSION_TIMEOUT_MS =
  numberFromEnv('CONVERSION_TIMEOUT_SECONDS', 300) * 1000;
const MAX_PARALLEL_IMAGES = numberFromEnv('MAX_PARALLEL_IMAGES', 2);
const SHARP_CONCURRENCY = numberFromEnv('SHARP_CONCURRENCY', 0);
const SHUTDOWN_TIMEOUT_MS =
  numberFromEnv('SHUTDOWN_TIMEOUT_SECONDS', 300) * 1000;

const GALLERY_REQUEST_INTERVAL_MS =
  numberFromEnv('GALLERY_REQUEST_INTERVAL_SECONDS', 1) * 1000;
const GALLERY_PAGE_SIZE = 24;
const MAX_GALLERY_PAGE_SIZE = 48;

const HTTP_CLIENT_TIMEOUT_MS =
  numberFromEnv('HTTP_CLIENT_TIMEOUT_SECONDS', 30) * 1000;

const PATREON_SITE_URL = 'https://www.patreon.com';
const PATREON_API_URL = `${PATREON_SITE_URL}/api/oauth2/v2`;
const PATREON_WEBSITE_API_URL =
  process.env.PATREON_WEBSITE_API_URL?.trim().replace(/\/+$/, '') ||
  `${PATREON_SITE_URL}/api`;
const PATREON_TOKEN_URL = `${PATREON_SITE_URL}/api/oauth2/token`;
const PATREON_API_PAGE_SIZE = 50;
const PATREON_WEBSITE_PAGE_SIZE = 20;
const PATREON_WEBSITE_USER_AGENT =
  process.env.PATREON_WEBSITE_USER_AGENT ||
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0 Safari/537.36';

const SITE_URL = process.env.SITE_URL || 'https://lairofartificer.com';

const ANALYTICS_SCRIPT_ORIGIN = 'https://static.cloudflareinsights.com';
const ANALYTICS_REPORT_ORIGIN = 'https://cloudflareinsights.com';

const { settings: SETTINGS, problems: SETTINGS_PROBLEMS } = readSettings(
  process.env,
);

export {
  ANALYTICS_REPORT_ORIGIN,
  ANALYTICS_SCRIPT_ORIGIN,
  CONVERSION_TIMEOUT_MS,
  GALLERY_DIR,
  GALLERY_IMAGES_URL,
  GALLERY_PAGE_SIZE,
  GALLERY_REQUEST_INTERVAL_MS,
  HTTP_CLIENT_TIMEOUT_MS,
  IS_PRODUCTION,
  MAX_GALLERY_PAGE_SIZE,
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
  PATREON_SITE_URL,
  PATREON_TOKEN_URL,
  PATREON_WEBSITE_API_URL,
  PATREON_WEBSITE_PAGE_SIZE,
  PATREON_WEBSITE_USER_AGENT,
  PORT,
  ROOT_DIR,
  SETTINGS,
  SETTINGS_PROBLEMS,
  SHARP_CONCURRENCY,
  SHUTDOWN_TIMEOUT_MS,
  SITE_URL,
  STALE_CLEANUP_INTERVAL_MS,
  STALE_UPLOAD_DIR_MS,
  UPLOAD_ROOT,
  WEB_DIST_DIR,
};
