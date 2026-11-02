interface TagFilterProps {
  tags: string[];
  active: string | null;
  onChange: (tag: string | null) => void;
}

const CHIP =
  'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors aria-pressed:border-gold aria-pressed:bg-gold/15 aria-pressed:text-text border-line text-muted hover:border-gold/60 hover:text-text';

function TagFilter({ tags, active, onChange }: TagFilterProps) {
  return (
    <div role="group" aria-label="Filter maps" className="flex flex-wrap gap-2">
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
