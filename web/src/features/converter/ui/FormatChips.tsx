import { presetLabel } from '../model/summary.ts';
import type { FormatPreset } from '../model/types.ts';
import { PanelSection } from './PanelSection.tsx';

const PRESET_HINTS: Record<string, string> = {
  JPG_70: 'Fast VTT',
  JPG_140: 'Crisp',
  JPG_300: 'Print',
  WEBP_140: 'Smallest',
};

interface FormatChipsProps {
  presets: readonly FormatPreset[] | null;
  selected: string[];
  disabled: boolean;
  onToggle: (name: string) => void;
}

const CHIP =
  'grid min-h-12 content-center gap-0.5 rounded-xl px-2 text-center ring-1 ring-line transition hover:ring-gold/60 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-gold/15 aria-pressed:ring-2 aria-pressed:ring-gold';

function FormatChips({
  presets,
  selected,
  disabled,
  onToggle,
}: FormatChipsProps) {
  return (
    <PanelSection title="Formats">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        {presets
          ? presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className={CHIP}
                aria-pressed={selected.includes(preset.name)}
                disabled={disabled}
                onClick={() => onToggle(preset.name)}
              >
                <span className="text-sm font-bold">{presetLabel(preset)}</span>
                <span className="text-xs text-muted">
                  {PRESET_HINTS[preset.name] ?? `${preset.ppi} px per square`}
                </span>
              </button>
            ))
          : Array.from({ length: 4 }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="min-h-12 rounded-xl bg-sunken motion-safe:animate-pulse"
              />
            ))}
      </div>
    </PanelSection>
  );
}

export { FormatChips };
