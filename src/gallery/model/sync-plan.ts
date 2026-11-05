import type { PatreonPost } from '../patreon/patreon-api.ts';
import type { PostDetails } from '../patreon/post-details.ts';
import { imageFolder } from './image-keys.ts';
import { postToMap } from './post-to-map.ts';
import type { MapRecord } from './types.ts';

interface SyncCounts {
  added: number;
  updated: number;
  removed: number;
}

function galleryMaps(
  posts: PatreonPost[],
  details: PostDetails[],
): MapRecord[] {
  const detailsById = new Map(details.map((d) => [d.postId, d]));

  return posts.flatMap((post) => {
    const map = postToMap(post, detailsById.get(post.id));
    return map ? [map] : [];
  });
}

function foldersToRemove(previous: MapRecord[], next: MapRecord[]): string[] {
  const kept = new Set(next.map(imageFolder));

  return previous.map(imageFolder).filter((folder) => !kept.has(folder));
}

function comparable(map: MapRecord): string {
  const { postId, slug, title, subtitle, tags, squares, patreonUrl } = map;

  return JSON.stringify({
    postId,
    slug,
    title,
    subtitle,
    tags,
    squares,
    patreonUrl,
    publishedAt: Date.parse(map.publishedAt),
    image: map.image,
  });
}

function syncCounts(previous: MapRecord[], next: MapRecord[]): SyncCounts {
  const before = new Map(previous.map((map) => [map.postId, map]));
  const after = new Set(next.map((map) => map.postId));
  const kept = next.filter((map) => before.has(map.postId));

  return {
    added: next.length - kept.length,
    updated: kept.filter(
      (map) => comparable(map) !== comparable(before.get(map.postId)!),
    ).length,
    removed: previous.filter((map) => !after.has(map.postId)).length,
  };
}

export { foldersToRemove, galleryMaps, syncCounts };
export type { SyncCounts };
