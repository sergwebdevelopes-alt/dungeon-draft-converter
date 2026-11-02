import { useRef, useState, type DragEvent } from 'react';
import { formatBytes } from '../../../shared/lib/format.ts';
import { levelKey } from '../model/map-rules.ts';

const DRAG_TYPE = 'application/x-dd-level';

const ICON_BUTTON =
  'grid size-11 place-items-center rounded-md text-lg text-muted hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent sm:size-9';

interface LevelListProps {
  levels: File[];
  hidden: string[];
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onToggle: (index: number) => void;
}

type Role = 'main' | 'below' | 'hidden';

const BADGES: Record<Role, { label: string; className: string }> = {
  main: { label: 'Main', className: 'bg-brand text-on-brand' },
  below: { label: 'Below', className: 'border border-line text-muted' },
  hidden: {
    label: 'Hidden',
    className: 'border border-dashed border-line text-muted',
  },
};

function roles(levels: File[], hidden: string[]): Role[] {
  const isHidden = levels.map((file) => hidden.includes(levelKey(file)));
  const main = isHidden.indexOf(false);

  return isHidden.map((off, index) =>
    off ? 'hidden' : index === main ? 'main' : 'below',
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

function LevelList({
  levels,
  hidden,
  disabled,
  onMove,
  onRemove,
  onToggle,
}: LevelListProps) {
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

  const levelRoles = roles(levels, hidden);

  return (
    <ol className="grid gap-2" aria-label="Map levels, top is the main map">
      {levels.map((file, index) => {
        const role = levelRoles[index];
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
            <span
              className={`grid min-w-0 flex-1 transition-opacity ${role === 'hidden' ? 'opacity-50' : ''}`}
            >
              <strong className="truncate font-bold">{file.name}</strong>
              <span className="text-sm text-muted">
                {formatBytes(file.size)}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${BADGES[role].className}`}
            >
              {BADGES[role].label}
            </span>
            <span className="flex shrink-0">
              <button
                type="button"
                className={ICON_BUTTON}
                aria-label={`${role === 'hidden' ? 'Show' : 'Hide'} ${file.name}`}
                title={role === 'hidden' ? 'Show level' : 'Hide level'}
                disabled={disabled}
                onClick={() => onToggle(index)}
              >
                <EyeIcon open={role !== 'hidden'} />
              </button>
              <button
                type="button"
                className={ICON_BUTTON}
                aria-label={`Move ${file.name} up`}
                disabled={disabled || index === 0}
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
