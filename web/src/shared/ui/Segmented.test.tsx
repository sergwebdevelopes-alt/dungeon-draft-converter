import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Segmented } from './Segmented.tsx';

const OPTIONS = [
  { value: 'without', label: 'Without' },
  { value: 'with', label: 'With' },
] as const;

describe('Segmented', () => {
  it('marks the chosen option and reports a new choice', async () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="Grid"
        options={[...OPTIONS]}
        value="without"
        onChange={onChange}
      />,
    );
    const group = within(screen.getByRole('group', { name: 'Grid' }));

    expect(group.getByRole('button', { name: 'Without' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(group.getByRole('button', { name: 'With' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await userEvent.click(group.getByRole('button', { name: 'With' }));

    expect(onChange).toHaveBeenCalledWith('with');
  });

  it('can be disabled as a whole', () => {
    render(
      <Segmented
        label="Grid"
        options={[...OPTIONS]}
        value={null}
        disabled
        onChange={vi.fn()}
      />,
    );

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  });
});
