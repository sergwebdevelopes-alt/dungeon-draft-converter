import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InvalidMapsQueryError, parseMapsQuery } from './parse-maps-query.ts';

const SIZES = { pageSize: 24, maxPageSize: 48 };

describe('parseMapsQuery', () => {
  it('starts at the first map with the default page size', () => {
    assert.deepEqual(parseMapsQuery({}, SIZES), { offset: 0, limit: 24 });
  });

  it('reads the collection, the offset and the page size', () => {
    assert.deepEqual(
      parseMapsQuery({ tag: 'Waterdeep', offset: '21', limit: '48' }, SIZES),
      { tag: 'Waterdeep', offset: 21, limit: 48 },
    );
  });

  it('treats empty values as not given', () => {
    assert.deepEqual(
      parseMapsQuery({ tag: '', offset: '', limit: '' }, SIZES),
      { offset: 0, limit: 24 },
    );
  });

  it('refuses a page size outside its range or not a whole number', () => {
    for (const limit of ['0', '49', 'abc', '1.5', '-1', '2e1']) {
      assert.throws(
        () => parseMapsQuery({ limit }, SIZES),
        new InvalidMapsQueryError('limit must be a whole number from 1 to 48.'),
        limit,
      );
    }
  });

  it('refuses an offset that is negative or not a whole number', () => {
    for (const offset of ['-1', 'x', '0.5']) {
      assert.throws(
        () => parseMapsQuery({ offset }, SIZES),
        new InvalidMapsQueryError('offset must be a whole number 0 or more.'),
        offset,
      );
    }
  });
});
