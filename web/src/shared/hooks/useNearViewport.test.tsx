import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNearViewport } from './useNearViewport.ts';

class FakeObserver {
  static made: FakeObserver[] = [];
  readonly observed: Element[] = [];
  readonly callback: IntersectionObserverCallback;
  readonly options: IntersectionObserverInit | undefined;
  disconnected = false;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.options = options;
    FakeObserver.made.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  disconnect() {
    this.disconnected = true;
  }

  report(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

interface ProbeProps {
  onNear: () => void;
  enabled?: boolean;
  watch?: unknown;
}

function Probe({ onNear, enabled = true, watch = 0 }: ProbeProps) {
  const target = useNearViewport<HTMLDivElement>(onNear, { enabled, watch });

  return <div ref={target} data-testid="end" />;
}

function lastObserver(): FakeObserver {
  const observer = FakeObserver.made.at(-1);
  if (!observer) {
    throw new Error('No observer was made.');
  }

  return observer;
}

describe('useNearViewport', () => {
  beforeEach(() => {
    FakeObserver.made = [];
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls back when the element comes within 800px of the screen', () => {
    const onNear = vi.fn();
    const { getByTestId } = render(<Probe onNear={onNear} />);
    const observer = lastObserver();

    observer.report(false);
    expect(onNear).not.toHaveBeenCalled();

    observer.report(true);
    expect(onNear).toHaveBeenCalledTimes(1);
    expect(observer.observed).toEqual([getByTestId('end')]);
    expect(observer.options).toEqual({ rootMargin: '800px' });
  });

  it('watches nothing while it is turned off', () => {
    render(<Probe onNear={vi.fn()} enabled={false} />);

    expect(FakeObserver.made).toEqual([]);
  });

  it('starts watching again when the watched value changes', () => {
    const onNear = vi.fn();
    const { rerender, unmount } = render(<Probe onNear={onNear} watch={1} />);
    const first = lastObserver();

    rerender(<Probe onNear={onNear} watch={2} />);
    const second = lastObserver();

    expect(first.disconnected).toBe(true);
    expect(second).not.toBe(first);

    unmount();
    expect(second.disconnected).toBe(true);
  });

  it('calls the newest callback without watching again', () => {
    const before = vi.fn();
    const after = vi.fn();
    const { rerender } = render(<Probe onNear={before} />);

    rerender(<Probe onNear={after} />);
    lastObserver().report(true);

    expect(FakeObserver.made).toHaveLength(1);
    expect(before).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('does nothing where the browser has no IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    expect(() => render(<Probe onNear={vi.fn()} />)).not.toThrow();
  });
});
