import { useRef, useState, type DragEvent } from 'react';
import { formatBytes } from '../../../shared/lib/format.ts';
import { levelKey } from '../model/map-rules.ts';

const DRAG_TYPE = 'application/x-dd-level';

const ICON_BUTTON =
  'grid size-11 place-items-center rounded-md text-lg text-muted hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent sm:size-9';

interface LevelListProps {
  levels: File[];
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

function LevelList({ levels, disabled, onMove, onRemove }: LevelListProps) {
  const draggedRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);

  function handleDragStart(event: DragEvent, index: number) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(DRAG_TYPE, String(index));
    draggedRef.current = index;
    setDragging(index);
  }

  function handleDragOver(event: DragEvent, index: number) {
    if (draggedRef.current === null) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setTarget(index);
  }

  function handleDrop(event: DragEvent, index: number) {
    const from = draggedRef.current;
    if (from === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (from !== index) {
      onMove(from, index);
    }
    finishDrag();
  }

  function finishDrag() {
    draggedRef.current = null;
    setDragging(null);
    setTarget(null);
  }

  return (
    <ol className="grid gap-2" aria-label="Map levels, top is the main map">
      {levels.map((file, index) => {
        const isMain = index === 0;
        const isTarget = target === index && dragging !== index;

        return (
          <li
            key={levelKey(file)}
            className={[
              'flex items-center gap-2 rounded-lg border bg-sunken py-1.5 pr-1.5 pl-2',
              isTarget ? 'border-gold' : 'border-line',
              dragging === index ? 'opacity-50' : '',
              disabled ? '' : 'cursor-grab',
            ].join(' ')}
            draggable={!disabled}
            onDragStart={(event) => handleDragStart(event, index)}
            onDragOver={(event) => handleDragOver(event, index)}
            onDrop={(event) => handleDrop(event, index)}
            onDragEnd={finishDrag}
          >
            <span aria-hidden="true" className="hidden text-muted sm:block">
              <svg
                viewBox="0 0 16 16"
                className="size-4 fill-none stroke-current stroke-[2.5] [stroke-linecap:round]"
              >
                <path d="M6 3h.01M10 3h.01M6 8h.01M10 8h.01M6 13h.01M10 13h.01" />
              </svg>
            </span>
            <span className="grid min-w-0 flex-1">
              <strong className="truncate font-bold">{file.name}</strong>
              <span className="text-sm text-muted">
                {formatBytes(file.size)}
              </span>
            </span>
            <span
              className={[
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tracking-wide uppercase',
                isMain
                  ? 'bg-brand text-on-brand'
                  : 'border border-line text-muted',
              ].join(' ')}
            >
              {isMain ? 'Main' : 'Below'}
            </span>
            <span className="flex shrink-0">
              <button
                type="button"
                className={ICON_BUTTON}
                aria-label={`Move ${file.name} up`}
                disabled={disabled || isMain}
                onClick={() => onMove(index, index - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                className={ICON_BUTTON}
                aria-label={`Move ${file.name} down`}
                disabled={disabled || index === levels.length - 1}
                onClick={() => onMove(index, index + 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className={`${ICON_BUTTON} hover:text-danger`}
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => onRemove(index)}
              >
                ×
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export { LevelList };
