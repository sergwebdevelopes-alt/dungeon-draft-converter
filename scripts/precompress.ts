import path from 'node:path';
import { precompress } from './compress/precompress.ts';

const DIST_DIR = path.join(import.meta.dirname, '..', 'web/dist');

async function main() {
  const compressed = await precompress(DIST_DIR);

  console.log(`✓ precompressed ${compressed.length} files`);
}

await main();
