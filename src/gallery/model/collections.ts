import { tidy } from './text.ts';

const BRACKETED = /\[[^\]]*\]|\([^)]*\)/g;

function collectionName(title: string): string {
  return tidy(title.replace(BRACKETED, ' '));
}

function collectionChips(titles: string[]): string[] {
  const byKey = new Map<string, string>();

  for (const name of titles.map(collectionName)) {
    const key = name.toLowerCase();
    if (name && !byKey.has(key)) {
      byKey.set(key, name);
    }
  }

  return [...byKey.values()];
}

export { collectionChips, collectionName };
