import { Segmented } from '../../../shared/ui/Segmented.tsx';
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
      <Segmented
        label="Grid"
        options={CHOICES}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    </PanelSection>
  );
}

export { GridSwitch };
