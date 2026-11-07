interface PageImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

interface PageHead {
  title: string;
  description: string;
  url: string;
  image: PageImage;
  noindex?: boolean;
  structuredData?: object[];
}

const START = '<!-- page-head -->';
const END = '<!-- /page-head -->';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function meta(attribute: 'name' | 'property', key: string, value: string) {
  return `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
}

function jsonLd(data: object): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function imageSize({ width, height }: PageImage): string[] {
  return width && height
    ? [
        meta('property', 'og:image:width', String(width)),
        meta('property', 'og:image:height', String(height)),
      ]
    : [];
}

function renderPageHead(head: PageHead): string {
  const { title, description, url, image } = head;

  return [
    `<title>${escapeHtml(title)}</title>`,
    meta('name', 'description', description),
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    ...(head.noindex ? [meta('name', 'robots', 'noindex')] : []),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', 'Lair of Artificer'),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image.url),
    ...imageSize(image),
    meta('property', 'og:image:alt', image.alt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
    meta('name', 'twitter:image', image.url),
    ...(head.structuredData ?? []).map(jsonLd),
  ].join('\n    ');
}

function withPageHead(template: string, head: PageHead): string {
  const start = template.indexOf(START);
  const end = template.indexOf(END);
  if (start === -1 || end < start) {
    return template;
  }

  return `${template.slice(0, start + START.length)}\n    ${renderPageHead(head)}\n    ${template.slice(end)}`;
}

export { renderPageHead, withPageHead };
export type { PageHead, PageImage };
