function checkLimit(name: string, value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      `${name} must be a whole number of at least 1, got ${value}.`,
    );
  }

  return value;
}

export { checkLimit };
