import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageChange } from './PageChange.tsx';

let goBack: () => void = () => undefined;

function Page({ name }: { name: string }) {
  const navigate = useNavigate();
  goBack = () => void navigate(-1);

  return (
    <>
      <h1>{name}</h1>
      <Link to="/maps">Maps</Link>
      <Link to="/maps?map=cave">Open cave</Link>
      <Link to="/#membership">Membership</Link>
      <section id="membership">Plans</section>
    </>
  );
}

function renderApp() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <PageChange />
      <main id="content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Page name="Home" />} />
          <Route path="/maps" element={<Page name="Maps" />} />
        </Routes>
      </main>
    </MemoryRouter>,
  );
}

describe('PageChange', () => {
  const scrollTo = vi.fn();
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('scrollTo', scrollTo);
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollTo.mockClear();
    scrollIntoView.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts a new page at the top', async () => {
    renderApp();
    scrollTo.mockClear();

    await userEvent.click(screen.getByRole('link', { name: 'Maps' }));

    expect(screen.getByRole('heading', { name: 'Maps' })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('moves focus to the new page so screen readers start there', async () => {
    renderApp();
    const link = screen.getByRole('link', { name: 'Maps' });
    link.focus();

    await userEvent.click(link);

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('leaves focus alone when a link points within the same page', async () => {
    renderApp();
    const membership = screen.getByRole('link', { name: 'Membership' });
    membership.focus();

    await userEvent.click(membership);

    expect(membership).toHaveFocus();
  });

  it('keeps the position when only the query changes', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('link', { name: 'Maps' }));
    scrollTo.mockClear();

    await userEvent.click(screen.getByRole('link', { name: 'Open cave' }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('leaves going back to the browser', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('link', { name: 'Maps' }));
    scrollTo.mockClear();

    act(() => goBack());

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to the section a link points at', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('link', { name: 'Maps' }));
    scrollTo.mockClear();

    await userEvent.click(screen.getByRole('link', { name: 'Membership' }));

    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
