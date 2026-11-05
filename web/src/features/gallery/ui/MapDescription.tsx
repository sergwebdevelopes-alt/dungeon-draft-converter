const DESCRIPTION = [
  'grid max-h-48 gap-3 overflow-y-auto pr-1 text-sm leading-relaxed text-muted lg:max-h-none lg:overflow-visible',
  '[&_strong]:font-bold [&_strong]:text-text [&_b]:font-bold [&_b]:text-text [&_em]:italic [&_i]:italic',
  '[&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1 [&_ul]:pl-5 [&_ol]:grid [&_ol]:list-decimal [&_ol]:gap-1 [&_ol]:pl-5',
  '[&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-2',
].join(' ');

function MapDescription({ html }: { html: string }) {
  return (
    <section
      aria-label="Description"
      tabIndex={0}
      className={DESCRIPTION}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export { MapDescription };
