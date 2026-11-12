import type { PatreonPost } from './patreon-post.ts';
import type { PostDetails, PostImage } from './patreon-post.ts';
import { chooseImages } from './choose-map-image.ts';
import { collectionChips } from './collection-chips.ts';
import { slugify } from './map-slugs.ts';
import { parseTitle, sizeFromFileName } from './parse-post-title.ts';
import type { MapImage, MapRecord } from './map-record.ts';

function toMapImage({ url, width, height, mediaId }: PostImage): MapImage {
  return { url, width, height, mediaId };
}

function postToMap(
  post: PatreonPost,
  details: PostDetails | undefined,
): MapRecord | null {
  const images = details ? chooseImages(details.images) : [];
  if (
    !post.isPublic ||
    !details ||
    images.length === 0 ||
    details.collections.length === 0
  ) {
    return null;
  }

  const parsed = parseTitle(post.title);
  const squares = parsed.squares ?? sizeFromFileName(images[0].fileName);

  return {
    postId: post.id,
    slug: slugify(parsed.title),
    ...parsed,
    ...(squares ? { squares } : {}),
    description: post.description,
    tags: collectionChips(details.collections),
    patreonUrl: post.url,
    publishedAt: post.publishedAt,
    images: images.map(toMapImage),
  };
}

export { postToMap };
