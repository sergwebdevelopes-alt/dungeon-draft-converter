import type { PostDetails } from '../domain/patreon-post.ts';

interface ListOptions {
  stopWhen?: (details: PostDetails) => boolean;
  signal?: AbortSignal;
}

interface PatreonPostDetails {
  listDetails(options?: ListOptions): Promise<PostDetails[]>;
  details(postId: string, signal?: AbortSignal): Promise<PostDetails | null>;
}

export type { ListOptions, PatreonPostDetails };
