import { previewReply } from '../model/map-preview.ts';
import { shrinkForPreview } from './preview-image.ts';

async function answer(event: MessageEvent<File>) {
  self.postMessage(await previewReply(event.data, shrinkForPreview));
}

self.addEventListener('message', (event: MessageEvent<File>) => {
  void answer(event);
});
