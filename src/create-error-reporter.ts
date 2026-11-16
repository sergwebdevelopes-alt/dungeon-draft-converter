import { APP_RELEASE, IS_PRODUCTION, SENTRY_DSN } from './config.ts';
import {
  NO_ERROR_REPORTER,
  type ErrorReporter,
} from './infrastructure/error-reporting/error-reporter.ts';
import { createSentryErrorReporter } from './infrastructure/error-reporting/sentry-error-reporter.ts';

function createErrorReporter(): ErrorReporter {
  if (!IS_PRODUCTION || !SENTRY_DSN) {
    return NO_ERROR_REPORTER;
  }

  return createSentryErrorReporter({ dsn: SENTRY_DSN, release: APP_RELEASE });
}

export { createErrorReporter };
