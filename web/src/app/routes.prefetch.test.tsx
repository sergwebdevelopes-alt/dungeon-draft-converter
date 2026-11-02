import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { SITE } from '../shared/config/site.ts';
import { AppRoutes } from './routes.tsx';

const galleryApi = vi.hoisted(() => ({
  fetchMaps: vi.fn(() => Promise.resolve([])),
  prefetchMaps: vi.fn(() => Promise.resolve()),
}));

vi.mock('../features/gallery/api.ts', () => ({ galleryApi }));

describe('AppRoutes page loading', () => {
  it('starts loading the maps while the home page itself loads', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes site={SITE} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', {
      name: 'Battle maps for epic adventures',
    });
    expect(galleryApi.prefetchMaps).toHaveBeenCalled();
  });
});
