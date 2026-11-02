import { Link } from 'react-router';
import { PageTitle } from '../../../shared/ui/PageTitle.tsx';

function HomePage() {
  return (
    <section className="grid max-w-2xl gap-5 py-10">
      <PageTitle />
      <h1 className="font-display text-3xl font-bold tracking-wide sm:text-5xl">
        Battle maps from the Lair
      </h1>
      <p className="text-lg text-muted">
        Hand-made Dungeondraft maps for your table, and a free converter that
        turns your own <code>.dd2vtt</code> exports into images for any virtual
        tabletop or printer.
      </p>
      <Link
        to="/converter"
        className="inline-flex min-h-11 w-fit items-center rounded-lg bg-gold px-5 font-bold text-on-gold hover:brightness-105"
      >
        Open the converter
      </Link>
    </section>
  );
}

export { HomePage };
