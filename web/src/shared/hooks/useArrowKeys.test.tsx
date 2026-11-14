import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useArrowKeys } from './useArrowKeys.ts';

function press(key: string, target: Element | Window = window) {
  fireEvent.keyDown(target, { key });
}

describe('useArrowKeys', () => {
  it('calls back for the left and right arrow keys', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    renderHook(() => useArrowKeys(true, onPrevious, onNext));

    press('ArrowLeft');
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();

    press('ArrowRight');
    press('ArrowRight');
    expect(onNext).toHaveBeenCalledTimes(2);

    press('ArrowUp');
    press('ArrowDown');
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it('stays quiet while it is turned off, and after it is gone', () => {
    const onNext = vi.fn();
    const off = renderHook(() => useArrowKeys(false, vi.fn(), onNext));
    press('ArrowRight');
    off.unmount();

    const on = renderHook(() => useArrowKeys(true, vi.fn(), onNext));
    on.unmount();
    press('ArrowRight');

    expect(onNext).not.toHaveBeenCalled();
  });

  it('leaves the arrows to a text field the visitor is typing in', () => {
    const onNext = vi.fn();
    renderHook(() => useArrowKeys(true, vi.fn(), onNext));
    render(<input aria-label="Name" />);

    press('ArrowRight', screen.getByRole('textbox', { name: 'Name' }));

    expect(onNext).not.toHaveBeenCalled();
  });

  it('uses the newest callbacks without listening again', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ onNext }) => useArrowKeys(true, vi.fn(), onNext),
      { initialProps: { onNext: first } },
    );

    rerender({ onNext: second });
    press('ArrowRight');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
