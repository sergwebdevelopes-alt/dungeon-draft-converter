import { useEffect, useState, type DragEvent, type MouseEvent } from 'react';
import { formatBytes } from '../../../shared/lib/format.ts';
import { useObjectUrl } from '../../../shared/lib/useObjectUrl.ts';

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
  className?: string;
}

function zoneClassName({
  compact,
  over,
  hasFile,
  disabled,
}: {
  compact: boolean;
  over: boolean;
  hasFile: boolean;
  disabled: boolean;
}): string {
  return [
    'flex items-center gap-3 rounded-lg border-[1.5px] text-left transition-colors',
    compact
      ? 'min-h-14 px-3 py-2.5'
      : 'flex-col justify-center px-4 py-6 text-center sm:py-8',
    hasFile
      ? 'border-solid border-line bg-sunken'
      : 'border-dashed border-line bg-sunken',
    over ? 'border-gold bg-gold/10' : '',
    disabled
      ? 'cursor-not-allowed opacity-60'
      : 'cursor-pointer hover:border-gold/70',
    'has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-text',
  ].join(' ');
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
  className = '',
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

  return (
    <label
      className={`${zoneClassName({ compact, over, hasFile: !!file, disabled })} ${className}`}
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
            <img
              className="size-10 shrink-0 rounded-md border border-line bg-surface object-contain"
              src={previewUrl}
              alt=""
            />
          ) : (
            <MapIcon />
          )}
          <span className="grid min-w-0 flex-1">
            <strong className="truncate font-bold">{file.name}</strong>
            <span className="text-sm text-muted">{formatBytes(file.size)}</span>
          </span>
          {!disabled && (
            <span className="flex shrink-0 items-center gap-3 text-sm">
              <span className="font-bold text-brand-text">Change</span>
              {onClear && (
                <button
                  type="button"
                  className="min-h-11 font-bold text-muted hover:text-danger"
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
          <span className="grid min-w-0">
            <strong className="font-bold">
              {title ?? 'Drop your file here'}
            </strong>
            {hint !== '' && (
              <span className="text-sm text-muted">
                {hint ?? 'or click to browse'}
              </span>
            )}
          </span>
        </>
      )}
    </label>
  );
}

function UploadIcon() {
  return (
    <svg
      className="size-7 shrink-0 fill-none stroke-gold stroke-[1.6]"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 16V4m0 0-5 5m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      className="size-7 shrink-0 fill-none stroke-gold stroke-[1.6]"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Zm0 0v14m6-12v14" />
    </svg>
  );
}

export { DropZone };
