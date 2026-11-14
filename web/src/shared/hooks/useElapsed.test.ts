import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useElapsed } from './useElapsed.ts';

describe('useElapsed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts the time since the start, once a second', () => {
    const { result } = renderHook(() => useElapsed(5_000));
    expect(result.current).toBe(5_000);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(result.current).toBe(7_000);
  });

  it('never shows negative time', () => {
    const { result } = renderHook(() => useElapsed(12_000));

    expect(result.current).toBe(0);
  });
});
