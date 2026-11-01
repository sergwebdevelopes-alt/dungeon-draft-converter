import { createReadStream } from 'node:fs';
import path from 'node:path';
import { makeImages, type ImageOptions } from './images.ts';
import { MAP_EXTENSION, type LoadedMap } from './dd2vtt.ts';
import { UnprocessableError } from './errors.ts';
import { mergeLevels } from './merge.ts';

const FOUNDRY_DIR = 'FOUNDRY_VTT_DD2VTT';

interface ConversionInput extends ImageOptions {
  levels: LoadedMap[];
  original?: string;
}

interface ConversionFile {
  path: string;
  data: Buffer | AsyncIterable<Buffer>;
}

interface ConversionResult {
  name: string;
  files: AsyncIterable<ConversionFile>;
}

function mergedFileName(mainFileName: string): string {
  return `${path.parse(mainFileName).name}_merged${MAP_EXTENSION}`;
}

async function convertLevels(
  { levels, original, presets, variants, logo }: ConversionInput,
  workDir: string,
): Promise<ConversionResult> {
  const merged =
    original === undefined
      ? await mergeLevels(
          levels,
          mergedFileName(levels[0].fileNameWithExt),
          workDir,
        )
      : undefined;
  const map = merged?.map ?? levels[0];
  const foundryFile = merged?.dd2vtt ?? original;
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
