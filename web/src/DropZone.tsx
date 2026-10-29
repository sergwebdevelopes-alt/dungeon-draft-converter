import { useEffect, useState, type DragEvent, type MouseEvent } from 'react';
import { formatBytes } from './format.ts';
import { useObjectUrl } from './useObjectUrl.ts';

interface DropZoneProps {
  file: File | null;
  disabled: boolean;
  accept: string;
  title?: string;
  hint?: string;
  compact?: boolean;
  preview?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  onClear?: () => void;
}

function DropZone({
  file,
  disabled,
  onFiles,
  onClear,
  title,
  hint,
  accept,
  compact = false,
  preview = false,
  multiple = false,
}: DropZoneProps) {
  const [over, setOver] = useState(false);
  const previewUrl = useObjectUrl(preview ? file : null);

  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (!disabled) {
      setOver(true);
    }
  }

  function handleDragLeave(event: DragEvent) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOver(false);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    const dropped = [...event.dataTransfer.files];
    if (dropped.length > 0 && !disabled) {
      onFiles(multiple ? dropped : dropped.slice(0, 1));
    }
  }

  function handleClear(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  const className = [
    'dropzone',
    compact && 'is-compact',
    over && 'is-over',
    file && 'has-file',
    disabled && 'is-disabled',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label
      className={className}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const selected = [...(event.target.files ?? [])];
          if (selected.length > 0) {
            onFiles(selected);
          }
          event.target.value = '';
        }}
      />
      {file ? (
        <>
          {previewUrl ? (
            <img className="dropzone-preview" src={previewUrl} alt="" />
          ) : (
            <MapIcon />
          )}
          <span className="dropzone-text">
            <strong className="file-name">{file.name}</strong>
            <span className="muted">{formatBytes(file.size)}</span>
          </span>
          {!disabled && (
            <span className="dropzone-actions">
              <span className="link">Change</span>
              {onClear && (
                <button
                  type="button"
                  className="link-button"
                  onClick={handleClear}
                >
                  Remove
                </button>
              )}
            </span>
          )}
        </>
      ) : (
        <>
          <UploadIcon />
          <span className="dropzone-text">
            <strong>{title ?? 'Drop your file here'}</strong>
            {hint !== '' && (
              <span className="muted">{hint ?? 'or click to browse'}</span>
            )}
          </span>
        </>
      )}
    </label>
  );
}

function UploadIcon() {
  return (
    <svg className="dropzone-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4m0 0-5 5m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="dropzone-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Zm0 0v14m6-12v14" />
    </svg>
  );
}

export { DropZone };
