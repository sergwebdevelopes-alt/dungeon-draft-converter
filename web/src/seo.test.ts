import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://lairofartificer.com';

function read(file: string): string {
  return fs.readFileSync(path.join(WEB, file), 'utf8');
}

function headTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  const meta = /<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"/g;
  for (const [, key, value] of html.matchAll(meta)) {
    tags.set(key, value);
  }

  return tags;
}

function jpegSize(file: string): { width: number; height: number } {
  const bytes = fs.readFileSync(path.join(WEB, file));
  let at = 2;
  while (at < bytes.length) {
    const marker = bytes[at + 1];
    const length = bytes.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: bytes.readUInt16BE(at + 5),
        width: bytes.readUInt16BE(at + 7),
      };
    }
    at += 2 + length;
  }

  throw new Error(`${file} has no image size.`);
}

describe('search engines and link previews', () => {
  const html = read('index.html');
  const tags = headTags(html);

  it('gives the page a title and a description short enough for results', () => {
    const description = tags.get('description') ?? '';

    expect(html).toContain(
      '<title>Lair of Artificer · Battle maps for epic adventures</title>',
    );
    expect(description.length).toBeGreaterThan(50);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('describes the link for Open Graph and Twitter with absolute addresses', () => {
    for (const key of [
      'og:type',
      'og:site_name',
      'og:title',
      'og:description',
      'og:url',
      'og:image',
      'og:image:alt',
      'twitter:card',
      'twitter:title',
      'twitter:description',
      'twitter:image',
    ]) {
      expect(tags.get(key), key).toBeTruthy();
    }
    expect(tags.get('og:url')).toBe(`${SITE}/`);
    expect(tags.get('og:image')).toBe(`${SITE}/og-image.jpg`);
    expect(tags.get('twitter:image')).toBe(tags.get('og:image'));
    expect(tags.get('twitter:card')).toBe('summary_large_image');
  });

  it('ships a preview image of the size the tags announce', () => {
    expect(jpegSize('public/og-image.jpg')).toEqual({
      width: Number(tags.get('og:image:width')),
      height: Number(tags.get('og:image:height')),
    });
    expect(tags.get('og:image:width')).toBe('1200');
    expect(tags.get('og:image:height')).toBe('630');
  });

  it('lets crawlers in, keeps them out of the API and points at the sitemap', () => {
    const robots = read('public/robots.txt');

    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).not.toMatch(/Disallow/);
    expect(robots).toMatch(new RegExp(`^Sitemap: ${SITE}/sitemap.xml$`, 'm'));
  });
});
