import type { PatreonPost } from '../domain/patreon-post.ts';

interface PatreonApi {
  listPosts(signal?: AbortSignal): Promise<PatreonPost[]>;
}

export type { PatreonApi };
