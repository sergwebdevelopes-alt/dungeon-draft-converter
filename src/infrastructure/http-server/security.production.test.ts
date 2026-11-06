import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, describe, it } from 'node:test';
import express from 'express';

process.env.NODE_ENV = 'production';

const { securityHeaders } = await import('./security.ts');

describe('securityHeaders in production', () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = express();
    app.use(securityHeaders);
    app.get('/', (_req, res) => {
      res.send('ok');
    });

    server = await new Promise<http.Server>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    const { port } = server.address() as { port: number };
    base = `http://localhost:${port}`;
  });

  after(() => {
    server.closeAllConnections();
    server.close();
  });

  it('keeps the base headers', async () => {
    const res = await fetch(base);

    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
  });

  it('sets a strict Content-Security-Policy', async () => {
    const res = await fetch(base);
    const policy = res.headers.get('content-security-policy') ?? '';
    const directives = policy.split('; ');

    assert.ok(directives.includes("default-src 'self'"), policy);
    assert.ok(directives.includes("img-src 'self' blob:"), policy);
    assert.ok(directives.includes("object-src 'none'"), policy);
    assert.ok(directives.includes("frame-ancestors 'none'"), policy);
    assert.ok(!policy.includes('data:'), policy);
    assert.ok(!policy.includes('unsafe-inline'), policy);
  });

  it('allows Cloudflare Web Analytics and no other outside source', async () => {
    const res = await fetch(base);
    const policy = res.headers.get('content-security-policy') ?? '';
    const directives = policy.split('; ');

    assert.ok(
      directives.includes(
        "script-src 'self' https://static.cloudflareinsights.com",
      ),
      policy,
    );
    assert.ok(
      directives.includes("connect-src 'self' https://cloudflareinsights.com"),
      policy,
    );
    assert.deepEqual([...new Set(policy.match(/https:\/\/[^\s;]+/g))].sort(), [
      'https://cloudflareinsights.com',
      'https://static.cloudflareinsights.com',
    ]);
    assert.ok(!policy.includes('*'), policy);
  });

  it('sets Strict-Transport-Security', async () => {
    const res = await fetch(base);

    assert.equal(
      res.headers.get('strict-transport-security'),
      'max-age=15552000',
    );
  });
});
