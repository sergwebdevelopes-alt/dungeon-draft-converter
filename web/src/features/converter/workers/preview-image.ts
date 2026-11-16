const PREVIEW_SIDE = 2048;
const PREVIEW_FORMAT = { type: 'image/webp', quality: 0.9 };

async function drawSmaller(picture: ImageBitmap, scale: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(
    Math.round(picture.width * scale),
    Math.round(picture.height * scale),
  );
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No canvas to draw the preview on.');
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(picture, 0, 0, canvas.width, canvas.height);

  return canvas.convertToBlob(PREVIEW_FORMAT);
}

async function shrinkForPreview(image: Blob): Promise<Blob> {
  try {
    const picture = await createImageBitmap(image);
    try {
      const scale = PREVIEW_SIDE / Math.max(picture.width, picture.height);

      return scale < 1 ? await drawSmaller(picture, scale) : image;
    } finally {
      picture.close();
    }
  } catch {
    return image;
  }
}

export { PREVIEW_SIDE, shrinkForPreview };
