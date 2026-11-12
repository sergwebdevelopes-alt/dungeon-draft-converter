interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  options: Option<T>[];
  value: T | null;
  disabled?: boolean;
  size?: 'regular' | 'small';
  onChange: (value: T) => void;
}

const BUTTON =
  'rounded-lg px-3 font-bold text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-surface aria-pressed:text-text aria-pressed:shadow';

const BUTTON_SIZE = {
  regular: 'min-h-11 text-sm',
  small: 'min-h-8 text-xs',
};

function Segmented<T extends string>({
  label,
  options,
  value,
  disabled = false,
  size = 'regular',
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-sunken p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`${BUTTON} ${BUTTON_SIZE[size]}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export { Segmented };
