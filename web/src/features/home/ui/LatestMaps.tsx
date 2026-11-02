import { Link } from 'react-router';
import { Container } from '../../../shared/ui/Container.tsx';
import { MapTileLink, type MapEntry } from '../../gallery/index.ts';

function LatestMaps({ maps, total }: { maps: MapEntry[]; total: number }) {
  if (maps.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="latest-title" className="py-20 sm:py-24">
      <Container className="grid gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2
            id="latest-title"
            className="font-display text-3xl font-bold tracking-wide sm:text-4xl"
          >
            Latest maps
          </h2>
          <Link
            to="/maps"
            className="font-bold text-muted transition-colors hover:text-text"
          >
            See all {total} maps <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {maps.map((map) => (
            <li key={map.slug}>
              <MapTileLink map={map} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export { LatestMaps };
