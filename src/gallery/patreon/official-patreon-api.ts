import {
  PATREON_API_PAGE_SIZE,
  PATREON_API_URL,
  PATREON_SITE_URL,
} from '../../config.ts';
import {
  HttpClientError,
  type HttpClient,
} from '../../infrastructure/http-client/http-client.ts';
import type { SanitizeHtml } from '../../html/html-sanitizer.ts';
import type { PatreonApi, PatreonPost } from './patreon-api.ts';
import type { PatreonAuth } from './patreon-auth.ts';

const POST_FIELDS = 'title,content,url,published_at,is_public';

interface RawPost {
  id: string;
  attributes: {
    title: string | null;
    content: string | null;
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
  auth: PatreonAuth;
  campaignId: string;
  sanitize: SanitizeHtml;
}

function firstPageUrl(campaignId: string): string {
  const query = new URLSearchParams({
    'fields[post]': POST_FIELDS,
    'page[count]': String(PATREON_API_PAGE_SIZE),
  });

  return `${PATREON_API_URL}/campaigns/${campaignId}/posts?${query}`;
}

function toPost(
  { id, attributes }: RawPost,
  sanitize: SanitizeHtml,
): PatreonPost {
  return {
    id,
    title: attributes.title ?? '',
    description: sanitize(attributes.content ?? ''),
    url: new URL(attributes.url, PATREON_SITE_URL).href,
    publishedAt: attributes.published_at ?? '',
    isPublic: attributes.is_public === true,
  };
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpClientError && error.status === 401;
}

function createOfficialPatreonApi(
  http: HttpClient,
  { auth, campaignId, sanitize }: PatreonAccount,
): PatreonApi {
  function getPage(url: string, token: string, signal?: AbortSignal) {
    const headers = { Authorization: `Bearer ${token}` };

    return http.get<PostPage>(url, { headers, signal });
  }

  async function getPageWithFreshToken(
    url: string,
    signal?: AbortSignal,
  ): Promise<PostPage> {
    try {
      return await getPage(url, await auth.accessToken(), signal);
    } catch (error) {
      if (!isUnauthorized(error)) {
        throw error;
      }
      return getPage(url, await auth.refresh(), signal);
    }
  }

  return {
    async listPosts(signal) {
      const posts: PatreonPost[] = [];
      let url: string | undefined = firstPageUrl(campaignId);

      while (url) {
        const page = await getPageWithFreshToken(url, signal);
        posts.push(...page.data.map((post) => toPost(post, sanitize)));
        url = page.links?.next;
      }

      return posts;
    },
  };
}

export { createOfficialPatreonApi };
