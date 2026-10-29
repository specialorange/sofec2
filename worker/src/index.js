// Sound of Fractions logging API.
// Receives the interaction logs the app POSTs to /api/logging/ and stores them in D1.
// Export logs with `npm run export` (see README.md); there is no public read endpoint.

const MAX_BODY_BYTES = 64 * 1024; // one log carries the whole rhythm state; real ones are a few KB
const MAX_FIELD_CHARS = 32 * 1024;

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function clip(value) {
  if (value === null || value === undefined) return null;
  const s = String(value);
  return s.length > MAX_FIELD_CHARS ? s.slice(0, MAX_FIELD_CHARS) : s;
}

// The client wraps a timestamp like "SSSS... 2026-10-28 21:30:00 TTTT..."; keep just the time.
function clientTime(header) {
  if (!header) return null;
  const m = String(header).match(/S+\s+(.*?)\s+T+\s*$/);
  return m ? m[1].slice(0, 64) : null;
}

async function readForm(request) {
  const type = request.headers.get('content-type') || '';
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return { tooLarge: true };
  if (type.includes('application/json')) {
    try { return { data: JSON.parse(raw) }; } catch { return { data: {} }; }
  }
  return { data: Object.fromEntries(new URLSearchParams(raw)) };
}

async function handleLogging(request, env) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return json(413, { error: 'too large' });

  if (env.RATE_LIMITER) {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return json(429, { error: 'slow down' });
  }

  const { data, tooLarge } = await readForm(request);
  if (tooLarge) return json(413, { error: 'too large' });

  const uid = clip(data.UID);
  const action = clip(data.Action);
  if (!uid && !action) return json(400, { error: 'missing UID and Action' });

  await env.DB.prepare(
    `INSERT INTO logs (uid, user_logged_in, action, unsaved_actions, current_state, client_time, country, user_agent)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  ).bind(
    uid,
    clip(data.UserLoggedIn),
    action,
    clip(data.UnsavedActions),
    clip(data.CurrentStageCollection),
    clientTime(data.header),
    (request.cf && request.cf.country) || null,
    clip(request.headers.get('user-agent'))?.slice(0, 300) ?? null
  ).run();

  return json(200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (path === '/api/logging') {
      if (request.method !== 'POST') return json(405, { error: 'POST only' });
      return handleLogging(request, env);
    }

    // The Login button's endpoints need a user/song database that does not exist anymore.
    if (['/api/login', '/api/logout', '/api/getSongs'].includes(path)) {
      return json(501, { error: 'Accounts are not available on this copy of Sound of Fractions.' });
    }

    return json(404, { error: 'not found' });
  },
};
