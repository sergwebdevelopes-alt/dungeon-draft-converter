const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method);
}

export { isSafeMethod };
