import type { ReactNode } from 'react';

interface OptionGroupProps {
  legend: string;
  className?: string;
  children: ReactNode;
}

function OptionGroup({ legend, className = '', children }: OptionGroupProps) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">
        {legend}
      </legend>
      <div className={`grid gap-2 ${className}`}>{children}</div>
    </fieldset>
  );
}

export { OptionGroup };
