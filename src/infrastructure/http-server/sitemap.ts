interface SitemapEntry {
  url: string;
  lastModified?: string;
  images?: string[];
}

const PAGES = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const IMAGES = 'http://www.google.com/schemas/sitemap-image/1.1';

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

function renderImage(url: string): string {
  return `<image:image><image:loc>${escapeXml(url)}</image:loc></image:image>`;
}

function renderEntry({ url, lastModified, images = [] }: SitemapEntry): string {
  const lastmod = lastModified
    ? `<lastmod>${escapeXml(lastModified)}</lastmod>`
    : '';

  return `  <url><loc>${escapeXml(url)}</loc>${lastmod}${images.map(renderImage).join('')}</url>`;
}

function renderSitemap(entries: SitemapEntry[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${PAGES}" xmlns:image="${IMAGES}">`,
    ...entries.map(renderEntry),
    '</urlset>',
    '',
  ].join('\n');
}

export { renderSitemap };
export type { SitemapEntry };
