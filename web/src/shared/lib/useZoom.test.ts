import { act, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useZoom } from './useZoom.ts';
import { UNZOOMED } from './zoom.ts';

function renderZoom(subject = 0) {
  return renderHook((shown: number) => useZoom(shown), {
    initialProps: subject,
  });
}

function press(key: string, target: Element | Window = window) {
  fireEvent.keyDown(target, { key });
}

describe('useZoom', () => {
  it('starts at the picture’s own size', () => {
    const { result } = renderZoom();

    expect(result.current.view).toBe(UNZOOMED);
  });

  it('zooms in and out by steps, resets, and takes a view as given', () => {
    const { result } = renderZoom();

    act(() => result.current.zoomIn());
    expect(result.current.view.scale).toBe(1.5);

    act(() => result.current.zoomIn());
    expect(result.current.view.scale).toBe(2.25);

    act(() => result.current.zoomOut());
    expect(result.current.view.scale).toBe(1.5);

    act(() => result.current.setView({ scale: 2.5, x: 40, y: -10 }));
    expect(result.current.view).toEqual({ scale: 2.5, x: 40, y: -10 });

    act(() => result.current.reset());
    expect(result.current.view).toBe(UNZOOMED);
  });

  it('toggles between the picture’s own size and twice that', () => {
    const { result } = renderZoom();

    act(() => result.current.toggle());
    expect(result.current.view).toEqual({ scale: 2, x: 0, y: 0 });

    act(() => result.current.toggle());
    expect(result.current.view).toBe(UNZOOMED);
  });

  it('forgets the zoom when another picture is shown, also after coming back', () => {
    const { result, rerender } = renderZoom(0);
    act(() => result.current.zoomIn());

    rerender(1);
    expect(result.current.view).toBe(UNZOOMED);

    rerender(0);
    expect(result.current.view).toBe(UNZOOMED);
  });

  it('answers the plus, minus and zero keys', () => {
    const { result } = renderZoom();

    press('+');
    expect(result.current.view.scale).toBe(1.5);

    press('=');
    expect(result.current.view.scale).toBe(2.25);

    press('-');
    expect(result.current.view.scale).toBe(1.5);

    press('0');
    expect(result.current.view).toBe(UNZOOMED);
  });

  it('leaves the keys to a text field', () => {
    const { result } = renderZoom();
    const field = document.body.appendChild(document.createElement('input'));

    press('+', field);
    field.remove();

    expect(result.current.view).toBe(UNZOOMED);
  });

  it('stops listening for keys when it goes away', () => {
    const stopListening = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderZoom();

    unmount();

    expect(stopListening).toHaveBeenCalledWith('keydown', expect.any(Function));
    stopListening.mockRestore();
  });
});
