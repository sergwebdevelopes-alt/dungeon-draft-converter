import { presetLabel } from '../model/summary.ts';
import type { Config, Variant } from '../model/types.ts';
import { Option } from './Option.tsx';
import { OptionGroup } from './OptionGroup.tsx';
import { OptionSkeleton } from './OptionSkeleton.tsx';
import { Step } from './Step.tsx';

const PRESET_HINTS: Record<string, string> = {
  JPG_70: 'Small file, loads fast',
  JPG_140: 'Crisp on screen',
  JPG_300: 'Print, 1 inch per square',
  WEBP_140: 'Crisp, smallest file',
};

const VARIANT_LABELS: Record<Variant, { title: string; hint: string }> = {
  NoGrid: { title: 'Without grid', hint: 'Clean map for your VTT' },
  Grid: { title: 'With grid', hint: 'Dashed grid baked in' },
};

interface OutputStepProps {
  config: Config | null;
  configError: string | null;
  presets: string[];
  variants: Variant[];
  disabled: boolean;
  onPresetToggle: (name: string) => void;
  onVariantToggle: (variant: Variant) => void;
}

function skeletons(count: number) {
  return Array.from({ length: count }, (_, i) => <OptionSkeleton key={i} />);
}

function OutputStep({
  config,
  configError,
  presets,
  variants,
  disabled,
  onPresetToggle,
  onVariantToggle,
}: OutputStepProps) {
  if (configError) {
    return (
      <Step number={3} title="Output">
        <p
          role="alert"
          className="rounded-lg border-l-[3px] border-danger bg-danger-soft px-3 py-2 text-sm"
        >
          {configError}
        </p>
      </Step>
    );
  }

  return (
    <Step number={3} title="Output">
      <div className="grid gap-4">
        <OptionGroup
          legend="Formats"
          className="grid-cols-2 md:grid-cols-4 lg:grid-cols-2"
        >
          {config
            ? config.presets.map((preset) => (
                <Option
                  key={preset.name}
                  checked={presets.includes(preset.name)}
                  disabled={disabled}
                  title={presetLabel(preset)}
                  hint={
                    PRESET_HINTS[preset.name] ?? `${preset.ppi} px per square`
                  }
                  onChange={() => onPresetToggle(preset.name)}
                />
              ))
            : skeletons(4)}
        </OptionGroup>

        <OptionGroup legend="Grid overlay" className="grid-cols-2">
          {config
            ? config.variants.map((variant) => (
                <Option
                  key={variant}
                  checked={variants.includes(variant)}
                  disabled={disabled}
                  title={VARIANT_LABELS[variant].title}
                  hint={VARIANT_LABELS[variant].hint}
                  onChange={() => onVariantToggle(variant)}
                />
              ))
            : skeletons(2)}
        </OptionGroup>
      </div>
    </Step>
  );
}

export { OutputStep };
