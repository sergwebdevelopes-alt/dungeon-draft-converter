import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRotation } from './useRotation.ts';

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
  }));
}

describe('useRotation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('moves to the next item on each interval and wraps', () => {
    const { result } = renderHook(() => useRotation(3, 1000));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.index).toBe(1);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.index).toBe(0);
  });

  it('jumps to a chosen item and restarts the wait', () => {
    const { result } = renderHook(() => useRotation(3, 1000));

    act(() => {
      vi.advanceTimersByTime(900);
    });
    act(() => {
      result.current.select(2);
    });
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(result.current.index).toBe(2);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.index).toBe(0);
  });

  it('stays still for people who prefer less motion', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useRotation(3, 1000));

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.index).toBe(0);
  });

  it('waits while the tab is hidden', () => {
    const { result } = renderHook(() => useRotation(3, 1000));
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.index).toBe(0);
  });
});
