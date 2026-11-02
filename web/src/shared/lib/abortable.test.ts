import { describe, expect, it } from 'vitest';
import { isAbortError } from '../http/index.ts';
import { abortable } from './abortable.ts';

describe('abortable', () => {
  it('passes the result through', async () => {
    const signal = new AbortController().signal;

    await expect(abortable(Promise.resolve('maps'), signal)).resolves.toBe(
      'maps',
    );
  });

  it('stops waiting when aborted, without cancelling the work', async () => {
    const controller = new AbortController();
    let resolve: (value: string) => void = () => {};
    const work = new Promise<string>((done) => {
      resolve = done;
    });

    const waiting = abortable(work, controller.signal);
    controller.abort();

    const error: unknown = await waiting.catch((e: unknown) => e);
    expect(isAbortError(error)).toBe(true);
    resolve('maps');
    await expect(work).resolves.toBe('maps');
  });

  it('rejects at once when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const error: unknown = await abortable(
      Promise.resolve('maps'),
      controller.signal,
    ).catch((e: unknown) => e);
    expect(isAbortError(error)).toBe(true);
  });
});
