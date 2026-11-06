import { useLayoutEffect, useRef, useState } from 'react';

const DESCRIPTION = [
  'text-sm leading-relaxed text-muted [&>*+*]:mt-3',
  '[&_strong]:font-bold [&_strong]:text-text [&_b]:font-bold [&_b]:text-text [&_em]:italic [&_i]:italic',
  '[&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1 [&_ul]:pl-5 [&_ol]:grid [&_ol]:list-decimal [&_ol]:gap-1 [&_ol]:pl-5',
  '[&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-2',
].join(' ');

const COLLAPSED = 'line-clamp-2 lg:line-clamp-none';

function useClipped(open: boolean, html: string) {
  const ref = useRef<HTMLElement>(null);
  const [clipped, setClipped] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || open) {
      return;
    }

    const measure = () =>
      setClipped(element.scrollHeight > element.clientHeight + 1);
    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [open, html]);

  return { ref, clipped };
}

function MapDescription({ html }: { html: string }) {
  const [open, setOpen] = useState(false);
  const { ref, clipped } = useClipped(open, html);

  return (
    <div className="grid justify-items-start gap-1">
      <section
        ref={ref}
        aria-label="Description"
        tabIndex={0}
        className={`${DESCRIPTION} ${open ? '' : COLLAPSED}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {(clipped || open) && (
        <button
          type="button"
          aria-expanded={open}
          className="text-sm font-bold text-brand-text lg:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Less' : 'More'}
        </button>
      )}
    </div>
  );
}

export { MapDescription };
