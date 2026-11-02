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

function mockSystem(light: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: light,
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  };
  vi.stubGlobal('matchMedia', () => query);
  return {
    change(next: boolean) {
      query.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('useTheme', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows the system until the visitor chooses', () => {
    const system = mockSystem(true);
    const { result } = renderHook(() => useTheme(memoryStore()));

    expect(result.current.theme).toBe('light');
    act(() => system.change(false));
    expect(result.current.theme).toBe('dark');
  });

  it('uses a saved choice over the system', () => {
    mockSystem(true);
    const { result } = renderHook(() => useTheme(memoryStore('dark')));

    expect(result.current.theme).toBe('dark');
  });

  it('switches, applies and remembers the theme', () => {
    const system = mockSystem(false);
    const store = memoryStore();
    const { result } = renderHook(() => useTheme(store));

    act(() => result.current.toggle());

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(store.data.get(THEME_KEY)).toBe('light');

    act(() => system.change(false));
    expect(result.current.theme).toBe('light');
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
