import type { Config } from './types.ts';

const TEST_CONFIG: Config = {
  presets: [
    { name: 'JPG_70', ppi: 70, format: 'jpg' },
    { name: 'WEBP_140', ppi: 140, format: 'webp' },
  ],
  variants: ['NoGrid', 'Grid'],
  maxUploadBytes: 100,
  maxTotalUploadBytes: 150,
  maxLevels: 3,
  maxLogoBytes: 50,
  logo: {
    size: { min: 2, max: 20, step: 1, default: 10 },
    margin: { min: 0, max: 5, step: 0.5, default: 3 },
  },
};

function file(name: string, size = 10, type = ''): File {
  return new File(['x'.repeat(size)], name, { type, lastModified: 1 });
}

export { TEST_CONFIG, file };
