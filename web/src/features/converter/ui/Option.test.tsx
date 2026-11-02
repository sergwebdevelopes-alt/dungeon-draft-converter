import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Option } from './Option.tsx';

describe('Option', () => {
  it('is a checkbox labelled by its title', async () => {
    const onChange = vi.fn();
    render(
      <Option
        checked={false}
        disabled={false}
        title="With grid"
        hint="Dashed grid baked in"
        onChange={onChange}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /With grid/ });
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('does not change when disabled', async () => {
    const onChange = vi.fn();
    render(
      <Option checked disabled title="With grid" hint="" onChange={onChange} />,
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    expect(onChange).not.toHaveBeenCalled();
  });
});
