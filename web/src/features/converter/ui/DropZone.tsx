import { useFileDrop } from '../../../shared/lib/useFileDrop.ts';

interface DropZoneProps {
  disabled: boolean;
  accept: string;
  title: string;
  hint?: string;
  compact?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
}

function zoneClassName(
  compact: boolean,
  over: boolean,
  disabled: boolean,
): string {
  return [
    'flex items-center gap-3 rounded-lg border-[1.5px] border-dashed border-line bg-sunken transition-colors',
    compact
      ? 'min-h-14 px-3 py-2.5 text-left'
      : 'flex-col justify-center px-4 py-6 text-center sm:py-8',
    over ? 'border-gold bg-gold/10' : '',
    disabled
      ? 'cursor-not-allowed opacity-60'
      : 'cursor-pointer hover:border-gold/70',
    'has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-text',
  ].join(' ');
}

function DropZone({
  disabled,
  accept,
  title,
  hint,
  compact = false,
  onFiles,
  className = '',
}: DropZoneProps) {
  const drop = useFileDrop(disabled, onFiles);

  return (
    <label
      className={`${zoneClassName(compact, drop.over, disabled)} ${className}`}
      {...drop.handlers}
    >
      <input
        className="sr-only"
        type="file"
        accept={accept}
        multiple
        disabled={disabled}
        onChange={(event) => {
          const selected = [...(event.target.files ?? [])];
          if (selected.length > 0) {
            onFiles(selected);
          }
          event.target.value = '';
        }}
      />
      <UploadIcon />
      <span className="grid min-w-0">
        <strong className="font-bold">{title}</strong>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </span>
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

export { DropZone };
