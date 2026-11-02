interface KeyValueStore {
  read(key: string): unknown;
  write(key: string, value: unknown): void;
}

export type { KeyValueStore };
