const DEFAULT_SITE_URL = 'https://lairofartificer.com';
const TIMEOUT_MS = 15_000;
const FAILURES_BEFORE_ALERT = 2;

const CHECKS = [
  { name: 'Site', path: '/api/health' },
  { name: 'Gallery', path: '/api/maps?limit=1' },
  { name: 'Patreon sync', path: '/api/gallery/health' },
];

async function probe(url) {
  try {
    const answer = await fetch(url, {
      headers: { 'User-Agent': 'lair-site-monitor' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await answer.body?.cancel();

    return answer.ok
      ? { ok: true }
      : { ok: false, reason: `HTTP ${answer.status}` };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

async function readState(store, name) {
  const saved = await store.get(`check:${name}`, 'json');
  return saved ?? { failures: 0, alerted: false };
}

function nextState(state, result) {
  if (result.ok) {
    return { failures: 0, alerted: false };
  }

  const failures = Math.min(state.failures + 1, FAILURES_BEFORE_ALERT);
  return { failures, alerted: failures >= FAILURES_BEFORE_ALERT };
}

function messageFor(name, url, before, after, result) {
  if (after.alerted && !before.alerted) {
    return `🔴 ${name} is down: ${result.reason}\n${url}`;
  }
  if (before.alerted && !after.alerted) {
    return `🟢 ${name} is back up\n${url}`;
  }

  return null;
}

async function sendTelegram(env, text) {
  const answer = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
    },
  );
  if (!answer.ok) {
    throw new Error(`Telegram answered ${answer.status}`);
  }
}

function sameState(a, b) {
  return a.failures === b.failures && a.alerted === b.alerted;
}

async function runCheck(env, siteUrl, { name, path }) {
  const url = `${siteUrl}${path}`;
  const before = await readState(env.STATE, name);
  const result = await probe(url);
  const after = nextState(before, result);

  const message = messageFor(name, url, before, after, result);
  if (message) {
    await sendTelegram(env, message);
  }
  if (!sameState(before, after)) {
    await env.STATE.put(`check:${name}`, JSON.stringify(after));
  }
}

async function runChecks(env) {
  const siteUrl = (env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
  const results = await Promise.allSettled(
    CHECKS.map((check) => runCheck(env, siteUrl, check)),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Check failed:', result.reason);
    }
  }
}

export default {
  async scheduled(_event, env) {
    await runChecks(env);
  },
};
