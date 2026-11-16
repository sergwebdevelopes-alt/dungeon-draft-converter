import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ErrorReporter } from './error-reporter.ts';
import { startErrorReporting } from './start-error-reporting.ts';

const CONFIG = { dsn: 'https://key@errors.test/1', hostname: 'lair.test' };

function pageAt(hostname: string): Window {
  const page = new EventTarget();

  return Object.assign(page, { location: { hostname } }) as unknown as Window;
}

function fail(page: Window, error: unknown, message = 'Uncaught') {
  page.dispatchEvent(new ErrorEvent('error', { error, message }));
}

function reject(page: Window, reason: unknown) {
  page.dispatchEvent(
    Object.assign(new Event('unhandledrejection'), { reason }),
  );
}

function fakeReporter() {
  const reported: [unknown, string][] = [];
  const reporter: ErrorReporter = {
    report: (error, source) => reported.push([error, source]),
  };

  return { reported, reporter };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('startErrorReporting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing away from the live site or without settings', async () => {
    const load = vi.fn();
    const elsewhere = pageAt('localhost');
    const listen = vi.spyOn(elsewhere, 'addEventListener');

    startErrorReporting(CONFIG, elsewhere, load);
    startErrorReporting(undefined, pageAt('lair.test'), load);
    fail(elsewhere, new Error('Ignored.'));
    await settle();

    expect(load).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });

  it('loads the reporter for the live site and passes errors on with where they came from', async () => {
    const { reported, reporter } = fakeReporter();
    const load = vi.fn(() => Promise.resolve(reporter));
    const page = pageAt('lair.test');
    const broken = new Error('The zoom broke.');
    const refused = new Error('The map did not load.');

    startErrorReporting(CONFIG, page, load);
    await settle();
    fail(page, broken);
    reject(page, refused);

    expect(load).toHaveBeenCalledWith('https://key@errors.test/1');
    expect(reported).toEqual([
      [broken, 'error'],
      [refused, 'unhandledrejection'],
    ]);
  });

  it('keeps what fails before the reporter has loaded and sends it afterwards, in order', async () => {
    const { reported, reporter } = fakeReporter();
    let finishLoading = (_reporter: ErrorReporter) => undefined as void;
    const load = () =>
      new Promise<ErrorReporter>((resolve) => {
        finishLoading = resolve;
      });
    const page = pageAt('lair.test');
    const early = new Error('The app did not start.');
    const next = new Error('Then this.');

    startErrorReporting(CONFIG, page, load);
    fail(page, early);
    reject(page, next);
    expect(reported).toEqual([]);

    finishLoading(reporter);
    await settle();

    expect(reported).toEqual([
      [early, 'error'],
      [next, 'unhandledrejection'],
    ]);
  });

  it('uses the message of an error event that carries no error', async () => {
    const { reported, reporter } = fakeReporter();
    const page = pageAt('lair.test');

    startErrorReporting(CONFIG, page, () => Promise.resolve(reporter));
    await settle();
    fail(page, undefined, 'Something odd happened.');

    expect(reported).toEqual([['Something odd happened.', 'error']]);
  });

  it('leaves out noise that is not ours to fix', async () => {
    const { reported, reporter } = fakeReporter();
    const page = pageAt('lair.test');

    startErrorReporting(CONFIG, page, () => Promise.resolve(reporter));
    await settle();
    for (const message of [
      'Script error.',
      'ResizeObserver loop completed with undelivered notifications.',
      'ResizeObserver loop limit exceeded',
    ]) {
      fail(page, undefined, message);
    }

    expect(reported).toEqual([]);
  });

  it('sends at most ten reports from one open page', async () => {
    const { reported, reporter } = fakeReporter();
    const page = pageAt('lair.test');

    startErrorReporting(CONFIG, page, () => Promise.resolve(reporter));
    for (let count = 1; count <= 6; count += 1) {
      fail(page, new Error(`Early ${count}`));
    }
    await settle();
    for (let count = 1; count <= 6; count += 1) {
      reject(page, new Error(`Late ${count}`));
    }

    expect(reported).toHaveLength(10);
    expect(reported.at(-1)?.[0]).toEqual(new Error('Late 4'));
  });

  it('stays quiet when the reporter cannot be loaded', async () => {
    const page = pageAt('lair.test');

    startErrorReporting(CONFIG, page, () =>
      Promise.reject(new Error('Offline.')),
    );
    fail(page, new Error('Lost.'));

    await expect(settle()).resolves.toBeUndefined();
  });

  it('hears about an error React could not recover from while drawing', async () => {
    const { reported, reporter } = fakeReporter();
    const broken = new Error('The picture strip crashed.');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Broken(): never {
      throw broken;
    }
    const container = document.body.appendChild(document.createElement('div'));
    const listening = {
      location: { hostname: 'lair.test' },
      addEventListener: window.addEventListener.bind(window),
    } as unknown as Window;

    startErrorReporting(CONFIG, listening, () => Promise.resolve(reporter));
    await settle();
    const environment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    environment.IS_REACT_ACT_ENVIRONMENT = false;
    const root = createRoot(container);
    try {
      root.render(<Broken />);
      await vi.waitFor(() => expect(reported.length).toBeGreaterThan(0));
    } finally {
      environment.IS_REACT_ACT_ENVIRONMENT = true;
      root.unmount();
      container.remove();
    }

    expect(reported.map(([error]) => error)).toContain(broken);
  });
});
