import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import {
  MAX_LEVELS,
  MAX_LOGO_BYTES,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
} from '../../config.ts';
import { FORMAT_PRESETS, LOGO_LIMITS, VARIANTS } from '../../core/images.ts';
import { configRouter } from './config.ts';

describe('configRouter', () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = express();
    app.use(configRouter());

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

  it('returns the presets, variants and limits the client needs', async () => {
    const res = await fetch(`${base}/config`);

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
    assert.deepEqual(await res.json(), {
      presets: FORMAT_PRESETS,
      variants: VARIANTS,
      maxUploadBytes: MAX_UPLOAD_BYTES,
      maxTotalUploadBytes: MAX_TOTAL_UPLOAD_BYTES,
      maxLevels: MAX_LEVELS,
      maxLogoBytes: MAX_LOGO_BYTES,
      logo: LOGO_LIMITS,
    });
  });

  it('lists at least one preset and both variants', async () => {
    const res = await fetch(`${base}/config`);
    const body = (await res.json()) as {
      presets: unknown[];
      variants: string[];
    };

    assert.ok(body.presets.length > 0);
    assert.deepEqual(body.variants, ['NoGrid', 'Grid']);
  });
});
