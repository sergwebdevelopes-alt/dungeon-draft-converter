import type { MapRecord } from './model/types.ts';

interface StoredMap extends MapRecord {
  checkedAt: string;
}

interface MapStore {
  listMaps(): Promise<StoredMap[]>;
  replaceMaps(maps: MapRecord[]): Promise<void>;
}

export type { MapStore, StoredMap };
