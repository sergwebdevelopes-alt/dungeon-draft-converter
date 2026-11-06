const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const MAX_CODE_POINT = 0x10ffff;

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith('#')) {
      const value =
        code[1].toLowerCase() === 'x'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return value <= MAX_CODE_POINT ? String.fromCodePoint(value) : entity;
    }

    return ENTITIES[code.toLowerCase()] ?? entity;
  });
}

function plainText(html: string): string {
  const text = html
    .replace(/<\/(p|li|h[1-6]|div)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '');

  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

function shorten(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const words = lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut;

  return `${words.replace(/[\s,.;:!?—–-]+$/, '')}…`;
}

function mapSummary(html: string, maxLength: number): string {
  return shorten(plainText(html), maxLength);
}

export { mapSummary };
