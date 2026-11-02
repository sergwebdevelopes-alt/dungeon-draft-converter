import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { Button, ButtonLink } from './Button.tsx';

describe('Button', () => {
  it('is a plain button unless told to submit', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Cancel</Button>);

    const button = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(button);

    expect(button).toHaveAttribute('type', 'button');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('can submit a form and be disabled', () => {
    render(
      <Button type="submit" disabled>
        Convert
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Convert' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeDisabled();
  });
});

describe('ButtonLink', () => {
  it('moves within the site for a route', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/maps">Browse the maps</ButtonLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Browse the maps' });
    expect(link).toHaveAttribute('href', '/maps');
    expect(link).not.toHaveAttribute('target');
  });

  it('opens other sites in a new tab', () => {
    render(<ButtonLink href="https://example.com/join">Join</ButtonLink>);

    const link = screen.getByRole('link', { name: 'Join' });
    expect(link).toHaveAttribute('href', 'https://example.com/join');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
