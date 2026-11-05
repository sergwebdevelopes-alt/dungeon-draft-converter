import sanitizeHtml from 'sanitize-html';
import type { SanitizeHtml } from '../ports/html-sanitizer.ts';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'ul',
  'ol',
  'li',
  'a',
];

const SAFE_LINK = /^https:\/\//i;

function safeLink(
  _tagName: string,
  attribs: sanitizeHtml.Attributes,
): sanitizeHtml.Tag {
  const href = attribs.href ?? '';
  if (!SAFE_LINK.test(href)) {
    return { tagName: 'a', attribs: {} };
  }

  return {
    tagName: 'a',
    attribs: { href, target: '_blank', rel: 'noopener noreferrer nofollow' },
  };
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['https'],
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false,
  transformTags: { a: safeLink },
  exclusiveFilter: (frame) => frame.tag === 'p' && !frame.text.trim(),
};

const sanitizeWithSanitizeHtml: SanitizeHtml = (html) =>
  sanitizeHtml(html, OPTIONS).trim();

export { sanitizeWithSanitizeHtml };
