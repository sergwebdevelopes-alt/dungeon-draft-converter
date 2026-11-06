import { useEffect } from 'react';
import { SITE } from '../config/site.ts';

function pageTitle(title?: string): string {
  if (title) {
    return `${title} · ${SITE.name}`;
  }

  return SITE.tagline ? `${SITE.name} · ${SITE.tagline}` : SITE.name;
}

function PageTitle({ title }: { title?: string }) {
  useEffect(() => {
    document.title = pageTitle(title);
  }, [title]);

  return null;
}

export { PageTitle, pageTitle };
