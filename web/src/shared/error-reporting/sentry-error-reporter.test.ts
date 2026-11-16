import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSentryErrorReporter } from './sentry-error-reporter.ts';

interface SentEvent {
  exception?: { values: { type: string; value: string }[] };
  tags?: Record<string, string>;
  request?: { url?: string };
  user?: unknown;
  breadcrumbs?: unknown[];
}

function captureRequests() {
  const sent: { url: string; event: SentEvent }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: { body: string }) => {
      for (const line of String(init.body).split('\n').filter(Boolean)) {
        const item = JSON.parse(line) as SentEvent;
        if (item.exception) {
          sent.push({ url, event: item });
        }
      }

      return Promise.resolve(new Response('{}'));
    }),
  );

  return sent;
}

describe('createSentryErrorReporter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends an error with its cause, its source and the page address, and nothing about the visitor', async () => {
    const sent = captureRequests();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const reporter = createSentryErrorReporter('https://key@errors.test/42');

    console.info('The visitor opened a map.');
    document.body.click();
    reporter.report(
      new TypeError('The zoom broke.', { cause: new Error('No pointer.') }),
      'error',
    );
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    const [{ url, event }] = sent;

    expect(new URL(url).origin).toBe('https://errors.test');
    expect(new URL(url).pathname).toBe('/api/42/envelope/');
    expect(
      event.exception?.values.map(({ type, value }) => `${type}: ${value}`),
    ).toEqual(['Error: No pointer.', 'TypeError: The zoom broke.']);
    expect(event.tags).toEqual({ source: 'error' });
    expect(event.request?.url).toBe(window.location.href);
    expect(event.user).toBeUndefined();
    expect(event.breadcrumbs ?? []).toEqual([]);
  });
});
