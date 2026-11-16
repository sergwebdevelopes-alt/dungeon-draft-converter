interface ErrorContext {
  where: string;
  [detail: string]: string | number | undefined;
}

interface ErrorReporter {
  report(error: unknown, context: ErrorContext): void;
}

const NO_ERROR_REPORTER: ErrorReporter = {
  report: () => undefined,
};

export { NO_ERROR_REPORTER };
export type { ErrorContext, ErrorReporter };
