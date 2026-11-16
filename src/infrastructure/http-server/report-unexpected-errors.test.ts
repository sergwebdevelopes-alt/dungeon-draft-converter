import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import express from 'express';
import { InvalidInputError, UnprocessableError } from '../../shared/errors.ts';
import type { ErrorContext } from '../error-reporting/error-reporter.ts';
import { HttpError, errorHandler } from './http-errors.ts';
import { reportUnexpectedErrors } from './report-unexpected-errors.ts';

class BadLevelError extends InvalidInputError {}

describe('reportUnexpectedErrors', () => {
  let server: http.Server;
  let base: string;
  const reported: { error: unknown; context: ErrorContext }[] = [];
  const broken = new Error('The database is gone.');

  before(async () => {
    mock.method(console, 'error', () => undefined);
    const app = express();

    app.get('/unexpected', () => {
      throw broken;
    });
    app.get('/not-an-error', () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'boom';
    });
    app.get('/busy', () => {
      throw new HttpError(503, 'Busy.');
    });
    app.get('/invalid', () => {
      throw new BadLevelError('The level is broken.');
    });
    app.get('/unprocessable', () => {
      throw new UnprocessableError('The map is too large.');
    });
    app.get('/gone', (req, _res, next) => {
      req.socket.destroy();
      next(new Error('The visitor left.'));
    });
    app.use(
      reportUnexpectedErrors({
        report: (error, context) => reported.push({ error, context }),
      }),
    );
    app.use(errorHandler);

    server = await new Promise<http.Server>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    const { port } = server.address() as { port: number };
    base = `http://localhost:${port}`;
  });

  after(() => {
    server.closeAllConnections();
    server.close();
    mock.restoreAll();
  });

  beforeEach(() => {
    reported.length = 0;
  });

  it('reports an error nobody expected, with the method and the path but not the query', async () => {
    const res = await fetch(`${base}/unexpected?token=secret`);

    assert.equal(res.status, 500);
    assert.deepEqual(reported, [
      {
        error: broken,
        context: { where: 'http', method: 'GET', path: '/unexpected' },
      },
    ]);
  });

  it('reports something thrown that is not an error', async () => {
    await fetch(`${base}/not-an-error`);

    assert.equal(reported.length, 1);
    assert.equal(reported[0].error, 'boom');
  });

  it('says nothing about refusals the visitor is told about', async () => {
    const statuses = [];
    for (const path of ['/busy', '/invalid', '/unprocessable']) {
      statuses.push((await fetch(`${base}${path}`)).status);
    }

    assert.deepEqual(statuses, [503, 400, 422]);
    assert.deepEqual(reported, []);
  });

  it('says nothing when the visitor has already gone', async () => {
    await assert.rejects(fetch(`${base}/gone`));

    assert.deepEqual(reported, []);
  });
});
