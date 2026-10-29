import { useRef, useState, type DragEvent } from 'react';
import { formatBytes } from './format.ts';

const DRAG_TYPE = 'application/x-dd-level';

interface LevelListProps {
  levels: File[];
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

function levelKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
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
    <ol className="levels" aria-label="Map levels, top is the main map">
      {levels.map((file, index) => {
        const className = [
          'level',
          dragging === index && 'is-dragging',
          target === index && dragging !== index && 'is-drop-target',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <li
            key={levelKey(file)}
            className={className}
            draggable={!disabled}
            onDragStart={(event) => handleDragStart(event, index)}
            onDragOver={(event) => handleDragOver(event, index)}
            onDrop={(event) => handleDrop(event, index)}
            onDragEnd={finishDrag}
          >
            <span className="level-handle" aria-hidden="true">
              <svg viewBox="0 0 16 16">
                <path d="M6 3h.01M10 3h.01M6 8h.01M10 8h.01M6 13h.01M10 13h.01" />
              </svg>
            </span>
            <span className="level-text">
              <strong className="file-name">{file.name}</strong>
              <span className="muted">{formatBytes(file.size)}</span>
            </span>
            <span className={`level-badge${index === 0 ? ' is-main' : ''}`}>
              {index === 0 ? 'Main' : 'Below'}
            </span>
            <span className="level-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${file.name} up`}
                disabled={disabled || index === 0}
                onClick={() => onMove(index, index - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${file.name} down`}
                disabled={disabled || index === levels.length - 1}
                onClick={() => onMove(index, index + 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="icon-button is-remove"
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

export { LevelList, levelKey };
