function elapsed(from?: number, to?: number): number | undefined {
  return from !== undefined && to !== undefined ? to - from : undefined;
}

export { elapsed };
