interface SyncSchedule {
  intervalMinutes: number;
  graceMinutes: number;
}

function isSyncStale(
  lastSyncAt: string | null,
  now: Date,
  { intervalMinutes, graceMinutes }: SyncSchedule,
): boolean {
  if (!lastSyncAt) {
    return true;
  }

  const maxAgeMs = (intervalMinutes + graceMinutes) * 60 * 1000;
  return now.getTime() - new Date(lastSyncAt).getTime() > maxAgeMs;
}

export { isSyncStale };
export type { SyncSchedule };
