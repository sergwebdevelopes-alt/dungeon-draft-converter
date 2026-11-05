const PATREON_API = 'https://www.patreon.com/api/';
const ALLOWED_PATH = /^\/api\/posts(\/\d+)?$/;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0 Safari/537.36';

function refuse(status, message) {
  return Response.json({ error: message }, { status });
}

function viaRelay(link, origin) {
  return link?.startsWith(PATREON_API)
    ? `${origin}/api/${link.slice(PATREON_API.length)}`
    : link;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      !env.RELAY_KEY ||
      request.headers.get('X-Relay-Key') !== env.RELAY_KEY
    ) {
      return refuse(403, 'Forbidden.');
    }
    if (request.method !== 'GET' || !ALLOWED_PATH.test(url.pathname)) {
      return refuse(404, 'Not found.');
    }

    const answer = await fetch(
      `https://www.patreon.com${url.pathname}${url.search}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': request.headers.get('User-Agent') ?? USER_AGENT,
        },
      },
    );
    if (!answer.ok) {
      return new Response(answer.body, { status: answer.status });
    }

    const body = await answer.json();
    if (body.links?.next) {
      body.links.next = viaRelay(body.links.next, url.origin);
    }

    return Response.json(body);
  },
};
