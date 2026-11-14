import { useEffect } from 'react';

interface PageTitleOptions {
  enabled?: boolean;
}

function usePageTitle(
  title: string,
  { enabled = true }: PageTitleOptions = {},
): void {
  useEffect(() => {
    if (enabled) {
      document.title = title;
    }
  }, [title, enabled]);
}

export { usePageTitle };
