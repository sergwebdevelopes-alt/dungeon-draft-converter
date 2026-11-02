import { Link } from 'react-router';
import { useRotation } from '../../../shared/lib/useRotation.ts';
import { Backdrop } from '../../../shared/ui/Backdrop.tsx';
import { Container } from '../../../shared/ui/Container.tsx';
import { Reveal } from '../../../shared/ui/motion/index.ts';
import { mapImages, type MapEntry } from '../../gallery/index.ts';

const ROTATE_MS = 8000;

function BackdropCredit({
  maps,
  index,
  onSelect,
}: {
  maps: MapEntry[];
  index: number;
  onSelect: (index: number) => void;
}) {
  const current = maps[index];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
      <div className="flex gap-1.5" role="group" aria-label="Backdrop maps">
        {maps.map((map, i) => (
          <button
            key={map.slug}
            type="button"
            aria-label={`Show ${map.title}`}
            aria-current={i === index}
            onClick={() => onSelect(i)}
            className="grid h-11 place-items-center"
          >
            <span
              className={`block h-1 rounded-full transition-all duration-500 ${i === index ? 'w-9 bg-gold' : 'w-5 bg-text/25 hover:bg-text/50'}`}
            />
          </button>
        ))}
      </div>
      <Link
        to={`/maps?map=${current.slug}`}
        aria-label={`Open ${current.title}`}
        className="text-muted transition-colors hover:text-text"
      >
        <strong className="text-text">{current.title}</strong>{' '}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function Hero({ maps }: { maps: MapEntry[] }) {
  const { index, select } = useRotation(maps.length, ROTATE_MS);

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[min(86svh,860px)] items-end overflow-hidden"
    >
      <Backdrop
        images={maps.map((map) => mapImages(map.slug).backdrop)}
        index={index}
      />
      <Container className="grid gap-7 pt-28 pb-12 sm:pb-16">
        <Reveal index={0}>
          <p className="text-sm font-bold tracking-[0.25em] text-gold uppercase">
            Lair of Artificer
          </p>
        </Reveal>
        <Reveal index={1}>
          <h1
            id="hero-title"
            className="max-w-4xl font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.02] font-bold tracking-tight"
          >
            Battle maps for <span className="text-gold">epic adventures</span>
          </h1>
        </Reveal>
        <Reveal index={2}>
          <p className="max-w-xl text-lg text-muted sm:text-xl">
            Hand-drawn Dungeondraft maps with custom assets and VTT-ready files.
            Four to eight new maps every month.
          </p>
        </Reveal>
        <Reveal index={3} className="flex flex-wrap gap-3">
          <Link
            to="/maps"
            className="inline-flex min-h-12 items-center rounded-full bg-gold px-6 font-bold text-on-gold transition hover:brightness-105"
          >
            Browse the maps
          </Link>
          <a
            href="#membership"
            className="inline-flex min-h-12 items-center rounded-full bg-text/10 px-6 font-bold ring-1 ring-text/20 backdrop-blur transition hover:bg-text/15"
          >
            Become a member
          </a>
        </Reveal>
        {maps.length > 0 && (
          <BackdropCredit maps={maps} index={index} onSelect={select} />
        )}
      </Container>
    </section>
  );
}

export { Hero };
