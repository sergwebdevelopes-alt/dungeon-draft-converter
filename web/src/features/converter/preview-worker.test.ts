import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewReply } from './model/map-preview.ts';
import { readPreviewInWorker } from './preview-worker.ts';

const UNREADABLE = 'This file could not be read as a Dungeondraft map.';

const workers: FakeWorker[] = [];

class FakeWorker extends EventTarget {
  posted: unknown[] = [];
  terminated = false;
  crash = false;

  constructor() {
    super();
    workers.push(this);
  }

  postMessage(file: File) {
    this.posted.push(file);
    void this.reply(file);
  }

  terminate() {
    this.terminated = true;
  }

  private async reply(file: File) {
    if (this.crash) {
      this.dispatchEvent(new Event('error'));
      return;
    }
    const data = await previewReply(file);
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
}

function map(): File {
  return new File(
    [
      JSON.stringify({
        resolution: { map_size: { x: 20, y: 25 } },
        image: 'iVBORw0KGgoAAAANSUhEUg==',
      }),
    ],
    'Cave.dd2vtt',
  );
}

describe('readPreviewInWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    workers.length = 0;
  });

  it('reads the map in a worker and stops the worker afterwards', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const file = map();

    const preview = await readPreviewInWorker(file);

    expect([preview.columns, preview.rows]).toEqual([20, 25]);
    expect(workers[0].posted).toEqual([file]);
    expect(workers[0].terminated).toBe(true);
  });

  it('passes on why the worker could not read the map', async () => {
    vi.stubGlobal('Worker', FakeWorker);

    await expect(
      readPreviewInWorker(new File(['{not json'], 'a.dd2vtt')),
    ).rejects.toThrow(UNREADABLE);
    expect(workers[0].terminated).toBe(true);
  });

  it('reports a worker that fails to run', async () => {
    vi.stubGlobal(
      'Worker',
      class extends FakeWorker {
        crash = true;
      },
    );

    await expect(readPreviewInWorker(map())).rejects.toThrow(UNREADABLE);
  });

  it('reads on the page where workers are not available', async () => {
    vi.stubGlobal('Worker', undefined);

    const preview = await readPreviewInWorker(map());

    expect(preview.columns).toBe(20);
    expect(workers).toHaveLength(0);
  });
});
