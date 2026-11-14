import { Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { galleryApi } from '@/features/gallery/api/gallery-api.ts';
import {
  OpenMapSlug,
  useOpenedMapWindow,
  type MapWindow as MapWindowComponent,
} from '@/features/gallery/index.ts';
import type { SiteConfig } from '@/shared/config/site.ts';
import { PageShell } from './layout/PageShell.tsx';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage.tsx';
import { PageChange } from './PageChange.tsx';

const HomePage = lazy(async () => {
  void galleryApi.prefetchFirstPage();

  return {
    default: (await import('@/pages/home/HomePage.tsx')).HomePage,
  };
});

const ConverterPage = lazy(async () => ({
  default: (await import('@/pages/converter/ConverterPage.tsx')).ConverterPage,
}));

const mapWindow: { ready: typeof MapWindowComponent | null } = { ready: null };

async function loadMapWindow() {
  const { MapWindow } = await import('@/features/gallery/index.ts');
  mapWindow.ready = MapWindow;

  return { default: MapWindow };
}

const LazyMapWindow = lazy(loadMapWindow);

const GalleryPage = lazy(async () => {
  void galleryApi.prefetchFirstPage();
  const [page] = await Promise.all([
    import('@/pages/gallery/GalleryPage.tsx'),
    loadMapWindow(),
  ]);

  return { default: page.GalleryPage };
});

const MapPage = lazy(async () => ({
  default: (await import('@/pages/map/MapPage.tsx')).MapPage,
}));

function AppRoutes({ site }: { site: SiteConfig }) {
  const location = useLocation();
  const opened = useOpenedMapWindow();
  const MapWindow = mapWindow.ready ?? LazyMapWindow;
  const openedWindow = opened && (
    <Suspense fallback={null}>
      <MapWindow map={opened.map} morph={opened.morph} />
    </Suspense>
  );

  return (
    <OpenMapSlug value={opened?.map.slug ?? null}>
      <PageChange />
      <Routes location={opened?.background ?? location}>
        <Route element={<PageShell site={site} overlay={openedWindow} />}>
          <Route index element={<HomePage />} />
          <Route path="maps/:collection?" element={<GalleryPage />} />
          <Route
            path="maps/:collection/:map"
            element={<MapPage notFound={<NotFoundPage />} />}
          />
          <Route path="converter" element={<ConverterPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </OpenMapSlug>
  );
}

export { AppRoutes };
