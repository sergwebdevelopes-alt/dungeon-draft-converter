import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sourcePath } from './paths.ts';

describe('sourcePath', () => {
  it('resolves a map inside the source folder', () => {
    assert.equal(
      sourcePath('/maps', 'Ice cavern/NoGrid/HiRes.png'),
      '/maps/Ice cavern/NoGrid/HiRes.png',
    );
  });

  it('refuses the client folder', () => {
    assert.throws(
      () => sourcePath('/maps', 'Tych Maps/client.png'),
      /Refusing/,
    );
    assert.throws(
      () => sourcePath('/maps', 'Ice cavern/../Tych Maps/client.png'),
      /Refusing/,
    );
  });

  it('refuses paths outside the source folder', () => {
    assert.throws(() => sourcePath('/maps', '../secret.png'), /Refusing/);
    assert.throws(() => sourcePath('/maps', '/etc/passwd'), /Refusing/);
  });
});
