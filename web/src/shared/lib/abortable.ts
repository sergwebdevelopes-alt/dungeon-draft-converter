function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

async function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    throw abortError();
  }

  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortError());
  });
  signal.addEventListener('abort', onAbort, { once: true });

  try {
    return await Promise.race([work, aborted]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

export { abortable };
