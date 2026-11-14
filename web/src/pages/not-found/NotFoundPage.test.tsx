import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from './NotFoundPage.tsx';

describe('NotFoundPage', () => {
  it('says the page is missing, in the tab too, and leads back home', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'This passage leads nowhere' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Page not found · Lair of Artificer');
    expect(
      screen.getByRole('link', { name: 'Back to the home page' }),
    ).toHaveAttribute('href', '/');
  });
});
