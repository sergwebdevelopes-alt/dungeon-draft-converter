import type { PatreonPost } from '../patreon/patreon-api.ts';
import type { PostDetails } from '../patreon/post-details.ts';
import { imageFolder } from './image-keys.ts';
import { postToMap } from './post-to-map.ts';
import type { MapRecord } from './types.ts';

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

export { foldersToRemove, galleryMaps };
