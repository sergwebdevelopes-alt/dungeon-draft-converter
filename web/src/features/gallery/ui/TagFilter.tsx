interface TagFilterProps {
  tags: string[];
  active: string | null;
  onChange: (tag: string | null) => void;
}

const CHIP =
  'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-bold whitespace-nowrap text-muted transition-colors hover:text-text aria-pressed:bg-text aria-pressed:text-bg';

function TagFilter({ tags, active, onChange }: TagFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter maps"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:w-fit sm:rounded-full sm:bg-surface/70 sm:p-1 sm:ring-1 sm:ring-line"
    >
      <button
        type="button"
        className={CHIP}
        aria-pressed={active === null}
        onClick={() => onChange(null)}
      >
        All maps
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={CHIP}
          aria-pressed={active === tag}
          onClick={() => onChange(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

export { TagFilter };
