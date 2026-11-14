import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LevelStack } from './LevelStack.tsx';

const FIRST_MERGE_MS = 1000;
const HOLD_MS = 4800;
const LEVELS = 8;

class FakeObserver {
  static made: FakeObserver[] = [];
  readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeObserver.made.push(this);
  }

  observe() {
    return undefined;
  }

  disconnect() {
    return undefined;
  }
}

function showShare(visibleShare: number) {
  const observer = FakeObserver.made.at(-1);
  if (!observer) {
    throw new Error('No observer was made.');
  }

  act(() => {
    observer.callback(
      [
        {
          isIntersecting: visibleShare > 0,
          intersectionRatio: visibleShare,
        } as IntersectionObserverEntry,
      ],
      observer as unknown as IntersectionObserver,
    );
  });
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function reduceMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
  }));
}

function scene(): HTMLElement {
  return screen.getByTestId('level-scene');
}

function floatingFloors(): HTMLElement[] {
  return [...scene().querySelectorAll<HTMLElement>('.animate-level-float')];
}

function mergedMap(): HTMLElement {
  return screen.getByRole('img', {
    name: 'Castle Ravenloft, 8 levels merged into one map',
  });
}

function renderMerged() {
  render(<LevelStack />);
  showShare(1);
  wait(FIRST_MERGE_MS);
}

describe('LevelStack', () => {
  beforeEach(() => {
    FakeObserver.made = [];
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    reduceMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('draws every level and the merged map', () => {
    render(<LevelStack />);

    expect(scene().querySelectorAll('img[alt=""]')).toHaveLength(LEVELS);
    expect(mergedMap()).toHaveClass('opacity-0');
  });

  it('stays hidden and still until it comes on screen', () => {
    render(<LevelStack />);

    expect(scene().parentElement).toHaveClass('invisible');
    expect(scene()).toHaveClass('transition-none');
    expect(floatingFloors()).toEqual([]);
    expect(scene().querySelector('.animate-light-pulse')).toBeNull();

    showShare(0.2);

    expect(scene().parentElement).not.toHaveClass('invisible');
    expect(scene()).not.toHaveClass('transition-none');
    expect(floatingFloors()).toHaveLength(LEVELS - 1);
  });

  it('waits for half of the block before it starts merging', () => {
    render(<LevelStack />);

    showShare(0.2);
    wait(FIRST_MERGE_MS + HOLD_MS);
    expect(scene()).toHaveAttribute('data-view', 'apart');

    showShare(0.5);
    wait(FIRST_MERGE_MS - 1);
    expect(scene()).toHaveAttribute('data-view', 'apart');

    wait(1);
    expect(scene()).toHaveAttribute('data-view', 'merged');
    expect(mergedMap()).toHaveClass('opacity-100');
  });

  it('goes between merged and apart for as long as it is in view', () => {
    renderMerged();

    wait(HOLD_MS - 1);
    expect(scene()).toHaveAttribute('data-view', 'merged');

    wait(1);
    expect(scene()).toHaveAttribute('data-view', 'apart');

    wait(HOLD_MS);
    expect(scene()).toHaveAttribute('data-view', 'merged');
  });

  it('keeps the view it had when less than half of it is left on screen', () => {
    renderMerged();

    showShare(0.2);
    wait(HOLD_MS * 3);

    expect(scene()).toHaveAttribute('data-view', 'merged');

    showShare(0.6);
    wait(HOLD_MS - 1);

    expect(scene()).toHaveAttribute('data-view', 'merged');

    wait(1);

    expect(scene()).toHaveAttribute('data-view', 'apart');
  });

  it('comes apart again once it has left the screen', () => {
    renderMerged();

    showShare(0);

    expect(scene()).toHaveAttribute('data-view', 'apart');
    expect(scene()).toHaveClass('transition-none');

    showShare(1);
    wait(FIRST_MERGE_MS);

    expect(scene()).toHaveAttribute('data-view', 'merged');
  });

  it('stays apart for visitors who asked for less motion', () => {
    reduceMotion(true);
    render(<LevelStack />);

    showShare(1);
    wait(FIRST_MERGE_MS + HOLD_MS * 2);

    expect(scene()).toHaveAttribute('data-view', 'apart');
  });

  it('floats every level but the ground, each only after it has risen', () => {
    render(<LevelStack />);
    showShare(1);

    const delays = floatingFloors().map((floor) =>
      parseInt(floor.style.animationDelay, 10),
    );
    expect(delays).toHaveLength(LEVELS - 1);
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(1100);
    expect(new Set(delays).size).toBe(LEVELS - 1);
  });

  it('stops floating and hides the levels under the merged map', () => {
    renderMerged();

    expect(floatingFloors()).toEqual([]);
    const floors = [...scene().querySelectorAll<HTMLElement>('[data-float]')];
    expect(floors).toHaveLength(LEVELS - 1);
    for (const floor of floors) {
      expect(floor.style.visibility).toBe('hidden');
      expect(floor.style.transition).toBe('visibility 0s linear 2015ms');
    }
  });

  it('eases each level from where it floated down to its place', () => {
    const animate = vi.fn();
    Element.prototype.animate = animate;
    vi.stubGlobal(
      'DOMMatrixReadOnly',
      class {
        m43 = 4;
      },
    );

    try {
      renderMerged();
    } finally {
      Reflect.deleteProperty(Element.prototype, 'animate');
    }

    expect(animate).toHaveBeenCalledTimes(LEVELS - 1);
    expect(animate).toHaveBeenCalledWith(
      [{ transform: 'translateZ(4px)' }, { transform: 'translateZ(0px)' }],
      { duration: 500, easing: 'ease-out' },
    );
  });

  it('keeps the lights pulsing while the levels come together', () => {
    renderMerged();

    const glows = screen.getAllByTestId('level-glow');
    expect(glows).toHaveLength(6);
    for (const glow of glows) {
      expect(glow).toHaveClass('animate-light-pulse');
    }
  });

  it('shows the merged map once the levels have landed, with a flash', () => {
    renderMerged();

    expect(mergedMap().style.transform).toBe('translateZ(1px)');
    expect(mergedMap().style.transitionDelay).toBe('1515ms, 0s');
    expect(screen.getByTestId('merge-flash').style.animationDelay).toBe(
      '1395ms',
    );
  });

  it('fades the merged map where it lies before moving it out of the way', () => {
    renderMerged();
    wait(HOLD_MS);

    expect(mergedMap()).toHaveClass('opacity-0');
    expect(mergedMap().style.transitionDuration).toBe('500ms, 0s');
    expect(mergedMap().style.transitionDelay).toBe('0s, 500ms');
    expect(screen.queryByTestId('merge-flash')).toBeNull();
  });

  it('folds the corner guides away and lights the ground when merged', () => {
    render(<LevelStack />);
    showShare(1);

    expect(screen.getByTestId('ground-shade')).toHaveClass('opacity-40');
    for (const guide of screen.getAllByTestId('level-guide')) {
      expect(guide.style.transform).toBe('rotateX(90deg) scaleY(1)');
    }

    wait(FIRST_MERGE_MS);

    expect(screen.getByTestId('ground-shade')).toHaveClass('opacity-0');
    for (const guide of screen.getAllByTestId('level-guide')) {
      expect(guide.style.transform).toBe('rotateX(90deg) scaleY(0)');
    }
  });
});
