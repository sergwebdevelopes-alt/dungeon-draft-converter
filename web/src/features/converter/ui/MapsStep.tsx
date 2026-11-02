import { DropZone } from './DropZone.tsx';
import { LevelList } from './LevelList.tsx';
import { Step } from './Step.tsx';

interface MapsStepProps {
  maps: File[];
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

function MapsStep({ maps, disabled, onAdd, onMove, onRemove }: MapsStepProps) {
  return (
    <Step
      number={1}
      title="Maps"
      note={maps.length > 1 ? 'top is the main map' : undefined}
    >
      {maps.length === 0 ? (
        <DropZone
          file={null}
          disabled={disabled}
          onFiles={onAdd}
          accept=".dd2vtt"
          title="Drop your .dd2vtt files here"
          hint="One map, or up to 10 levels to merge"
          multiple
        />
      ) : (
        <div className="grid gap-2">
          <LevelList
            levels={maps}
            disabled={disabled}
            onMove={onMove}
            onRemove={onRemove}
          />
          <DropZone
            file={null}
            disabled={disabled}
            onFiles={onAdd}
            accept=".dd2vtt"
            title="Add more levels"
            hint=""
            compact
            multiple
          />
        </div>
      )}
    </Step>
  );
}

export { MapsStep };
