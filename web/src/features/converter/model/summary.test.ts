import { describe, expect, it } from 'vitest';
import { imageCount, presetLabel, zipName } from './summary.ts';
import { file } from './test-config.ts';

describe('summary', () => {
  it('labels a preset', () => {
    expect(presetLabel({ name: 'WEBP_140', ppi: 140, format: 'webp' })).toBe(
      'WEBP · 140 px',
    );
  });

  it('counts images per map set', () => {
    expect(imageCount(0, 4, 2)).toBe(0);
    expect(imageCount(3, 4, 2)).toBe(8);
  });

  it('names the zip after the main map', () => {
    expect(zipName([file('Cave.dd2vtt')])).toBe('Cave.zip');
    expect(zipName([file('Cave.DD2VTT')])).toBe('Cave.zip');
    expect(zipName([file('Tower.dd2vtt'), file('Cellar.dd2vtt')])).toBe(
      'Tower.zip',
    );
  });
});
