import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createErrorReporter } from './create-error-reporter.ts';
import { NO_ERROR_REPORTER } from './infrastructure/error-reporting/error-reporter.ts';

describe('createErrorReporter', () => {
  it('reports nowhere outside production', () => {
    assert.equal(createErrorReporter(), NO_ERROR_REPORTER);
    assert.doesNotThrow(() =>
      NO_ERROR_REPORTER.report(new Error('Ignored.'), { where: 'test' }),
    );
  });
});
