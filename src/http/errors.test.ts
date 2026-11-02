import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import express, { type ErrorRequestHandler } from 'express';
import { InvalidInputError, UnprocessableError } from '../core/errors.ts';
import { HttpError, errorHandler, notFound } from './errors.ts';

class BadLevelError extends InvalidInputError {}

describe('errorHandler', () => {
  let server: http.Server;
  let base: string;
  let logged: unknown[];
  let passedOn: unknown;
  const originalConsoleError = console.error;

  before(async () => {
    const app = express();

    app.get('/http', () => {
      throw new HttpError(418, 'Short and stout.');
    });
    app.get('/invalid', () => {
      throw new InvalidInputError('The map is broken.');
    });
    app.get('/invalid-subclass', () => {
      throw new BadLevelError('The level is broken.');
    });
    app.get('/unprocessable', () => {
      throw new UnprocessableError('The map is too large.');
    });
    app.get('/unexpected', () => {
      throw new Error('secret internal detail');
    });
    app.get('/async', async () => {
      await Promise.resolve();
      throw new InvalidInputError('Async failure.');
    });
    app.get('/after-headers', (_req, res, next) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.write('partial');
      next(new Error('late failure'));
    });
    app.get('/destroyed', (req, _res, next) => {
      req.socket.destroy();
      next(new Error('client is gone'));
    });
    app.use(notFound);
    app.use(errorHandler);

    const recordPassedOn: ErrorRequestHandler = (error, _req, _res, next) => {
      passedOn = error;
      next(error);
    };
    app.use(recordPassedOn);

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

  beforeEach(() => {
    logged = [];
    passedOn = undefined;
    console.error = (...args: unknown[]) => {
      logged.push(...args);
    };
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  async function errorOf(route: string): Promise<{
    status: number;
    body: unknown;
  }> {
    const res = await fetch(`${base}${route}`);

    return { status: res.status, body: await res.json() };
  }

  it('sends the status and message of an HttpError', async () => {
    assert.deepEqual(await errorOf('/http'), {
      status: 418,
      body: { error: 'Short and stout.' },
    });
    assert.deepEqual(logged, []);
  });

  it('maps InvalidInputError to 400', async () => {
    assert.deepEqual(await errorOf('/invalid'), {
      status: 400,
      body: { error: 'The map is broken.' },
    });
  });

  it('maps subclasses of InvalidInputError to 400', async () => {
    assert.deepEqual(await errorOf('/invalid-subclass'), {
      status: 400,
      body: { error: 'The level is broken.' },
    });
  });

  it('maps UnprocessableError to 422', async () => {
    assert.deepEqual(await errorOf('/unprocessable'), {
      status: 422,
      body: { error: 'The map is too large.' },
    });
  });

  it('handles errors thrown by async handlers', async () => {
    assert.deepEqual(await errorOf('/async'), {
      status: 400,
      body: { error: 'Async failure.' },
    });
  });

  it('hides unexpected errors behind a 500 and logs them', async () => {
    assert.deepEqual(await errorOf('/unexpected'), {
      status: 500,
      body: { error: 'Conversion failed.' },
    });
    assert.equal(logged.length, 1);
    assert.equal((logged[0] as Error).message, 'secret internal detail');
  });

  it('passes the error on when headers were already sent', async () => {
    const res = await fetch(`${base}/after-headers`);

    assert.equal(res.status, 200);
    await assert.rejects(res.text());
    assert.equal((passedOn as Error).message, 'late failure');
  });

  it('sends nothing when the client socket is already destroyed', async () => {
    await assert.rejects(fetch(`${base}/destroyed`));

    assert.deepEqual(logged, []);
    assert.equal(passedOn, undefined);
  });
});

describe('notFound', () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = express();
    app.use(notFound, errorHandler);

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

  it('answers 404 with a JSON error', async () => {
    const res = await fetch(`${base}/missing`, { method: 'POST' });

    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Not found.' });
  });
});
