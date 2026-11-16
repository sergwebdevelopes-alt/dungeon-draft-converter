import type { ErrorReporter } from './error-reporter.ts';

interface ErrorReportingConfig {
  dsn: string;
  hostname: string;
}

type LoadReporter = (dsn: string) => Promise<ErrorReporter>;

interface Caught {
  error: unknown;
  source: string;
}

const MAX_REPORTS = 10;
const NOT_OURS = [
  'Script error.',
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded',
];

async function loadSentryReporter(dsn: string): Promise<ErrorReporter> {
  const { createSentryErrorReporter } =
    await import('./sentry-error-reporter.ts');

  return createSentryErrorReporter(dsn);
}

function isReported(
  config: ErrorReportingConfig | undefined,
  hostname: string,
): config is ErrorReportingConfig {
  return config !== undefined && hostname === config.hostname;
}

function isOurs(event: ErrorEvent): boolean {
  return !NOT_OURS.includes(event.message);
}

function startErrorReporting(
  config: ErrorReportingConfig | undefined,
  page: Window = window,
  load: LoadReporter = loadSentryReporter,
): void {
  if (!isReported(config, page.location.hostname)) {
    return;
  }

  const waiting: Caught[] = [];
  let reporter: ErrorReporter | null = null;
  let reports = 0;

  function report(caught: Caught) {
    reports += 1;
    if (reports > MAX_REPORTS) {
      return;
    }
    if (reporter) {
      reporter.report(caught.error, caught.source);
    } else {
      waiting.push(caught);
    }
  }

  async function startSending(dsn: string) {
    try {
      reporter = await load(dsn);
    } catch {
      return;
    }
    for (const caught of waiting.splice(0)) {
      reporter.report(caught.error, caught.source);
    }
  }

  page.addEventListener('error', (event) => {
    if (isOurs(event)) {
      report({ error: event.error ?? event.message, source: 'error' });
    }
  });
  page.addEventListener('unhandledrejection', (event) => {
    report({ error: event.reason, source: 'unhandledrejection' });
  });
  void startSending(config.dsn);
}

export { startErrorReporting };
export type { ErrorReportingConfig };
