import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useScrollLock } from './useScrollLock.ts';

function page(contentWidth: number, windowWidth = 1000) {
  const root = document.createElement('html');
  Object.defineProperty(root, 'clientWidth', { value: contentWidth });
  const view = { innerWidth: windowWidth } as Window;

  return { root, view };
}

describe('useScrollLock', () => {
  it('stops the page scrolling while it is used, and gives it back after', () => {
    const { root, view } = page(1000);

    const { unmount } = renderHook(() => useScrollLock(root, view));

    expect(root.style.overflow).toBe('hidden');

    unmount();

    expect(root.style.overflow).toBe('');
  });

  it('restores a style the page already had', () => {
    const { root, view } = page(1000);
    root.style.overflow = 'auto';
    root.style.scrollbarGutter = 'auto';

    const { unmount } = renderHook(() => useScrollLock(root, view));
    unmount();

    expect(root.style.overflow).toBe('auto');
    expect(root.style.scrollbarGutter).toBe('auto');
  });

  it('keeps the space of a visible scrollbar so the page does not shift', () => {
    const { root, view } = page(985);

    const { unmount } = renderHook(() => useScrollLock(root, view));

    expect(root.style.scrollbarGutter).toBe('stable');

    unmount();

    expect(root.style.scrollbarGutter).toBe('');
  });

  it('adds no space when the scrollbars take none', () => {
    const { root, view } = page(1000);

    renderHook(() => useScrollLock(root, view));

    expect(root.style.scrollbarGutter).toBe('');
  });
});
