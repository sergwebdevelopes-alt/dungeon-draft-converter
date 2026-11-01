type TicketState = 'waiting' | 'converting';

type QueuePosition =
  | { state: 'waiting'; ahead: number }
  | { state: 'converting' }
  | { state: 'unknown' };

interface RunOptions {
  ticket?: string;
  stopped: () => boolean;
}

class ConversionQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private pending = 0;
  private readonly tickets = new Map<string, TicketState>();
  private readonly maxPending: number;

  constructor(maxPending: number) {
    this.maxPending = maxPending;
  }

  reserve(): boolean {
    if (this.pending >= this.maxPending) {
      return false;
    }
    this.pending++;
    return true;
  }

  release(): void {
    this.pending--;
  }

  run(task: () => Promise<void>, { ticket, stopped }: RunOptions) {
    if (ticket && !stopped()) {
      this.tickets.set(ticket, 'waiting');
    }
    const result = this.tail.then(async () => {
      if (stopped()) {
        return;
      }
      if (ticket && this.tickets.has(ticket)) {
        this.tickets.set(ticket, 'converting');
      }
      await task();
    });
    this.tail = result.catch(() => undefined);
    return result;
  }

  hasTicket(ticket: string): boolean {
    return this.tickets.has(ticket);
  }

  forget(ticket: string): void {
    this.tickets.delete(ticket);
  }

  position(ticket: string): QueuePosition {
    const state = this.tickets.get(ticket);
    if (state === undefined) {
      return { state: 'unknown' };
    }
    if (state === 'converting') {
      return { state };
    }
    return { state, ahead: [...this.tickets.keys()].indexOf(ticket) };
  }
}

export { ConversionQueue };
export type { QueuePosition };
