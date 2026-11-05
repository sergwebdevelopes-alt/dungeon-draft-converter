class InvalidInputError extends Error {
  name = 'InvalidInputError';
}

class UnprocessableError extends Error {
  name = 'UnprocessableError';
}

export { InvalidInputError, UnprocessableError };
