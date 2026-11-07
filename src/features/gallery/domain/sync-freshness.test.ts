import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSyncStale } from './sync-freshness.ts';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const DAILY = { intervalMinutes: 1440, graceMinutes: 60 };

describe('isSyncStale', () => {
  it('allows one interval and the grace time since the last sync', () => {
    assert.equal(isSyncStale('2026-11-06T11:00:00.000Z', NOW, DAILY), false);
    assert.equal(isSyncStale('2026-11-06T10:59:59.999Z', NOW, DAILY), true);
  });

  it('follows the interval and grace time it is given', () => {
    const hourly = { intervalMinutes: 60, graceMinutes: 30 };

    assert.equal(isSyncStale('2026-11-07T10:30:00.000Z', NOW, hourly), false);
    assert.equal(isSyncStale('2026-11-07T10:29:00.000Z', NOW, hourly), true);
  });

  it('counts a gallery that never synced as stale', () => {
    assert.equal(isSyncStale(null, NOW, DAILY), true);
  });
});
