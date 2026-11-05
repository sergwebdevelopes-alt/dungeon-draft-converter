import type { MapRecord } from '../domain/map-record.ts';

interface StoredMap extends MapRecord {
  checkedAt: string;
}

interface SyncCounts {
  added: number;
  updated: number;
  removed: number;
}

interface MapRepository {
  listMaps(): Promise<StoredMap[]>;
  replaceMaps(maps: MapRecord[]): Promise<SyncCounts>;
}

export type { MapRepository, StoredMap, SyncCounts };
