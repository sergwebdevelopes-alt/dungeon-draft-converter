import { SITE } from '@/shared/config/site.ts';

function pageTitle(title?: string): string {
  if (title) {
    return `${title} · ${SITE.name}`;
  }

  return SITE.tagline ? `${SITE.name} · ${SITE.tagline}` : SITE.name;
}

export { pageTitle };
