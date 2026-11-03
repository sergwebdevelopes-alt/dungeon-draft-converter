import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatDuration,
  formatMegabytes,
  formatMegapixels,
  toMegabytes,
} from './format.ts';

describe('formatDuration', () => {
  it('uses seconds below one minute', () => {
    assert.equal(formatDuration(30_000), '30 seconds');
    assert.equal(formatDuration(59_000), '59 seconds');
  });

  it('switches to minutes from one minute', () => {
    assert.equal(formatDuration(60_000), '1 minute');
    assert.equal(formatDuration(120_000), '2 minutes');
  });

  it('uses the singular for exactly one second', () => {
    assert.equal(formatDuration(1000), '1 second');
  });

  it('rounds to one decimal', () => {
    assert.equal(formatDuration(2500), '2.5 seconds');
    assert.equal(formatDuration(100_000), '1.7 minutes');
    assert.equal(formatDuration(1040), '1 second');
  });

  it('formats zero as plural seconds', () => {
    assert.equal(formatDuration(0), '0 seconds');
  });
});

describe('formatMegabytes', () => {
  it('formats whole megabytes', () => {
    assert.equal(formatMegabytes(200 * 1024 * 1024), '200 MB');
    assert.equal(formatMegabytes(8 * 1024 * 1024), '8 MB');
  });

  it('rounds to one decimal', () => {
    assert.equal(formatMegabytes(1.25 * 1024 * 1024), '1.3 MB');
    assert.equal(formatMegabytes(1.24 * 1024 * 1024), '1.2 MB');
  });
});

describe('toMegabytes', () => {
  it('gives megabytes as a number rounded to one decimal', () => {
    assert.equal(toMegabytes(31.26 * 1024 * 1024), 31.3);
    assert.equal(toMegabytes(0), 0);
  });
});

describe('formatMegapixels', () => {
  it('formats whole megapixels', () => {
    assert.equal(formatMegapixels(250_000_000), '250 megapixels');
  });

  it('rounds to one decimal', () => {
    assert.equal(formatMegapixels(123_456_789), '123.5 megapixels');
    assert.equal(formatMegapixels(25_040_000), '25 megapixels');
  });
});
