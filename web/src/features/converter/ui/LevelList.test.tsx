import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LevelList } from './LevelList.tsx';

const LEVELS = [
  new File(['a'], 'Tower.dd2vtt'),
  new File(['bb'], 'Cellar.dd2vtt'),
];

function renderList(disabled = false) {
  const onMove = vi.fn();
  const onRemove = vi.fn();
  render(
    <LevelList
      levels={LEVELS}
      disabled={disabled}
      onMove={onMove}
      onRemove={onRemove}
    />,
  );
  return { onMove, onRemove };
}

describe('LevelList', () => {
  it('marks the first level as the main map', () => {
    renderList();

    const [first, second] = screen.getAllByRole('listitem');
    expect(within(first).getByText('Main')).toBeInTheDocument();
    expect(within(second).getByText('Below')).toBeInTheDocument();
  });

  it('moves and removes levels', async () => {
    const { onMove, onRemove } = renderList();

    await userEvent.click(
      screen.getByRole('button', { name: 'Move Cellar.dd2vtt up' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Move Tower.dd2vtt down' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Tower.dd2vtt' }),
    );

    expect(onMove).toHaveBeenNthCalledWith(1, 1, 0);
    expect(onMove).toHaveBeenNthCalledWith(2, 0, 1);
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('cannot move past the ends', () => {
    renderList();

    expect(
      screen.getByRole('button', { name: 'Move Tower.dd2vtt up' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move Cellar.dd2vtt down' }),
    ).toBeDisabled();
  });

  it('disables every button while converting', () => {
    renderList(true);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });
});
