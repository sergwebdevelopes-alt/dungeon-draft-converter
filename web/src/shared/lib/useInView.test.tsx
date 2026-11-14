import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInView } from './useInView.ts';

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

  report(visibleShare: number) {
    act(() => {
      this.callback(
        [
          {
            isIntersecting: visibleShare > 0,
            intersectionRatio: visibleShare,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      );
    });
  }
}

function Probe() {
  const { target, onScreen, inView } = useInView<HTMLDivElement>(0.5);

  return (
    <div ref={target} data-testid="probe">
      {onScreen ? 'on screen' : 'off screen'}, {inView ? 'in view' : 'away'}
    </div>
  );
}

function lastObserver(): FakeObserver {
  const observer = FakeObserver.made.at(-1);
  if (!observer) {
    throw new Error('No observer was made.');
  }

  return observer;
}

describe('useInView', () => {
  beforeEach(() => {
    FakeObserver.made = [];
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('counts the element as hidden until the browser reports it', () => {
    render(<Probe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('off screen, away');
    expect(lastObserver().observed).toEqual([screen.getByTestId('probe')]);
    expect(lastObserver().options).toEqual({ threshold: [0, 0.5] });
  });

  it('is on screen as soon as any part shows, and in view from the asked share', () => {
    render(<Probe />);
    const observer = lastObserver();

    observer.report(0.2);
    expect(screen.getByTestId('probe')).toHaveTextContent('on screen, away');

    observer.report(0.5);
    expect(screen.getByTestId('probe')).toHaveTextContent('on screen, in view');

    observer.report(0);
    expect(screen.getByTestId('probe')).toHaveTextContent('off screen, away');
  });

  it('stops watching when the element goes away', () => {
    const { unmount } = render(<Probe />);
    const observer = lastObserver();

    unmount();

    expect(observer.disconnected).toBe(true);
  });

  it('counts the element as visible where the browser has no IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    render(<Probe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('on screen, in view');
  });
});
