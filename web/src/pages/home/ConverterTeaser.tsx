import { ButtonLink } from '@/shared/ui/Button.tsx';
import { Container } from '@/shared/ui/Container.tsx';
import { LevelStack } from './LevelStack.tsx';

const BENEFITS = [
  { title: 'Up to 10 levels', detail: 'Merged into one map' },
  { title: 'Every light kept', detail: 'Lower floors still glow' },
  { title: 'Your logo', detail: 'In the corner, any size' },
  { title: 'JPG · WebP · Foundry', detail: 'Images and .dd2vtt' },
  { title: '70 · 140 · 300 px', detail: 'For screen or print' },
  { title: 'Grid or no grid', detail: 'Both in one download' },
];

function Benefits() {
  return (
    <ul className="grid gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
      {BENEFITS.map((benefit) => (
        <li
          key={benefit.title}
          className="grid content-start gap-1.5 rounded-2xl bg-white/4 p-4 ring-1 ring-line/60"
        >
          <span className="text-sm font-bold text-gold sm:text-base">
            {benefit.title}
          </span>
          <span className="text-sm text-muted">{benefit.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function ConverterTeaser() {
  return (
    <section
      aria-labelledby="converter-title"
      className="overflow-hidden border-y border-line/60 bg-sunken/60 py-20 sm:py-28"
    >
      <Container className="grid gap-14 sm:gap-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-10">
          <div className="grid justify-items-start gap-6">
            <p className="text-sm font-bold tracking-[0.2em] text-gold uppercase">
              Free tool
            </p>
            <h2
              id="converter-title"
              className="font-display text-4xl leading-[1.05] font-bold tracking-wide sm:text-6xl"
            >
              Up to 10 levels.
              <br />
              One map.
            </h2>
            <p className="max-w-xl text-lg text-muted">
              Dungeondraft merges two levels at a time. The converter stacks up
              to ten <code>.dd2vtt</code> exports into a single map for your
              virtual tabletop or the print shop.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <ButtonLink to="/converter">Open the converter</ButtonLink>
              <p className="text-sm text-muted">Free, no account needed.</p>
            </div>
          </div>

          <LevelStack />
        </div>

        <Benefits />
      </Container>
    </section>
  );
}

export { ConverterTeaser };
