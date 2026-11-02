interface OptionProps {
  checked: boolean;
  disabled: boolean;
  title: string;
  hint: string;
  onChange: () => void;
}

function Option({ checked, disabled, title, hint, onChange }: OptionProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-line bg-sunken px-3 py-2 transition-colors hover:border-gold/60 has-checked:border-gold has-checked:shadow-[inset_0_0_0_1px_var(--gold)] has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-text has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <input
        className="peer sr-only"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] border-line text-on-gold peer-checked:border-gold peer-checked:bg-gold"
      >
        {checked && (
          <svg
            viewBox="0 0 16 16"
            className="size-3 fill-none stroke-current stroke-[2.5]"
          >
            <path d="m3.5 8.5 3 3 6-7" />
          </svg>
        )}
      </span>
      <span className="grid min-w-0">
        <strong className="font-bold">{title}</strong>
        <span className="text-sm leading-snug text-muted">{hint}</span>
      </span>
    </label>
  );
}

export { Option };
