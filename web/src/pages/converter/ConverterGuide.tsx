import { CONVERTER_FAQ } from '@contracts/converter-guide.ts';

const STEPS = [
  {
    title: 'Export from Dungeondraft',
    detail:
      'In Dungeondraft choose Export, then Universal VTT. You get a .dd2vtt file with the map, its grid, walls and lights.',
  },
  {
    title: 'Drop your maps',
    detail:
      'Add one map, or up to 10 levels of the same map, lowest floor first. Reorder or hide levels and check the result in the preview.',
  },
  {
    title: 'Pick formats and download',
    detail:
      'Choose JPG or WebP at 70, 140 or 300 px per square, with or without the grid, add your logo and a file for Foundry VTT, then download one zip.',
  },
];

const HEADING = 'font-display text-2xl font-bold tracking-wide sm:text-3xl';

function ConverterGuide() {
  return (
    <div className="grid gap-12 pt-10 sm:pt-14">
      <section aria-labelledby="how-title" className="grid gap-6">
        <h2 id="how-title" className={HEADING}>
          How the converter works
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid content-start gap-2 rounded-2xl bg-text/5 p-5 ring-1 ring-line/60"
            >
              <span className="text-sm font-bold tracking-[0.2em] text-gold uppercase">
                Step {index + 1}
              </span>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq-title" className="grid gap-6">
        <h2 id="faq-title" className={HEADING}>
          Questions about converting .dd2vtt maps
        </h2>
        <dl className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {CONVERTER_FAQ.map(({ question, answer }) => (
            <div key={question} className="grid content-start gap-2">
              <dt className="text-lg font-bold">{question}</dt>
              <dd className="text-muted">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export { ConverterGuide };
