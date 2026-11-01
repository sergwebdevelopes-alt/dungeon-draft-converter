import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { unzipSync } from 'fflate';
import { createFflateZipWriter } from './fflate-zip-writer.ts';

function collectZip() {
  const chunks: Uint8Array[] = [];
  let ended = 0;
  let failure: Error | undefined;

  const zip = createFflateZipWriter({
    write: (chunk) => chunks.push(chunk),
    end: () => ended++,
    fail: (error) => {
      failure = error;
    },
  });

  return {
    zip,
    ended: () => ended,
    failure: () => failure,
    unzip: () => unzipSync(Buffer.concat(chunks)),
  };
}

describe('createFflateZipWriter', () => {
  it('writes files made of several chunks', () => {
    const { zip, ended, unzip } = collectZip();

    const first = zip.addFile('maps/a.txt');
    first.write(Buffer.from('hello '));
    first.write(Buffer.from('world'));
    first.close();

    const second = zip.addFile('maps/b.txt');
    second.write(Buffer.from('second'));
    second.close();

    zip.finish();

    const files = unzip();
    assert.deepEqual(Object.keys(files).sort(), ['maps/a.txt', 'maps/b.txt']);
    assert.equal(Buffer.from(files['maps/a.txt']).toString(), 'hello world');
    assert.equal(Buffer.from(files['maps/b.txt']).toString(), 'second');
    assert.equal(ended(), 1);
  });

  it('writes an empty file', () => {
    const { zip, unzip } = collectZip();

    zip.addFile('empty.txt').close();
    zip.finish();

    assert.equal(unzip()['empty.txt'].length, 0);
  });

  it('ends without failing for an empty zip', () => {
    const { zip, ended, failure, unzip } = collectZip();

    zip.finish();

    assert.equal(ended(), 1);
    assert.equal(failure(), undefined);
    assert.deepEqual(unzip(), {});
  });
});
