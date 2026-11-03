import {
  PATREON_API_PAGE_SIZE,
  PATREON_API_URL,
  PATREON_SITE_URL,
} from '../../config.ts';
import type { HttpClient } from '../../http/client/http-client.ts';
import type { PatreonApi, PatreonPost } from './patreon-api.ts';

const POST_FIELDS = 'title,url,published_at,is_public';

interface RawPost {
  id: string;
  attributes: {
    title: string | null;
    url: string;
    published_at: string | null;
    is_public: boolean | null;
  };
}

interface PostPage {
  data: RawPost[];
  links?: { next?: string };
}

interface PatreonAccount {
  token: string;
  campaignId: string;
}

function firstPageUrl(campaignId: string): string {
  const query = new URLSearchParams({
    'fields[post]': POST_FIELDS,
    'page[count]': String(PATREON_API_PAGE_SIZE),
  });

  return `${PATREON_API_URL}/campaigns/${campaignId}/posts?${query}`;
}

function toPost({ id, attributes }: RawPost): PatreonPost {
  return {
    id,
    title: attributes.title ?? '',
    url: new URL(attributes.url, PATREON_SITE_URL).href,
    publishedAt: attributes.published_at ?? '',
    isPublic: attributes.is_public === true,
  };
}

function createOfficialPatreonApi(
  http: HttpClient,
  { token, campaignId }: PatreonAccount,
): PatreonApi {
  const headers = { Authorization: `Bearer ${token}` };

  return {
    async listPosts(signal) {
      const posts: PatreonPost[] = [];
      let url: string | undefined = firstPageUrl(campaignId);

      while (url) {
        const page: PostPage = await http.get<PostPage>(url, {
          headers,
          signal,
        });
        posts.push(...page.data.map(toPost));
        url = page.links?.next;
      }

      return posts;
    },
  };
}

export { createOfficialPatreonApi };
