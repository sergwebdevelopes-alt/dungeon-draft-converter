import type { MapRecord } from '../domain/map-record.ts';

interface StoredMap extends MapRecord {
  checkedAt: string;
}

interface SyncCounts {
  added: number;
  updated: number;
  removed: number;
}

interface MapsPageQuery {
  tag?: string;
  offset: number;
  limit: number;
}

interface MapsPage {
  maps: StoredMap[];
  total: number;
}

interface MapRepository {
  listMaps(): Promise<StoredMap[]>;
  listMapsPage(query: MapsPageQuery): Promise<MapsPage>;
  listTags(): Promise<string[]>;
  findMap(slug: string): Promise<StoredMap | null>;
  replaceMaps(maps: MapRecord[]): Promise<SyncCounts>;
}

export type { MapRepository, MapsPage, MapsPageQuery, StoredMap, SyncCounts };
