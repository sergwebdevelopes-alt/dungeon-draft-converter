import * as Sentry from '@sentry/node';
import type { ErrorContext, ErrorReporter } from './error-reporter.ts';

interface SentrySettings {
  dsn: string;
  release?: string;
}

function tagsFrom({ where, ...details }: ErrorContext): Record<string, string> {
  const tags: Record<string, string> = { where };
  for (const [name, value] of Object.entries(details)) {
    if (value !== undefined) {
      tags[name] = String(value);
    }
  }

  return tags;
}

function createSentryErrorReporter(settings: SentrySettings): ErrorReporter {
  Sentry.init({
    ...settings,
    defaultIntegrations: false,
    skipOpenTelemetrySetup: true,
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration({ mode: 'strict' }),
      Sentry.linkedErrorsIntegration(),
    ],
  });

  return {
    report(error, context) {
      Sentry.captureException(error, { tags: tagsFrom(context) });
    },
  };
}

export { createSentryErrorReporter };
export type { SentrySettings };
