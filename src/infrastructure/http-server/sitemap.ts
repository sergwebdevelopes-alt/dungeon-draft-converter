interface SitemapEntry {
  url: string;
  lastModified?: string;
}

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

function renderEntry({ url, lastModified }: SitemapEntry): string {
  const lastmod = lastModified
    ? `<lastmod>${escapeXml(lastModified)}</lastmod>`
    : '';

  return `  <url><loc>${escapeXml(url)}</loc>${lastmod}</url>`;
}

function renderSitemap(entries: SitemapEntry[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(renderEntry),
    '</urlset>',
    '',
  ].join('\n');
}

export { renderSitemap };
export type { SitemapEntry };
