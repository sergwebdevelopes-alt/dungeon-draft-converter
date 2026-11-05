import { act, render, renderHook, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KeyValueStore } from '../storage/index.ts';
import { THEME_KEY } from './theme.ts';
import { ThemeToggle } from './ThemeToggle.tsx';
import { useTheme } from './useTheme.ts';

function memoryStore(
  value?: unknown,
): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>(
    value === undefined ? [] : [[THEME_KEY, value]],
  );
  return {
    data,
    read: (key) => data.get(key) ?? null,
    write: (key, next) => void data.set(key, next),
  };
}

function prefersLight() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-color-scheme: light)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

describe('useTheme', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
    prefersLight();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is dark until the visitor chooses, even when the system is light', () => {
    const { result } = renderHook(() => useTheme(memoryStore()));

    expect(result.current.theme).toBe('dark');
  });

  it('uses a saved choice', () => {
    const { result } = renderHook(() => useTheme(memoryStore('light')));

    expect(result.current.theme).toBe('light');
  });

  it('switches, applies and remembers the theme', () => {
    const store = memoryStore();
    const { result } = renderHook(() => useTheme(store));

    act(() => result.current.toggle());

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(store.data.get(THEME_KEY)).toBe('light');

    act(() => result.current.toggle());

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(store.data.get(THEME_KEY)).toBe('dark');
  });
});

describe('ThemeToggle', () => {
  it('offers the other theme', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <ThemeToggle theme="dark" onToggle={onToggle} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    );
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<ThemeToggle theme="light" onToggle={onToggle} />);
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeInTheDocument();
  });
});
