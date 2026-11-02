import type { ReactNode } from 'react';

interface StepProps {
  number: number;
  title: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
}

function Step({ number, title, note, action, children }: StepProps) {
  return (
    <section className="grid content-start gap-3 rounded-xl border border-line bg-surface p-4">
      <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-lg font-bold tracking-wide">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] border-gold font-sans text-sm font-bold text-gold"
        >
          {number}
        </span>
        {title}
        {note && (
          <span className="font-sans text-sm font-normal tracking-normal text-muted">
            {note}
          </span>
        )}
        {action && <span className="ml-auto">{action}</span>}
      </h2>
      {children}
    </section>
  );
}

export { Step };
