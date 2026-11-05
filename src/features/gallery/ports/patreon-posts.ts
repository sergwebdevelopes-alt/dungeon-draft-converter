import type { PatreonPost } from '../domain/patreon-post.ts';

interface PatreonPosts {
  listPosts(signal?: AbortSignal): Promise<PatreonPost[]>;
}

export type { PatreonPosts };
