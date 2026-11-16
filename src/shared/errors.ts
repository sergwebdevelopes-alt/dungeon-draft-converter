class InvalidInputError extends Error {
  name = 'InvalidInputError';
}

class UnprocessableError extends Error {
  name = 'UnprocessableError';
  readonly logDetail: string | undefined;

  constructor(message: string, logDetail?: string) {
    super(message);
    this.logDetail = logDetail;
  }
}

export { InvalidInputError, UnprocessableError };
