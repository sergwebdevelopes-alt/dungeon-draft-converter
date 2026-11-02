import { SITE } from '../config/site.ts';

function PageTitle({ title }: { title?: string }) {
  return <title>{title ? `${title} · ${SITE.name}` : SITE.name}</title>;
}

export { PageTitle };
