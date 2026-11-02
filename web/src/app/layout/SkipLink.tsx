import type { MouseEvent } from 'react';
import { MAIN_ID, focusMain } from './main-content.ts';

function SkipLink() {
  function handleClick(event: MouseEvent) {
    event.preventDefault();
    focusMain();
  }

  return (
    <a
      href={`#${MAIN_ID}`}
      onClick={handleClick}
      className="sr-only rounded-full bg-gold font-bold text-on-gold shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-5 focus:py-2.5"
    >
      Skip to content
    </a>
  );
}

export { SkipLink };
