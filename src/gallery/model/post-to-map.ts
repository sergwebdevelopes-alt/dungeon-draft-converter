import type { PatreonPost } from '../patreon/patreon-api.ts';
import type { PostDetails, PostImage } from '../patreon/post-details.ts';
import { chooseImage } from './choose-image.ts';
import { collectionChips } from './collections.ts';
import { slugify } from './slug.ts';
import { parseTitle, sizeFromFileName } from './title.ts';
import type { MapImage, MapRecord } from './types.ts';

function toMapImage({ url, width, height, mediaId }: PostImage): MapImage {
  return { url, width, height, mediaId };
}

function postToMap(
  post: PatreonPost,
  details: PostDetails | undefined,
): MapRecord | null {
  const image = details && chooseImage(details.images);
  if (
    !post.isPublic ||
    !details ||
    !image ||
    details.collections.length === 0
  ) {
    return null;
  }

  const parsed = parseTitle(post.title);
  const squares = parsed.squares ?? sizeFromFileName(image.fileName);

  return {
    postId: post.id,
    slug: slugify(parsed.title),
    ...parsed,
    ...(squares ? { squares } : {}),
    tags: collectionChips(details.collections),
    patreonUrl: post.url,
    publishedAt: post.publishedAt,
    image: toMapImage(image),
  };
}

export { postToMap };
