import { afterEach, describe, expect, it } from 'vitest';
import { startAnalytics } from './cloudflare-analytics.ts';

const CONFIG = {
  cloudflareToken: 'token-123',
  hostname: 'lairofartificer.com',
};

function blankPage(): Document {
  return document.implementation.createHTMLDocument('Lair');
}

function beacons(page: Document): HTMLScriptElement[] {
  return [...page.head.querySelectorAll('script')];
}

describe('startAnalytics', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('adds the Cloudflare beacon with the token on the site domain', () => {
    const page = blankPage();

    startAnalytics(CONFIG, 'lairofartificer.com', page);

    const [beacon, ...others] = beacons(page);
    expect(others).toEqual([]);
    expect(beacon.src).toBe(
      'https://static.cloudflareinsights.com/beacon.min.js',
    );
    expect(beacon.defer).toBe(true);
    expect(JSON.parse(beacon.dataset.cfBeacon ?? '')).toEqual({
      token: 'token-123',
    });
  });

  it('stays off on any other address, such as local development', () => {
    for (const hostname of [
      'localhost',
      '127.0.0.1',
      'www.lairofartificer.com',
      'lairofartificer.com.evil.test',
    ]) {
      const page = blankPage();

      startAnalytics(CONFIG, hostname, page);

      expect(beacons(page), hostname).toEqual([]);
    }
  });

  it('reads the address of the current page by default', () => {
    startAnalytics(CONFIG);

    expect(beacons(document)).toEqual([]);
  });

  it('stays off without analytics settings', () => {
    const page = blankPage();

    startAnalytics(undefined, 'lairofartificer.com', page);

    expect(beacons(page)).toEqual([]);
  });
});
