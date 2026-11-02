import { ButtonLink } from '../../../shared/ui/Button.tsx';
import { Container } from '../../../shared/ui/Container.tsx';
import { GridOverlay } from '../../../shared/ui/GridOverlay.tsx';
import { mapImages, type MapEntry } from '../../gallery/index.ts';

const FACTS = [
  { value: '70 · 140 · 300', label: 'px per square' },
  { value: '10', label: 'levels merged into one' },
  { value: '1 inch', label: 'per square in print' },
];

function GridWipe({ map }: { map: MapEntry }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-line"
      style={{ aspectRatio: `${map.squares.x} / ${map.squares.y}` }}
    >
      <img
        src={mapImages(map.slug).view}
        alt={`${map.title}, shown without and with a grid`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 animate-wipe motion-reduce:animate-none motion-reduce:[clip-path:inset(0_0_0_50%)]">
        <GridOverlay columns={map.squares.x} rows={map.squares.y} />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 animate-wipe-line bg-gold shadow-[0_0_14px_var(--gold)] motion-reduce:left-1/2 motion-reduce:animate-none"
      />
      <span className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase">
        No grid
      </span>
      <span className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase">
        Grid
      </span>
    </div>
  );
}

function ConverterTeaser({ map }: { map: MapEntry | null }) {
  return (
    <section
      aria-labelledby="converter-title"
      className="border-y border-line/60 bg-sunken/60 py-20 sm:py-24"
    >
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="grid gap-6">
          <p className="text-sm font-bold tracking-[0.2em] text-gold uppercase">
            Free tool
          </p>
          <h2
            id="converter-title"
            className="font-display text-3xl font-bold tracking-wide sm:text-5xl"
          >
            Your Dungeondraft maps, ready for any table
          </h2>
          <p className="text-lg text-muted">
            Drop a <code>.dd2vtt</code> export and download images for your
            virtual tabletop or the print shop, with or without the grid and
            with your logo in the corner.
          </p>
          <dl className="grid grid-cols-3 gap-4">
            {FACTS.map((fact) => (
              <div key={fact.label} className="grid gap-1">
                <dt className="order-2 text-sm text-muted">{fact.label}</dt>
                <dd className="order-1 font-display text-xl font-bold sm:text-2xl">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
          <ButtonLink to="/converter" className="w-fit">
            Open the converter
          </ButtonLink>
        </div>

        {map && <GridWipe map={map} />}
      </Container>
    </section>
  );
}

export { ConverterTeaser };
