import sharp from 'sharp';
import type { GalleryImages } from '../ports/map-image-renderer.ts';

interface Size {
  width: number;
  height: number;
}

interface Crop extends Size {
  zoom: number;
  quality: number;
}

interface ScaledCrop {
  scaled: Size;
  left: number;
  top: number;
}

const CARD: Crop = { zoom: 0.8, width: 640, height: 800, quality: 70 };
const BACKDROP: Crop = { zoom: 0.55, width: 2400, height: 1500, quality: 60 };
const VIEW_LONG_EDGE = 2000;
const VIEW_QUALITY = 72;

function scaledCrop(original: Size, crop: Crop): ScaledCrop {
  const ratio = crop.width / crop.height;
  let cropWidth = original.width * crop.zoom;
  let cropHeight = cropWidth / ratio;
  if (cropHeight > original.height * crop.zoom) {
    cropHeight = original.height * crop.zoom;
    cropWidth = cropHeight * ratio;
  }

  const scale = crop.width / cropWidth;
  const scaled = {
    width: Math.round(original.width * scale),
    height: Math.round(original.height * scale),
  };

  return {
    scaled,
    left: Math.floor((scaled.width - crop.width) / 2),
    top: Math.floor((scaled.height - crop.height) / 2),
  };
}

async function sizeOf(original: Buffer): Promise<Size> {
  const { width, height } = await sharp(original).metadata();

  return { width, height };
}

async function renderCrop(
  original: Buffer,
  size: Size,
  crop: Crop,
): Promise<Buffer> {
  const { scaled, left, top } = scaledCrop(size, crop);

  return sharp(original)
    .resize(scaled.width, scaled.height, { fit: 'fill' })
    .extract({ left, top, width: crop.width, height: crop.height })
    .webp({ quality: crop.quality })
    .toBuffer();
}

async function renderView(original: Buffer): Promise<Buffer> {
  return sharp(original)
    .resize(VIEW_LONG_EDGE, VIEW_LONG_EDGE, { fit: 'inside' })
    .webp({ quality: VIEW_QUALITY })
    .toBuffer();
}

async function renderGalleryImages(original: Buffer): Promise<GalleryImages> {
  const size = await sizeOf(original);

  const card = await renderCrop(original, size, CARD);
  const backdrop = await renderCrop(original, size, BACKDROP);
  const view = await renderView(original);

  return { card, view, backdrop };
}

export { renderGalleryImages, scaledCrop };
