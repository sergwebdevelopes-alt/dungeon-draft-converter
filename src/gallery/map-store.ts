import type { MapRecord } from './model/types.ts';

interface StoredMap extends MapRecord {
  checkedAt: string;
}

interface SyncCounts {
  added: number;
  updated: number;
  removed: number;
}

interface MapStore {
  listMaps(): Promise<StoredMap[]>;
  replaceMaps(maps: MapRecord[]): Promise<SyncCounts>;
}

export type { MapStore, StoredMap, SyncCounts };
