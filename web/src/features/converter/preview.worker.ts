import { previewReply } from './model/map-preview.ts';

async function answer(event: MessageEvent<File>) {
  self.postMessage(await previewReply(event.data));
}

self.addEventListener('message', (event: MessageEvent<File>) => {
  void answer(event);
});
