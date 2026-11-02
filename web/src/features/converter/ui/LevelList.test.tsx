import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { levelKey } from '../model/map-rules.ts';
import { LevelList } from './LevelList.tsx';

const LEVELS = [
  new File(['a'], 'Tower.dd2vtt'),
  new File(['bb'], 'Cellar.dd2vtt'),
];

function renderList(disabled = false, hidden: string[] = []) {
  const onMove = vi.fn();
  const onRemove = vi.fn();
  const onToggle = vi.fn();
  render(
    <LevelList
      levels={LEVELS}
      hidden={hidden}
      disabled={disabled}
      onMove={onMove}
      onRemove={onRemove}
      onToggle={onToggle}
    />,
  );
  return { onMove, onRemove, onToggle };
}

describe('LevelList', () => {
  it('marks the first level as the main map', () => {
    renderList();

    const [first, second] = screen.getAllByRole('listitem');
    expect(within(first).getByText('Main')).toBeInTheDocument();
    expect(within(second).getByText('Below')).toBeInTheDocument();
  });

  it('hides or shows a level with its eye button', async () => {
    const { onToggle } = renderList();

    await userEvent.click(
      screen.getByRole('button', { name: 'Hide Cellar.dd2vtt' }),
    );

    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('marks hidden levels and gives Main to the top shown level', () => {
    renderList(false, [levelKey(LEVELS[0])]);

    const [first, second] = screen.getAllByRole('listitem');
    expect(within(first).getByText('Hidden')).toBeInTheDocument();
    expect(
      within(first).getByRole('button', { name: 'Show Tower.dd2vtt' }),
    ).toBeInTheDocument();
    expect(within(second).getByText('Main')).toBeInTheDocument();
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
