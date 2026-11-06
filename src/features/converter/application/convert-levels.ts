import { createReadStream } from 'node:fs';
import {
  makeImages,
  type ImageOptions,
} from '../image-processing/render-map-images.ts';
import type { LoadedMap } from '../domain/loaded-map.ts';
import { UnprocessableError } from '../../../shared/errors.ts';
import { mergeLevels } from '../image-processing/merge-levels.ts';

const FOUNDRY_DIR = 'FOUNDRY_VTT_DD2VTT';

interface ConversionInput extends ImageOptions {
  levels: LoadedMap[];
  original?: string;
  foundry?: boolean;
}

interface ConversionFile {
  path: string;
  data: Buffer | AsyncIterable<Buffer>;
}

interface ConversionResult {
  name: string;
  files: AsyncIterable<ConversionFile>;
}

async function convertLevels(
  {
    levels,
    original,
    foundry = false,
    presets,
    variants,
    logo,
  }: ConversionInput,
  workDir: string,
): Promise<ConversionResult> {
  const merged =
    levels.length > 1
      ? await mergeLevels(levels, levels[0].fileNameWithExt, workDir)
      : undefined;
  const map = merged?.map ?? levels[0];
  const foundryFile = foundry ? (merged?.dd2vtt ?? original) : undefined;
  const images = await makeImages(map, workDir, { presets, variants, logo });
  if (images.count === 0) {
    throw new UnprocessableError(
      'This map has no grid information, so only "No grid" images can be made.',
    );
  }

  async function* files(): AsyncGenerator<ConversionFile> {
    if (foundryFile) {
      yield {
        path: `${FOUNDRY_DIR}/${map.fileNameWithExt}`,
        data:
          typeof foundryFile === 'string'
            ? createReadStream(foundryFile)
            : foundryFile,
      };
    }
    yield* images.files;
  }

  return { name: map.fileNameWithoutExt, files: files() };
}

export { convertLevels };
export type { ConversionFile, ConversionInput, ConversionResult };
