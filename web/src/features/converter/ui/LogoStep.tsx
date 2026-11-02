import { LOGO_TYPES } from '../model/map-rules.ts';
import { isDefaultPlacement } from '../model/placement.ts';
import type { LogoLimits, LogoPlacement } from '../model/types.ts';
import { DropZone } from './DropZone.tsx';
import { LogoPlacementPanel } from './LogoPlacement.tsx';
import { Step } from './Step.tsx';

interface LogoStepProps {
  logo: File | null;
  limits: LogoLimits | null;
  placement: LogoPlacement | null;
  disabled: boolean;
  onSelect: (file: File) => void;
  onClear: () => void;
  onPlacementChange: (placement: LogoPlacement) => void;
  onPlacementReset: () => void;
}

function LogoStep({
  logo,
  limits,
  placement,
  disabled,
  onSelect,
  onClear,
  onPlacementChange,
  onPlacementReset,
}: LogoStepProps) {
  const canPlace = logo && limits && placement;

  return (
    <Step
      number={2}
      title="Logo"
      note="optional"
      action={
        canPlace && (
          <button
            type="button"
            className="min-h-11 font-sans text-sm font-bold tracking-normal text-brand-text hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
            disabled={disabled || isDefaultPlacement(placement, limits)}
            onClick={onPlacementReset}
          >
            Reset
          </button>
        )
      }
    >
      <DropZone
        file={logo}
        disabled={disabled}
        onFiles={(files) => onSelect(files[0])}
        onClear={onClear}
        accept={LOGO_TYPES.join(',')}
        title="Add your logo"
        hint="PNG, JPG or WebP · placed bottom-right"
        compact
        preview
      />
      {canPlace && (
        <LogoPlacementPanel
          logo={logo}
          limits={limits}
          value={placement}
          disabled={disabled}
          onChange={onPlacementChange}
        />
      )}
    </Step>
  );
}

export { LogoStep };
