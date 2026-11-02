function OptionSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-11 items-start gap-3 rounded-lg border border-line bg-sunken px-3 py-2 motion-safe:animate-pulse"
    >
      <span className="mt-0.5 size-[18px] shrink-0 rounded-[5px] bg-line" />
      <span className="grid flex-1 gap-1.5 py-0.5">
        <span className="h-3.5 w-20 rounded bg-line" />
        <span className="h-3 w-full max-w-32 rounded bg-line/70" />
      </span>
    </div>
  );
}

export { OptionSkeleton };
