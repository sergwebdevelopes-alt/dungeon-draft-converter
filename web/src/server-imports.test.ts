import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WEB_SRC = path.dirname(fileURLToPath(import.meta.url));
const THIS_FILE = path.basename(fileURLToPath(import.meta.url));
const SOURCE_FILE = /\.tsx?$/;
const SERVER_IMPORT =
  /^\s*import\s+(type\s+)?[^'"]*?from\s+'((?:\.\.\/)+src\/[^']+)'/gm;
const VALUE_IMPORT_ALLOWED =
  /\/src\/features\/converter\/domain\/grid-stroke\.ts$/;

interface ServerImport {
  file: string;
  from: string;
  typeOnly: boolean;
}

function sourceFiles(): string[] {
  return fs
    .readdirSync(WEB_SRC, { recursive: true, encoding: 'utf8' })
    .filter((file) => SOURCE_FILE.test(file) && file !== THIS_FILE);
}

function serverImports(): ServerImport[] {
  return sourceFiles().flatMap((file) => {
    const code = fs.readFileSync(path.join(WEB_SRC, file), 'utf8');

    return [...code.matchAll(SERVER_IMPORT)].map((match) => ({
      file,
      from: match[2],
      typeOnly: match[1] !== undefined,
    }));
  });
}

describe('imports from the server', () => {
  it('are only types, apart from the shared grid stroke', () => {
    const imports = serverImports();
    const valueImports = imports.filter(
      (entry) => !entry.typeOnly && !VALUE_IMPORT_ALLOWED.test(entry.from),
    );

    expect(imports.length).toBeGreaterThan(0);
    expect(valueImports).toEqual([]);
  });
});
