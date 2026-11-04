interface Job {
  stop(): void;
}

interface ScheduleOptions {
  everyMs: number;
  atStart: boolean;
}

function schedule(
  run: () => Promise<void>,
  { everyMs, atStart }: ScheduleOptions,
): Job {
  const runInBackground = () => void run();

  if (atStart) {
    runInBackground();
  }
  const timer = setInterval(runInBackground, everyMs);
  timer.unref();

  return {
    stop() {
      clearInterval(timer);
    },
  };
}

export { schedule };
export type { Job };
