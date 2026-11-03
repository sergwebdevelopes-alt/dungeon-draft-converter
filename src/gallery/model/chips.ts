import { tidy } from './text.ts';
import type { GalleryRules } from './types.ts';

const SMALL_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
]);

function titleCase(tag: string): string {
  if (/[A-Z]/.test(tag)) {
    return tag;
  }

  return tag
    .split(' ')
    .map((word, i) =>
      i > 0 && SMALL_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

function chips(tags: string[], rules: GalleryRules, title: string): string[] {
  const generic = new Set(
    [...rules.genericTags, rules.tag].map((t) => t.toLowerCase()),
  );
  const inTitle = title.toLowerCase();
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags.map(tidy)) {
    const key = tag.toLowerCase();
    if (!tag || generic.has(key) || inTitle.includes(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(titleCase(tag));
  }

  return result;
}

export { chips };
