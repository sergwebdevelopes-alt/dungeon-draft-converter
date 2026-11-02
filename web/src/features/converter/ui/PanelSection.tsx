import type { ReactNode } from 'react';

interface PanelSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

function PanelSection({ title, action, children }: PanelSectionProps) {
  return (
    <section aria-label={title} className="grid gap-2.5">
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h2 className="text-xs font-bold tracking-[0.16em] text-muted uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export { PanelSection };
