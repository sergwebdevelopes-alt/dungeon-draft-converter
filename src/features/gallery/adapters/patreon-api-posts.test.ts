import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  HttpClientError,
  type HttpClient,
  type RequestOptions,
} from '../../../infrastructure/http-client/http-client.ts';
import { createOfficialPatreonApi } from './patreon-api-posts.ts';
import type { PatreonAuth } from './patreon-token-refresher.ts';

interface Call {
  url: string;
  options?: RequestOptions;
}

function fakeHttp(answers: unknown[]) {
  const calls: Call[] = [];
  const http: HttpClient = {
    get<T>(url: string, options?: RequestOptions) {
      calls.push({ url, options });
      const answer = answers.shift();
      return answer instanceof Error
        ? Promise.reject(answer)
        : Promise.resolve(answer as T);
    },
    getBytes: () => Promise.reject(new Error('No downloads here.')),
    post: () => Promise.reject(new Error('No posts here.')),
  };

  return { http, calls };
}

function fakeAuth(token = 'secret') {
  let current = token;
  let refreshes = 0;
  const auth: PatreonAuth = {
    accessToken: () => Promise.resolve(current),
    refresh() {
      refreshes += 1;
      current = `fresh-${refreshes}`;
      return Promise.resolve(current);
    },
  };

  return { auth, refreshes: () => refreshes };
}

const keepHtml = (html: string) => html;

function bearer(call: Call): string | undefined {
  return call.options?.headers?.Authorization;
}

function rawPost(id: string, isPublic: boolean | null = true) {
  return {
    id,
    attributes: {
      title: `Post ${id}`,
      content: `<p>Story of post ${id}.</p>`,
      url: `/LairofArtificer/posts/post-${id}`,
      published_at: '2026-10-19T08:26:58.000+00:00',
      is_public: isPublic,
    },
  };
}

describe('createOfficialPatreonApi', () => {
  it('lists every post of the campaign, following the pages', async () => {
    const { http, calls } = fakeHttp([
      { data: [rawPost('1')], links: { next: 'https://api.test/page-2' } },
      { data: [rawPost('2')] },
    ]);
    const api = createOfficialPatreonApi(http, {
      auth: fakeAuth().auth,
      campaignId: '12754508',
      sanitize: keepHtml,
    });

    const posts = await api.listPosts();

    assert.deepEqual(
      posts.map((p) => p.id),
      ['1', '2'],
    );
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /\/campaigns\/12754508\/posts\?/);
    assert.match(
      calls[0].url,
      /fields%5Bpost%5D=title%2Ccontent%2Curl%2Cpublished_at%2Cis_public/,
    );
    assert.equal(calls[1].url, 'https://api.test/page-2');
  });

  it('sends the creator token and the caller signal with every page', async () => {
    const { http, calls } = fakeHttp([{ data: [] }]);
    const signal = new AbortController().signal;

    await createOfficialPatreonApi(http, {
      auth: fakeAuth().auth,
      campaignId: '1',
      sanitize: keepHtml,
    }).listPosts(signal);

    assert.deepEqual(calls[0].options, {
      headers: { Authorization: 'Bearer secret' },
      signal,
    });
  });

  it('gives each post a full link and treats a missing flag as not public', async () => {
    const { http } = fakeHttp([
      { data: [rawPost('1'), rawPost('2', null), rawPost('3', false)] },
    ]);

    const posts = await createOfficialPatreonApi(http, {
      auth: fakeAuth().auth,
      campaignId: '1',
      sanitize: keepHtml,
    }).listPosts();

    assert.equal(
      posts[0].url,
      'https://www.patreon.com/LairofArtificer/posts/post-1',
    );
    assert.deepEqual(
      posts.map((p) => p.isPublic),
      [true, false, false],
    );
  });

  it('refreshes the token once when Patreon answers 401, and retries that page', async () => {
    const { http, calls } = fakeHttp([
      { data: [rawPost('1')], links: { next: 'https://api.test/page-2' } },
      new HttpClientError(401, 'Expired.'),
      { data: [rawPost('2')] },
    ]);
    const { auth, refreshes } = fakeAuth();

    const posts = await createOfficialPatreonApi(http, {
      auth,
      campaignId: '1',
      sanitize: keepHtml,
    }).listPosts();

    assert.deepEqual(
      posts.map((p) => p.id),
      ['1', '2'],
    );
    assert.equal(refreshes(), 1);
    assert.deepEqual(calls.map(bearer), [
      'Bearer secret',
      'Bearer secret',
      'Bearer fresh-1',
    ]);
    assert.equal(calls[2].url, 'https://api.test/page-2');
  });

  it('fails when the fresh token is refused too', async () => {
    const { http } = fakeHttp([
      new HttpClientError(401, 'Expired.'),
      new HttpClientError(401, 'Still refused.'),
    ]);
    const { auth, refreshes } = fakeAuth();

    await assert.rejects(
      createOfficialPatreonApi(http, {
        auth,
        campaignId: '1',
        sanitize: keepHtml,
      }).listPosts(),
      /Still refused/,
    );
    assert.equal(refreshes(), 1);
  });

  it('does not refresh for other errors', async () => {
    const { http } = fakeHttp([new HttpClientError(403, 'Blocked.')]);
    const { auth, refreshes } = fakeAuth();

    await assert.rejects(
      createOfficialPatreonApi(http, {
        auth,
        campaignId: '1',
        sanitize: keepHtml,
      }).listPosts(),
      /Blocked/,
    );
    assert.equal(refreshes(), 0);
  });

  it('passes each post text through the sanitiser into the description', async () => {
    const { http } = fakeHttp([
      {
        data: [
          rawPost('1'),
          {
            ...rawPost('2'),
            attributes: { ...rawPost('2').attributes, content: null },
          },
        ],
      },
    ]);
    const seen: string[] = [];

    const posts = await createOfficialPatreonApi(http, {
      auth: fakeAuth().auth,
      campaignId: '1',
      sanitize: (html) => {
        seen.push(html);
        return `clean:${html}`;
      },
    }).listPosts();

    assert.deepEqual(seen, ['<p>Story of post 1.</p>', '']);
    assert.deepEqual(
      posts.map((p) => p.description),
      ['clean:<p>Story of post 1.</p>', 'clean:'],
    );
  });
});
