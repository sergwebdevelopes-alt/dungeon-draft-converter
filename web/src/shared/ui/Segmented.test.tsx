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

  it('is regular size unless asked to be small', () => {
    const { rerender } = render(
      <Segmented
        label="Grid"
        options={[...OPTIONS]}
        value="with"
        onChange={vi.fn()}
      />,
    );
    const button = () => screen.getByRole('button', { name: 'With' });

    expect(button().className).toContain('min-h-11');
    expect(button().className).toContain('aria-pressed:bg-surface');

    rerender(
      <Segmented
        label="Grid"
        options={[...OPTIONS]}
        value="with"
        size="small"
        onChange={vi.fn()}
      />,
    );

    expect(button().className).toContain('min-h-8');
    expect(button().className).not.toContain('min-h-11');
    expect(button().className).toContain('aria-pressed:bg-surface');
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
