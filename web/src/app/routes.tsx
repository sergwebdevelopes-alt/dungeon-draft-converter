import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import type { SiteConfig } from '../shared/config/site.ts';
import { PageShell } from './layout/PageShell.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';
import { ScrollToTop } from './ScrollToTop.tsx';

const HomePage = lazy(async () => ({
  default: (await import('../features/home/ui/HomePage.tsx')).HomePage,
}));

const ConverterPage = lazy(async () => ({
  default: (await import('../features/converter/ui/ConverterPage.tsx'))
    .ConverterPage,
}));

const GalleryPage = lazy(async () => ({
  default: (await import('../features/gallery/ui/GalleryPage.tsx')).GalleryPage,
}));

function AppRoutes({ site }: { site: SiteConfig }) {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PageShell site={site} />}>
          <Route index element={<HomePage />} />
          <Route path="maps" element={<GalleryPage />} />
          <Route path="converter" element={<ConverterPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

export { AppRoutes };
