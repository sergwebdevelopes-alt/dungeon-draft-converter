interface ImageStorage {
  has(key: string): Promise<boolean>;
  put(key: string, data: Buffer): Promise<void>;
  removeFolder(prefix: string): Promise<void>;
  urlFor(key: string): string;
}

export type { ImageStorage };
