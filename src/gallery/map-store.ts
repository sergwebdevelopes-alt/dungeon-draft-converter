import type { MapRecord } from './model/types.ts';

interface StoredMap extends MapRecord {
  checkedAt: string;
}

interface MapStore {
  listMaps(): Promise<StoredMap[]>;
  saveMap(map: MapRecord, source: unknown): Promise<void>;
  removeMaps(postIds: string[]): Promise<void>;
}

export type { MapStore, StoredMap };
