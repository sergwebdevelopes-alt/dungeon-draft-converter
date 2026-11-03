const EDGE_PUNCTUATION = /^[\s\-–—:,]+|[\s\-–—:,]+$/g;

function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').replace(EDGE_PUNCTUATION, '').trim();
}

export { tidy };
