import { checkLimit } from './check-limit.ts';

type QueuePosition =
  | { state: 'waiting'; ahead: number }
  | { state: 'converting' }
  | { state: 'unknown' };

interface QueueOptions {
  maxParallel: number;
}

interface RunOptions {
  ticket?: string;
  signal: AbortSignal;
}

interface Entry {
  ticket?: string;
  signal: AbortSignal;
  converting: boolean;
}

class ConversionQueue {
  private running = 0;
  private readonly waiting: (() => void)[] = [];
  private readonly line: Entry[] = [];
  private readonly maxParallel: number;

  constructor({ maxParallel }: QueueOptions) {
    this.maxParallel = checkLimit('maxParallel', maxParallel);
  }

  async run(
    task: () => Promise<void>,
    { ticket, signal }: RunOptions,
  ): Promise<void> {
    if (signal.aborted) {
      return;
    }

    const entry: Entry = { ticket, signal, converting: false };
    this.line.push(entry);

    try {
      const gotSlot = await this.takeSlot(signal);

      if (!gotSlot) {
        return;
      }

      try {
        if (signal.aborted) {
          return;
        }

        entry.converting = true;
        await task();
      } finally {
        this.giveBackSlot();
      }
    } finally {
      this.line.splice(this.line.indexOf(entry), 1);
    }
  }

  hasTicket(ticket: string): boolean {
    return this.activeEntries().some((entry) => entry.ticket === ticket);
  }

  position(ticket: string): QueuePosition {
    const active = this.activeEntries();
    const index = active.findIndex((entry) => entry.ticket === ticket);

    if (index === -1) {
      return { state: 'unknown' };
    }

    if (active[index].converting) {
      return { state: 'converting' };
    }

    return { state: 'waiting', ahead: index };
  }

  private activeEntries(): Entry[] {
    return this.line.filter((entry) => !entry.signal.aborted);
  }

  private takeSlot(signal: AbortSignal): Promise<boolean> {
    if (this.running < this.maxParallel) {
      this.running++;
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const start = () => {
        signal.removeEventListener('abort', leave);
        resolve(true);
      };

      const leave = () => {
        this.waiting.splice(this.waiting.indexOf(start), 1);
        resolve(false);
      };

      this.waiting.push(start);
      signal.addEventListener('abort', leave, { once: true });
    });
  }

  private giveBackSlot(): void {
    const next = this.waiting.shift();

    if (next) {
      next();
      return;
    }

    this.running--;
  }
}

export { ConversionQueue };
export type { QueueOptions, QueuePosition, RunOptions };
