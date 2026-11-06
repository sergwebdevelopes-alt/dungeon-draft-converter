import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MapDescription } from './MapDescription.tsx';

function measure(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(
    scrollHeight,
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
    clientHeight,
  );
}

const HTML =
  '<p>A <strong>safe haven</strong> in Vallaki.</p><p>More text.</p>';

describe('MapDescription', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows two lines with More when the text is longer, and opens and closes it', async () => {
    measure(200, 40);
    render(<MapDescription html={HTML} />);
    const description = screen.getByRole('region', { name: 'Description' });
    const more = screen.getByRole('button', { name: 'More' });

    expect(description).toHaveClass('line-clamp-2');
    expect(more).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(more);

    expect(description).not.toHaveClass('line-clamp-2');
    expect(screen.getByRole('button', { name: 'Less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Less' }));

    expect(description).toHaveClass('line-clamp-2');
  });

  it('shows no button when the text fits', () => {
    measure(40, 40);
    render(<MapDescription html={HTML} />);

    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
  });

  it('keeps the sanitised formatting of the post', () => {
    measure(40, 40);
    render(<MapDescription html={HTML} />);

    expect(screen.getByText('safe haven').tagName).toBe('STRONG');
  });
});
