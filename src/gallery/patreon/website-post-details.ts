import {
  PATREON_WEBSITE_API_URL,
  PATREON_WEBSITE_PAGE_SIZE,
  PATREON_WEBSITE_USER_AGENT,
} from '../../config.ts';
import {
  HttpClientError,
  type HttpClient,
} from '../../http/client/http-client.ts';
import type {
  ListOptions,
  PostDetails,
  PostDetailsSource,
  PostImage,
} from './post-details.ts';

const DETAIL_FIELDS = {
  'fields[post]': 'post_file,published_at',
  include: 'user_defined_tags,media',
  'fields[post_tag]': 'value',
  'fields[media]': 'file_name,mimetype,metadata,image_urls',
};

const HEADERS = {
  'User-Agent': PATREON_WEBSITE_USER_AGENT,
  Accept: 'application/json',
};

interface RawFile {
  url?: string;
  width?: number;
  height?: number;
  media_id?: number | string;
}

interface RawPost {
  id: string;
  attributes: {
    published_at?: string | null;
    post_file?: RawFile | null;
  };
  relationships?: {
    user_defined_tags?: { data?: { id: string }[] };
    media?: { data?: { id: string }[] };
  };
}

interface RawIncluded {
  id: string;
  type: string;
  attributes: {
    value?: string;
    file_name?: string;
    mimetype?: string;
    metadata?: { dimensions?: { w?: number; h?: number } } | null;
    image_urls?: { original?: string } | null;
  };
}

interface RawResponse<T> {
  data: T;
  included?: RawIncluded[];
  links?: { next?: string };
}

interface Included {
  tags: Map<string, string>;
  media: Map<string, RawIncluded['attributes']>;
}

function listUrl(campaignId: string): string {
  const query = new URLSearchParams({
    'filter[campaign_id]': campaignId,
    'filter[is_by_creator]': 'true',
    sort: '-published_at',
    'page[count]': String(PATREON_WEBSITE_PAGE_SIZE),
    ...DETAIL_FIELDS,
  });

  return `${PATREON_WEBSITE_API_URL}/posts?${query}`;
}

function postUrl(postId: string): string {
  const query = new URLSearchParams(DETAIL_FIELDS);

  return `${PATREON_WEBSITE_API_URL}/posts/${postId}?${query}`;
}

function byType(included: RawIncluded[], type: string) {
  return included.filter((item) => item.type === type);
}

function readIncluded(included: RawIncluded[] = []): Included {
  return {
    tags: new Map(
      byType(included, 'post_tag').map((t) => [t.id, t.attributes.value ?? '']),
    ),
    media: new Map(byType(included, 'media').map((m) => [m.id, m.attributes])),
  };
}

function fromPostFile(
  file: RawFile | null | undefined,
  media: Included['media'],
): PostImage[] {
  if (!file?.url || !file.width || !file.height || file.media_id == null) {
    return [];
  }

  const mediaId = String(file.media_id);

  return [
    {
      url: file.url,
      width: file.width,
      height: file.height,
      mediaId,
      isMain: true,
      fileName: media.get(mediaId)?.file_name,
    },
  ];
}

function fromMedia(id: string, item: RawIncluded['attributes']): PostImage[] {
  const url = item.image_urls?.original;
  const { w, h } = item.metadata?.dimensions ?? {};
  if (!item.mimetype?.startsWith('image/') || !url || !w || !h) {
    return [];
  }

  return [
    {
      url,
      width: w,
      height: h,
      mediaId: id,
      isMain: false,
      fileName: item.file_name,
    },
  ];
}

function imagesOf(post: RawPost, media: Included['media']): PostImage[] {
  const main = fromPostFile(post.attributes.post_file, media);
  const mainIds = new Set(main.map((image) => image.mediaId));
  const attached = (post.relationships?.media?.data ?? [])
    .filter(({ id }) => !mainIds.has(id))
    .flatMap(({ id }) => {
      const item = media.get(id);
      return item ? fromMedia(id, item) : [];
    });

  return [...main, ...attached];
}

function toDetails(post: RawPost, { tags, media }: Included): PostDetails {
  const tagIds = post.relationships?.user_defined_tags?.data ?? [];

  return {
    postId: post.id,
    publishedAt: post.attributes.published_at ?? '',
    tags: tagIds.flatMap(({ id }) => tags.get(id) ?? []),
    images: imagesOf(post, media),
  };
}

function createWebsitePostDetails(
  http: HttpClient,
  campaignId: string,
): PostDetailsSource {
  return {
    async listDetails({ stopWhen, signal }: ListOptions = {}) {
      const all: PostDetails[] = [];
      let url: string | undefined = listUrl(campaignId);

      while (url) {
        const page: RawResponse<RawPost[]> = await http.get(url, {
          headers: HEADERS,
          signal,
        });
        const included = readIncluded(page.included);
        const details = page.data.map((post) => toDetails(post, included));
        all.push(...details);

        url = stopWhen && details.some(stopWhen) ? undefined : page.links?.next;
      }

      return all;
    },

    async details(postId, signal) {
      try {
        const page = await http.get<RawResponse<RawPost>>(postUrl(postId), {
          headers: HEADERS,
          signal,
        });
        return toDetails(page.data, readIncluded(page.included));
      } catch (error) {
        if (error instanceof HttpClientError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
  };
}

export { createWebsitePostDetails };
