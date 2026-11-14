import { useEffect } from 'react';
import { pageTitle } from '@/shared/lib/page-title.ts';

interface PageTitleOptions {
  enabled?: boolean;
}

function usePageTitle(
  title?: string,
  { enabled = true }: PageTitleOptions = {},
): void {
  useEffect(() => {
    if (enabled) {
      document.title = pageTitle(title);
    }
  }, [title, enabled]);
}

export { usePageTitle };
