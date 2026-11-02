import {
  UNREADABLE,
  readMapPreview,
  type MapPreview,
  type PreviewReply,
} from './model/map-preview.ts';

function startWorker(): Worker {
  return new Worker(new URL('./preview.worker.ts', import.meta.url), {
    type: 'module',
  });
}

function askWorker(worker: Worker, file: File): Promise<MapPreview> {
  return new Promise((resolve, reject) => {
    worker.addEventListener('message', (event: MessageEvent<PreviewReply>) => {
      const reply = event.data;
      if (reply.ok) {
        resolve(reply.preview);
      } else {
        reject(new Error(reply.message));
      }
    });
    worker.addEventListener('error', () => reject(new Error(UNREADABLE)));
    worker.postMessage(file);
  });
}

async function readPreviewInWorker(file: File): Promise<MapPreview> {
  if (typeof Worker === 'undefined') {
    return readMapPreview(file);
  }

  const worker = startWorker();
  try {
    return await askWorker(worker, file);
  } finally {
    worker.terminate();
  }
}

export { readPreviewInWorker };
