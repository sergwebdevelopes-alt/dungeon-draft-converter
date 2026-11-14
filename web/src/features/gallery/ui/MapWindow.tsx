import { useEffect } from 'react';
import { mapPageTitle } from '@contracts/site-pages.ts';
import { useOpenMap } from '../hooks/useOpenMap.ts';
import type { MapEntry } from '../model/catalog.ts';
import { MapModal } from './MapModal.tsx';

interface MapWindowProps {
  map: MapEntry;
  morph: boolean;
}

function MapWindow({ map, morph }: MapWindowProps) {
  const { close } = useOpenMap();

  useEffect(() => {
    const pageTitle = document.title;
    document.title = mapPageTitle(map);

    return () => {
      document.title = pageTitle;
    };
  }, [map]);

  return <MapModal key={map.slug} map={map} morph={morph} onClose={close} />;
}

export { MapWindow };
