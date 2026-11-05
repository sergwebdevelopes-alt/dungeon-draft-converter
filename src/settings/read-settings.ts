import { z } from 'zod';
import type { DatabaseConnection } from '../db/database.ts';

interface PatreonSettings {
  campaignId: string;
  clientId: string;
  clientSecret: string;
  creatorToken: string;
  refreshToken: string;
  webhookSecret?: string;
}

interface GallerySettings {
  syncIntervalMinutes: number;
  syncToken?: string;
}

interface Settings {
  database?: DatabaseConnection;
  patreon?: PatreonSettings;
  gallery: GallerySettings;
}

type Env = Record<string, string | undefined>;

const DEFAULTS: Settings = {
  gallery: { syncIntervalMinutes: 60 },
};

const DATABASE_DEFAULTS = { host: '127.0.0.1', port: 5432 };

const PATREON_KEYS = [
  'PATREON_CAMPAIGN_ID',
  'PATREON_CLIENT_ID',
  'PATREON_CLIENT_SECRET',
  'PATREON_CREATOR_TOKEN',
  'PATREON_REFRESH_TOKEN',
] as const;

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

function wholeNumber(min: number, max = Number.MAX_SAFE_INTEGER) {
  const range =
    max === Number.MAX_SAFE_INTEGER
      ? `must be at least ${min}`
      : `must be between ${min} and ${max}`;

  return optionalText.pipe(
    z
      .string()
      .regex(/^\d+$/, 'must be a whole number')
      .transform(Number)
      .pipe(z.number().min(min, range).max(max, range))
      .optional(),
  );
}

const envSchema = z
  .object({
    POSTGRES_HOST: optionalText,
    POSTGRES_PORT: wholeNumber(1, 65_535),
    POSTGRES_USER: optionalText,
    POSTGRES_PASSWORD: optionalText,
    POSTGRES_DB: optionalText,
    PATREON_CAMPAIGN_ID: optionalText,
    PATREON_CLIENT_ID: optionalText,
    PATREON_CLIENT_SECRET: optionalText,
    PATREON_CREATOR_TOKEN: optionalText,
    PATREON_REFRESH_TOKEN: optionalText,
    PATREON_WEBHOOK_SECRET: optionalText,
    GALLERY_SYNC_INTERVAL_MINUTES: wholeNumber(5),
    GALLERY_SYNC_TOKEN: optionalText.pipe(
      z.string().min(32, 'must be at least 32 characters long').optional(),
    ),
  })
  .superRefine((env, ctx) => {
    if (Boolean(env.POSTGRES_USER) !== Boolean(env.POSTGRES_PASSWORD)) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Database settings are incomplete: set POSTGRES_USER and POSTGRES_PASSWORD together.',
      });
    }

    const missing = PATREON_KEYS.filter((key) => !env[key]);
    if (missing.length > 0 && missing.length < PATREON_KEYS.length) {
      ctx.addIssue({
        code: 'custom',
        message: `Patreon settings are incomplete: set ${missing.join(', ')}.`,
      });
    }
    if (missing.length === 0 && !(env.POSTGRES_USER && env.POSTGRES_PASSWORD)) {
      ctx.addIssue({
        code: 'custom',
        message:
          'The Patreon gallery sync needs a database: set POSTGRES_USER and POSTGRES_PASSWORD.',
      });
    }
  });

type ParsedEnv = z.output<typeof envSchema>;

function databaseOf(env: ParsedEnv): DatabaseConnection | undefined {
  const { POSTGRES_USER: user, POSTGRES_PASSWORD: password } = env;
  if (!user || !password) {
    return undefined;
  }

  return {
    host: env.POSTGRES_HOST ?? DATABASE_DEFAULTS.host,
    port: env.POSTGRES_PORT ?? DATABASE_DEFAULTS.port,
    user,
    password,
    database: env.POSTGRES_DB ?? user,
  };
}

function patreonOf(env: ParsedEnv): PatreonSettings | undefined {
  const {
    PATREON_CAMPAIGN_ID: campaignId,
    PATREON_CLIENT_ID: clientId,
    PATREON_CLIENT_SECRET: clientSecret,
    PATREON_CREATOR_TOKEN: creatorToken,
    PATREON_REFRESH_TOKEN: refreshToken,
    PATREON_WEBHOOK_SECRET: webhookSecret,
  } = env;
  if (
    !campaignId ||
    !clientId ||
    !clientSecret ||
    !creatorToken ||
    !refreshToken
  ) {
    return undefined;
  }

  return {
    campaignId,
    clientId,
    clientSecret,
    creatorToken,
    refreshToken,
    ...(webhookSecret ? { webhookSecret } : {}),
  };
}

function toSettings(env: ParsedEnv): Settings {
  const database = databaseOf(env);
  const patreon = patreonOf(env);
  const { gallery } = DEFAULTS;

  return {
    ...(database ? { database } : {}),
    ...(patreon ? { patreon } : {}),
    gallery: {
      syncIntervalMinutes:
        env.GALLERY_SYNC_INTERVAL_MINUTES ?? gallery.syncIntervalMinutes,
      ...(env.GALLERY_SYNC_TOKEN ? { syncToken: env.GALLERY_SYNC_TOKEN } : {}),
    },
  };
}

function toProblem(issue: z.core.$ZodIssue): string {
  const key = issue.path.join('.');

  return key ? `${key} ${issue.message}.` : issue.message;
}

function readSettings(env: Env): { settings: Settings; problems: string[] } {
  const result = envSchema.safeParse(env);

  return result.success
    ? { settings: toSettings(result.data), problems: [] }
    : { settings: DEFAULTS, problems: result.error.issues.map(toProblem) };
}

export { readSettings };
export type { GallerySettings, PatreonSettings, Settings };
