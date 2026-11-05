import { tidy } from './tidy-text.ts';
import type { Squares } from './map-record.ts';

interface ParsedTitle {
  title: string;
  subtitle?: string;
  squares?: Squares;
}

const SIZE = /^(\d+)\s*[x×]\s*(\d+)$/i;
const GROUPS = /\[([^\]]*)\]|\(([^)]*)\)/g;
const INLINE_SIZE = /\b(\d+)\s*[x×]\s*(\d+)\b/i;
const FILE_SIZE = /(?:^|[^\d])(\d+)x(\d+)(?:[^\d]|$)/i;
const BATTLEMAP = /^battle\s*maps?$/i;
const BATTLEMAP_WORD = /\bbattle\s*maps?\b/gi;
const SPACE_BEFORE_MARK = /\s+([:;,.!?])/g;

function isLabel(text: string): boolean {
  return text !== '' && !BATTLEMAP.test(text);
}

function toSquares(match: RegExpExecArray | null): Squares | undefined {
  return match ? { x: Number(match[1]), y: Number(match[2]) } : undefined;
}

function sizeOf(labels: string[], rest: string): Squares | undefined {
  for (const label of labels) {
    const squares = toSquares(SIZE.exec(label));
    if (squares) {
      return squares;
    }
  }

  return toSquares(INLINE_SIZE.exec(rest));
}

function parseTitle(raw: string): ParsedTitle {
  const labels = [...raw.matchAll(GROUPS)]
    .map((m) => tidy(m[1] ?? m[2]))
    .filter(isLabel);
  const rest = raw.replace(GROUPS, ' ');
  const squares = sizeOf(labels, rest);
  const names = rest
    .replace(new RegExp(INLINE_SIZE, 'gi'), ' ')
    .replace(BATTLEMAP_WORD, ' ')
    .replace(SPACE_BEFORE_MARK, '$1')
    .split('|')
    .map(tidy)
    .filter(Boolean);
  const extras = [...names.slice(1), ...labels.filter((l) => !SIZE.test(l))];
  const title = names[0] ?? extras.shift() ?? tidy(raw);

  return {
    title,
    ...(extras[0] ? { subtitle: extras[0] } : {}),
    ...(squares ? { squares } : {}),
  };
}

function sizeFromFileName(fileName: string | undefined): Squares | undefined {
  return fileName ? toSquares(FILE_SIZE.exec(fileName)) : undefined;
}

export { parseTitle, sizeFromFileName };
export type { ParsedTitle };
