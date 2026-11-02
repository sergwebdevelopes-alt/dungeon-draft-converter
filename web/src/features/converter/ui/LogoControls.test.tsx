import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LogoControls } from './LogoControls.tsx';

const LIMITS = {
  size: { min: 2, max: 20, step: 1, default: 10 },
  margin: { min: 0, max: 5, step: 0.5, default: 3 },
} as const;

function renderControls(
  logo: File | null,
  placement = { size: 10, margin: 3 },
) {
  const handlers = {
    onSelect: vi.fn(),
    onClear: vi.fn(),
    onPlacementChange: vi.fn(),
    onPlacementReset: vi.fn(),
  };
  render(
    <LogoControls
      logo={logo}
      limits={LIMITS}
      placement={placement}
      disabled={false}
      {...handlers}
    />,
  );
  return handlers;
}

describe('LogoControls', () => {
  beforeEach(() => {
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:logo'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('lets the user pick a logo', async () => {
    const { onSelect } = renderControls(null);
    const file = new File(['l'], 'logo.png', { type: 'image/png' });

    await userEvent.upload(screen.getByLabelText(/Add your logo/), file);

    expect(onSelect).toHaveBeenCalledWith(file);
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('places, resets and removes a chosen logo', async () => {
    const handlers = renderControls(
      new File(['l'], 'logo.png', { type: 'image/png' }),
      {
        size: 12,
        margin: 3,
      },
    );

    fireEvent.change(screen.getByRole('slider', { name: /Size/ }), {
      target: { value: '15' },
    });
    fireEvent.change(screen.getByRole('slider', { name: /Margin/ }), {
      target: { value: '1.5' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(handlers.onPlacementChange).toHaveBeenNthCalledWith(1, {
      size: 15,
      margin: 3,
    });
    expect(handlers.onPlacementChange).toHaveBeenNthCalledWith(2, {
      size: 12,
      margin: 1.5,
    });
    expect(handlers.onPlacementReset).toHaveBeenCalledOnce();
    expect(handlers.onClear).toHaveBeenCalledOnce();
  });

  it('cannot reset a placement that is already the default', () => {
    renderControls(new File(['l'], 'logo.png', { type: 'image/png' }));

    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});
