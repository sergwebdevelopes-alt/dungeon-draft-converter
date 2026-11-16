interface ErrorReporter {
  report(error: unknown, source: string): void;
}

const NO_ERROR_REPORTER: ErrorReporter = {
  report: () => undefined,
};

export { NO_ERROR_REPORTER };
export type { ErrorReporter };
