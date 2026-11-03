import type { PatreonPost } from '../patreon/patreon-api.ts';
import type { PostDetails } from '../patreon/post-details.ts';
import { chips } from './chips.ts';
import { chooseImage } from './choose-image.ts';
import { slugify } from './slug.ts';
import { tidy } from './text.ts';
import { parseTitle, sizeFromFileName } from './title.ts';
import type { GalleryRules, MapRecord } from './types.ts';

function hasTag(details: PostDetails, tag: string): boolean {
  const wanted = tag.toLowerCase();

  return details.tags.some((t) => tidy(t).toLowerCase() === wanted);
}

function postToMap(
  post: PatreonPost,
  details: PostDetails | undefined,
  rules: GalleryRules,
): MapRecord | null {
  const image = details && chooseImage(details.images);
  if (!post.isPublic || !details || !image || !hasTag(details, rules.tag)) {
    return null;
  }

  const parsed = parseTitle(post.title);
  const squares = parsed.squares ?? sizeFromFileName(image.fileName);

  return {
    postId: post.id,
    slug: slugify(parsed.title),
    ...parsed,
    ...(squares ? { squares } : {}),
    tags: chips(details.tags, rules, parsed.title),
    patreonUrl: post.url,
    publishedAt: post.publishedAt,
    image,
  };
}

export { postToMap };
