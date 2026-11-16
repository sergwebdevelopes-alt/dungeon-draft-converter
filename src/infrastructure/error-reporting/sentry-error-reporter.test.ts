import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { createSentryErrorReporter } from './sentry-error-reporter.ts';

interface SentEvent {
  path: string;
  exception?: {
    values: {
      type: string;
      value: string;
      stacktrace?: { frames: unknown[] };
    }[];
  };
  tags?: Record<string, string>;
  release?: string;
  request?: unknown;
  user?: unknown;
}

describe('createSentryErrorReporter', () => {
  let ingest: http.Server;
  let dsn: string;
  const sent: SentEvent[] = [];

  before(async () => {
    ingest = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const lines = Buffer.concat(chunks).toString().split('\n');
        for (const line of lines.filter(Boolean)) {
          const item = JSON.parse(line) as SentEvent;
          if (item.exception) {
            sent.push({
              ...item,
              path: new URL(req.url ?? '', 'http://ingest').pathname,
            });
          }
        }
        res.end('{}');
      });
    });
    await new Promise<void>((resolve) =>
      ingest.listen(0, '127.0.0.1', resolve),
    );
    const { port } = ingest.address() as { port: number };
    dsn = `http://publickey@127.0.0.1:${port}/42`;
  });

  after(() => {
    ingest.closeAllConnections();
    ingest.close();
  });

  async function nextEvent(): Promise<SentEvent> {
    const deadline = Date.now() + 5_000;
    while (sent.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const event = sent.shift();
    assert.ok(event, 'No event reached the error service.');

    return event;
  }

  it('sends an error with its cause, its stack, where it happened and the release, and nothing about the request', async () => {
    const reporter = createSentryErrorReporter({ dsn, release: 'abc123' });

    reporter.report(
      new TypeError('The map could not be drawn.', {
        cause: new Error('The disk is full.'),
      }),
      { where: 'http', method: 'POST', path: '/api/convert', attempt: 2 },
    );
    const event = await nextEvent();

    assert.equal(event.path, '/api/42/envelope/');
    assert.deepEqual(
      event.exception?.values.map(({ type, value }) => `${type}: ${value}`),
      ['Error: The disk is full.', 'TypeError: The map could not be drawn.'],
    );
    assert.ok(
      (event.exception?.values.at(-1)?.stacktrace?.frames.length ?? 0) > 0,
    );
    assert.deepEqual(event.tags, {
      where: 'http',
      method: 'POST',
      path: '/api/convert',
      attempt: '2',
    });
    assert.equal(event.release, 'abc123');
    assert.equal(event.request, undefined);
    assert.equal(event.user, undefined);
  });

  it('leaves out a detail that has no value', async () => {
    const reporter = createSentryErrorReporter({ dsn });

    reporter.report(new Error('Patreon did not answer.'), {
      where: 'gallery-sync',
      path: undefined,
    });

    assert.deepEqual((await nextEvent()).tags, { where: 'gallery-sync' });
  });
});
