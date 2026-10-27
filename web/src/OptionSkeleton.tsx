export function OptionSkeleton() {
  return (
    <div className="option is-skeleton" aria-hidden="true">
      <span className="option-check" />
      <span className="option-body">
        <strong>&nbsp;</strong>
        <span className="muted">&nbsp;</span>
      </span>
    </div>
  );
}
