import path from 'node:path';

const BLOCKED_FOLDER = 'Tych Maps';

function sourcePath(srcDir: string, relative: string): string {
  const full = path.resolve(srcDir, relative);
  const inside = path.relative(srcDir, full);
  const blocked =
    inside.startsWith('..') ||
    path.isAbsolute(inside) ||
    inside.split(path.sep)[0] === BLOCKED_FOLDER;
  if (blocked) {
    throw new Error(`Refusing to read ${relative}`);
  }

  return full;
}

export { sourcePath };
