import * as Sentry from '@sentry/browser';
import type { ErrorReporter } from './error-reporter.ts';

function createSentryErrorReporter(dsn: string): ErrorReporter {
  Sentry.init({
    dsn,
    defaultIntegrations: false,
    integrations: [
      Sentry.linkedErrorsIntegration(),
      Sentry.httpContextIntegration(),
      Sentry.dedupeIntegration(),
    ],
  });

  return {
    report(error, source) {
      Sentry.captureException(error, { tags: { source } });
    },
  };
}

export { createSentryErrorReporter };
