import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFileDrop, usePreventPageDrop } from './useFileDrop.ts';

function Zone({
  disabled = false,
  onFiles,
}: {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const drop = useFileDrop(disabled, onFiles);

  return (
    <div data-testid="zone" data-over={drop.over} {...drop.handlers}>
      <span>inside</span>
    </div>
  );
}

function Page() {
  usePreventPageDrop();
  return null;
}

function files(...names: string[]) {
  return {
    dataTransfer: { files: names.map((name) => new File(['x'], name)) },
  };
}

describe('useFileDrop', () => {
  it('highlights while files are dragged over and hands over the drop', () => {
    const onFiles = vi.fn();
    render(<Zone onFiles={onFiles} />);
    const zone = screen.getByTestId('zone');

    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute('data-over', 'true');

    fireEvent.drop(zone, files('A.dd2vtt', 'B.dd2vtt'));

    expect(zone).toHaveAttribute('data-over', 'false');
    expect(onFiles.mock.calls[0][0]).toHaveLength(2);
  });

  it('keeps the highlight when moving onto a child', () => {
    render(<Zone onFiles={vi.fn()} />);
    const zone = screen.getByTestId('zone');

    fireEvent.dragOver(zone);
    const leave = createEvent.dragLeave(zone);
    Object.defineProperty(leave, 'relatedTarget', {
      value: screen.getByText('inside'),
    });
    fireEvent(zone, leave);

    expect(zone).toHaveAttribute('data-over', 'true');
  });

  it('ignores drops while disabled', () => {
    const onFiles = vi.fn();
    render(<Zone disabled onFiles={onFiles} />);
    const zone = screen.getByTestId('zone');

    fireEvent.dragOver(zone);
    fireEvent.drop(zone, files('A.dd2vtt'));

    expect(zone).toHaveAttribute('data-over', 'false');
    expect(onFiles).not.toHaveBeenCalled();
  });
});

describe('usePreventPageDrop', () => {
  it('stops the browser from opening files dropped beside the drop areas', () => {
    const { unmount } = render(<Page />);

    const drop = createEvent.drop(window);
    fireEvent(window, drop);
    expect(drop.defaultPrevented).toBe(true);

    unmount();
    const later = createEvent.drop(window);
    fireEvent(window, later);
    expect(later.defaultPrevented).toBe(false);
  });
});
