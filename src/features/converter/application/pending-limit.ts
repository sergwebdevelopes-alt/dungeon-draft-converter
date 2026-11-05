import { checkLimit } from './check-limit.ts';

class PendingLimit {
  private pending = 0;
  private readonly max: number;

  constructor(max: number) {
    this.max = checkLimit('maxPending', max);
  }

  reserve(): (() => void) | undefined {
    if (this.pending >= this.max) {
      return undefined;
    }

    this.pending++;
    let released = false;

    return () => {
      if (released) {
        return;
      }

      released = true;
      this.pending--;
    };
  }
}

export { PendingLimit };
