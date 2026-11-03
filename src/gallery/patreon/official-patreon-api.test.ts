import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  HttpClient,
  RequestOptions,
} from '../../http/client/http-client.ts';
import { createOfficialPatreonApi } from './official-patreon-api.ts';

interface Call {
  url: string;
  options?: RequestOptions;
}

function fakeHttp(pages: unknown[]) {
  const calls: Call[] = [];
  const http: HttpClient = {
    get<T>(url: string, options?: RequestOptions) {
      calls.push({ url, options });
      return Promise.resolve(pages.shift() as T);
    },
  };

  return { http, calls };
}

function rawPost(id: string, isPublic: boolean | null = true) {
  return {
    id,
    attributes: {
      title: `Post ${id}`,
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
      token: 'secret',
      campaignId: '12754508',
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
      /fields%5Bpost%5D=title%2Curl%2Cpublished_at%2Cis_public/,
    );
    assert.equal(calls[1].url, 'https://api.test/page-2');
  });

  it('sends the creator token and the caller signal with every page', async () => {
    const { http, calls } = fakeHttp([{ data: [] }]);
    const signal = new AbortController().signal;

    await createOfficialPatreonApi(http, {
      token: 'secret',
      campaignId: '1',
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
      token: 't',
      campaignId: '1',
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
});
