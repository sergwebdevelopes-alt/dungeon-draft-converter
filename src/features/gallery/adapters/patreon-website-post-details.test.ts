import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  HttpClientError,
  type HttpClient,
  type RequestOptions,
} from '../../../infrastructure/http-client/http-client.ts';
import type { PostDetails } from '../domain/patreon-post.ts';
import { createWebsitePostDetails } from './patreon-website-post-details.ts';

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

function rawPost(
  id: string,
  {
    postFile = null,
    collectionIds = [] as string[],
    mediaIds = [] as string[],
  }: { postFile?: unknown; collectionIds?: string[]; mediaIds?: string[] } = {},
) {
  return {
    id,
    attributes: { published_at: `2026-10-${id}`, post_file: postFile },
    relationships: {
      collections: { data: collectionIds.map((cid) => ({ id: cid })) },
      media: { data: mediaIds.map((mediaId) => ({ id: mediaId })) },
    },
  };
}

function collection(id: string, title: string) {
  return { id, type: 'collection', attributes: { title } };
}

function media(
  id: string,
  fileName: string,
  { mimetype = 'image/jpeg', w = 4000, h = 3000 } = {},
) {
  return {
    id,
    type: 'media',
    attributes: {
      file_name: fileName,
      mimetype,
      metadata: { dimensions: { w, h } },
      image_urls: { original: `https://cdn.test/${id}/original.jpg` },
    },
  };
}

describe('createWebsitePostDetails', () => {
  it('reads the collections and the main image of an Image-tab post', async () => {
    const { http } = fakeHttp([
      {
        data: [
          rawPost('19', {
            postFile: {
              url: 'https://cdn.test/main.jpg',
              width: 4760,
              height: 2240,
              media_id: 7,
            },
            collectionIds: ['c1', 'c2'],
            mediaIds: ['7'],
          }),
        ],
        included: [
          collection('c1', 'Curse of Strahd [In Progress]'),
          collection('c2', 'Original Content'),
          media('7', 'Mansion_34x16_NoGrid.jpg'),
        ],
      },
    ]);

    const [details] = await createWebsitePostDetails(http, '1').listDetails();

    assert.deepEqual(details, {
      postId: '19',
      publishedAt: '2026-10-19',
      collections: ['Curse of Strahd [In Progress]', 'Original Content'],
      images: [
        {
          url: 'https://cdn.test/main.jpg',
          width: 4760,
          height: 2240,
          mediaId: '7',
          isMain: true,
          fileName: 'Mansion_34x16_NoGrid.jpg',
        },
      ],
    });
  });

  it('lists the attached images of a text post, skipping files that are not images', async () => {
    const { http } = fakeHttp([
      {
        data: [rawPost('05', { mediaIds: ['a', 'b', 'c'] })],
        included: [
          media('a', 'Falls.zip', { mimetype: 'application/zip' }),
          media('b', 'Falls_60x40_Grid.jpg'),
          media('c', 'Falls_60x40_NoGrid.jpg', { w: 8400, h: 5600 }),
        ],
      },
    ]);

    const [details] = await createWebsitePostDetails(http, '1').listDetails();

    assert.deepEqual(details.collections, []);
    assert.deepEqual(
      details.images.map(({ mediaId, isMain, url, width }) => ({
        mediaId,
        isMain,
        url,
        width,
      })),
      [
        {
          mediaId: 'b',
          isMain: false,
          url: 'https://cdn.test/b/original.jpg',
          width: 4000,
        },
        {
          mediaId: 'c',
          isMain: false,
          url: 'https://cdn.test/c/original.jpg',
          width: 8400,
        },
      ],
    );
  });

  it('pages through the list newest first, and stops early when asked', async () => {
    const { http, calls } = fakeHttp([
      { data: [rawPost('19')], links: { next: 'https://site.test/page-2' } },
      { data: [rawPost('12')], links: { next: 'https://site.test/page-3' } },
      { data: [rawPost('01')] },
    ]);
    const source = createWebsitePostDetails(http, '12754508');

    const seen = await source.listDetails({
      stopWhen: (details: PostDetails) => details.postId === '12',
    });

    assert.deepEqual(
      seen.map((d) => d.postId),
      ['19', '12'],
    );
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /filter%5Bcampaign_id%5D=12754508/);
    assert.match(calls[0].url, /sort=-published_at/);
    assert.match(calls[0].url, /include=media%2Ccollections&/);
    assert.match(calls[0].url, /fields%5Bcollection%5D=title/);
    assert.doesNotMatch(calls[0].url, /tag/);
    assert.equal(calls[1].url, 'https://site.test/page-2');
  });

  it('sends a browser user agent and the caller signal', async () => {
    const { http, calls } = fakeHttp([{ data: [] }]);
    const signal = new AbortController().signal;

    await createWebsitePostDetails(http, '1').listDetails({ signal });

    assert.match(calls[0].options?.headers?.['User-Agent'] ?? '', /Mozilla/);
    assert.equal(calls[0].options?.signal, signal);
  });

  it('reads one post, and gives null for a post that does not exist', async () => {
    const { http, calls } = fakeHttp([
      {
        data: rawPost('19', { collectionIds: ['c1', 'missing'] }),
        included: [collection('c1', 'Waterdeep')],
      },
      new HttpClientError(404, 'Not found.'),
    ]);
    const source = createWebsitePostDetails(http, '1');

    assert.deepEqual((await source.details('19'))?.collections, ['Waterdeep']);
    assert.equal(await source.details('404'), null);
    assert.match(calls[0].url, /\/posts\/19\?/);
    assert.match(calls[0].url, /include=media%2Ccollections/);
  });

  it('passes on other errors, such as being blocked', async () => {
    const { http } = fakeHttp([new HttpClientError(403, 'Blocked.')]);

    await assert.rejects(
      createWebsitePostDetails(http, '1').details('19'),
      (error) => error instanceof HttpClientError && error.status === 403,
    );
  });
});
