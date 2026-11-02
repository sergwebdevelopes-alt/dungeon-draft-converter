import type { KeyValueStore } from './key-value-store.ts';
import { createLocalStorage } from './local-storage.ts';

const storage: KeyValueStore = createLocalStorage();

export { storage };
export type { KeyValueStore } from './key-value-store.ts';
