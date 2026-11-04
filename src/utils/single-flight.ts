function singleFlight(
  work: () => Promise<void>,
  signal?: AbortSignal,
): () => Promise<void> {
  let running: Promise<void> | null = null;
  let runAgain = false;

  async function runUntilDone(): Promise<void> {
    try {
      do {
        runAgain = false;
        await work();
      } while (runAgain && !signal?.aborted);
    } finally {
      running = null;
    }
  }

  return () => {
    if (running) {
      runAgain = true;
      return running;
    }

    running = runUntilDone();
    return running;
  };
}

export { singleFlight };
