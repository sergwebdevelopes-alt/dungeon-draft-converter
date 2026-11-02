import type { GridChoice } from '../model/grid-choice.ts';
import { PanelSection } from './PanelSection.tsx';

const CHOICES: { value: GridChoice; label: string }[] = [
  { value: 'without', label: 'Without' },
  { value: 'with', label: 'With' },
  { value: 'both', label: 'Both' },
];

interface GridSwitchProps {
  value: GridChoice | null;
  disabled: boolean;
  onChange: (choice: GridChoice) => void;
}

function GridSwitch({ value, disabled, onChange }: GridSwitchProps) {
  return (
    <PanelSection title="Grid">
      <div
        role="group"
        aria-label="Grid"
        className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1"
      >
        {CHOICES.map((choice) => (
          <button
            key={choice.value}
            type="button"
            aria-pressed={value === choice.value}
            disabled={disabled}
            onClick={() => onChange(choice.value)}
            className="min-h-11 rounded-lg text-sm font-bold text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-surface aria-pressed:text-text aria-pressed:shadow"
          >
            {choice.label}
          </button>
        ))}
      </div>
    </PanelSection>
  );
}

export { GridSwitch };
