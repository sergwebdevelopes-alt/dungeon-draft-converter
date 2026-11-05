import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { createFetchHttpClient } from './fetch-http-client.ts';
import { HttpClientError } from './http-client.ts';

describe('createFetchHttpClient', () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    server = http.createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (path === '/echo') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ agent: req.headers['user-agent'] }));
        return;
      }
      if (path === '/inspect') {
        let body = '';
        req.on('data', (chunk: Buffer) => (body += chunk.toString()));
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              method: req.method,
              type: req.headers['content-type'] ?? null,
              query: new URL(req.url ?? '/', 'http://localhost').search,
              body,
            }),
          );
        });
        return;
      }
      if (path === '/bytes') {
        res.end(Buffer.from([0, 1, 2, 255]));
        return;
      }
      if (path === '/busy') {
        res.writeHead(429, { 'Retry-After': '30' });
        res.end('{}');
        return;
      }
      if (path === '/slow') {
        setTimeout(() => res.end('{}'), 1_000);
        return;
      }
      res.writeHead(404);
      res.end('{}');
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    base = `http://localhost:${port}`;
  });

  after(() => {
    server.closeAllConnections();
    server.close();
  });

  it('gets JSON and sends the given headers', async () => {
    const body = await createFetchHttpClient().get<{ agent: string }>(
      `${base}/echo`,
      { headers: { 'User-Agent': 'lair-test' } },
    );

    assert.deepEqual(body, { agent: 'lair-test' });
  });

  it('posts a JSON body and reads the JSON answer', async () => {
    const answer = await createFetchHttpClient().post(`${base}/inspect`, {
      grant: 'refresh',
    });

    assert.deepEqual(answer, {
      method: 'POST',
      type: 'application/json',
      query: '',
      body: '{"grant":"refresh"}',
    });
  });

  it('posts without a body, keeping the query', async () => {
    const answer = await createFetchHttpClient().post(
      `${base}/inspect?grant_type=refresh_token`,
    );

    assert.deepEqual(answer, {
      method: 'POST',
      type: null,
      query: '?grant_type=refresh_token',
      body: '',
    });
  });

  it('turns an error answer to a post into an HttpClientError without the query', async () => {
    await assert.rejects(
      createFetchHttpClient().post(`${base}/nope?client_secret=hidden`),
      (error) => {
        assert.ok(error instanceof HttpClientError);
        assert.equal(error.status, 404);
        assert.match(error.message, /^POST .*\/nope answered 404\.$/);
        assert.doesNotMatch(error.message, /hidden/);
        return true;
      },
    );
  });

  it('downloads a body as bytes', async () => {
    const bytes = await createFetchHttpClient().getBytes(`${base}/bytes`);

    assert.ok(Buffer.isBuffer(bytes));
    assert.deepEqual([...bytes], [0, 1, 2, 255]);
  });

  it('turns an error answer to a download into an HttpClientError', async () => {
    await assert.rejects(
      createFetchHttpClient().getBytes(`${base}/nope`),
      (error) => error instanceof HttpClientError && error.status === 404,
    );
  });

  it('turns an error answer into an HttpClientError with the wait time', async () => {
    await assert.rejects(
      createFetchHttpClient().get(`${base}/busy?token=secret`),
      (error) => {
        assert.ok(error instanceof HttpClientError);
        assert.equal(error.name, 'HttpClientError');
        assert.equal(error.status, 429);
        assert.equal(error.retryAfterMs, 30_000);
        assert.doesNotMatch(error.message, /secret/);
        return true;
      },
    );
  });

  it('leaves the wait time out when the server gives none', async () => {
    await assert.rejects(
      createFetchHttpClient().get(`${base}/nope`),
      (error) => {
        assert.ok(error instanceof HttpClientError);
        assert.equal(error.status, 404);
        assert.equal(error.retryAfterMs, undefined);
        return true;
      },
    );
  });

  it('stops a request that takes longer than the timeout', async () => {
    await assert.rejects(
      createFetchHttpClient(20).get(`${base}/slow`),
      (error) => {
        assert.ok(error instanceof DOMException);
        assert.equal(error.name, 'TimeoutError');
        return true;
      },
    );
  });

  it('stops a request when the caller cancels it', async () => {
    const controller = new AbortController();
    const request = createFetchHttpClient().get(`${base}/slow`, {
      signal: controller.signal,
    });
    controller.abort();

    await assert.rejects(request, (error) => {
      assert.ok(error instanceof DOMException);
      assert.equal(error.name, 'AbortError');
      return true;
    });
  });
});
