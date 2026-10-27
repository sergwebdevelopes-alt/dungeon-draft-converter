interface OptionProps {
  checked: boolean;
  disabled: boolean;
  title: string;
  hint: string;
  onChange: () => void;
}

export function Option({
  checked,
  disabled,
  title,
  hint,
  onChange,
}: OptionProps) {
  return (
    <label className={`option${checked ? ' is-checked' : ''}`}>
      <input
        className="sr-only"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="option-check" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="m3.5 8.5 3 3 6-7" />
        </svg>
      </span>
      <span className="option-body">
        <strong>{title}</strong>
        <span className="muted">{hint}</span>
      </span>
    </label>
  );
}
