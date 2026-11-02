import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp, { type Sharp } from 'sharp';
import {
  parseManifest,
  toCatalog,
  type ManifestEntry,
} from './gallery/manifest.ts';
import { sourcePath } from './gallery/paths.ts';

interface Options {
  srcDir: string;
  manifestFile: string;
  outDir: string;
}

interface Crop {
  zoom: number;
  width: number;
  height: number;
  quality: number;
}

const ROOT_DIR = path.join(import.meta.dirname, '..');
const DEFAULT_MANIFEST = path.join(ROOT_DIR, 'content/maps.json');
const DEFAULT_OUT_DIR = path.join(ROOT_DIR, 'web/public/maps');
const CATALOG_FILE = 'catalog.json';
const VIEW_LONG_EDGE = 2000;
const VIEW_QUALITY = 72;
const CARD: Crop = { zoom: 0.8, width: 640, height: 800, quality: 70 };
const BACKDROP: Crop = { zoom: 0.55, width: 2400, height: 1500, quality: 60 };

function readOptions(): Options {
  const { values } = parseArgs({
    options: {
      src: { type: 'string' },
      manifest: { type: 'string' },
      out: { type: 'string' },
    },
  });
  if (!values.src) {
    throw new Error(
      'Usage: npm run gallery -- --src <folder with maps> [--manifest maps.json] [--out folder]',
    );
  }

  return {
    srcDir: path.resolve(values.src),
    manifestFile: path.resolve(values.manifest ?? DEFAULT_MANIFEST),
    outDir: path.resolve(values.out ?? DEFAULT_OUT_DIR),
  };
}

async function readManifest(file: string): Promise<ManifestEntry[]> {
  const raw = JSON.parse(await fs.readFile(file, 'utf8')) as unknown;

  return parseManifest(raw);
}

function open(file: string): Sharp {
  return sharp(file, { limitInputPixels: false });
}

async function writeCrop(file: string, out: string, crop: Crop) {
  const { width = 0, height = 0 } = await open(file).metadata();
  const ratio = crop.width / crop.height;
  let cropWidth = Math.round(width * crop.zoom);
  let cropHeight = Math.round(cropWidth / ratio);
  if (cropHeight > height * crop.zoom) {
    cropHeight = Math.round(height * crop.zoom);
    cropWidth = Math.round(cropHeight * ratio);
  }

  await open(file)
    .extract({
      left: Math.round((width - cropWidth) / 2),
      top: Math.round((height - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight,
    })
    .resize(crop.width, crop.height)
    .webp({ quality: crop.quality })
    .toFile(out);
}

async function writeView(file: string, out: string) {
  await open(file)
    .resize(VIEW_LONG_EDGE, VIEW_LONG_EDGE, { fit: 'inside' })
    .webp({ quality: VIEW_QUALITY })
    .toFile(out);
}

async function buildMap(entry: ManifestEntry, { srcDir, outDir }: Options) {
  const noGrid = sourcePath(srcDir, entry.sources.noGrid);
  const dir = path.join(outDir, entry.slug);
  await fs.mkdir(dir, { recursive: true });

  await writeCrop(noGrid, path.join(dir, 'card.webp'), CARD);
  await writeCrop(noGrid, path.join(dir, 'backdrop.webp'), BACKDROP);
  await writeView(noGrid, path.join(dir, 'view.webp'));
}

async function writeCatalog(entries: ManifestEntry[], outDir: string) {
  const json = `${JSON.stringify(toCatalog(entries), null, 2)}\n`;

  await fs.writeFile(path.join(outDir, CATALOG_FILE), json);
}

async function main() {
  const options = readOptions();
  const entries = await readManifest(options.manifestFile);
  sharp.cache(false);

  for (const entry of entries) {
    await buildMap(entry, options);
    console.log(`✓ ${entry.slug}`);
  }

  await writeCatalog(entries, options.outDir);
  console.log(`✓ ${CATALOG_FILE} (${entries.length} maps)`);
}

await main();
