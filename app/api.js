// Minimal public-API client for make.fun: GET only, with an in-memory cache
// that revalidates with ETags. The API's ETags are bound to the minute, so a
// revalidation inside the same minute answers 304 and costs nothing.
const API = 'https://make.fun/api';
const FRESH_MS = 60000;

// url -> { etag, body, at }
const store = new Map();

export async function getJson(path) {
  const url = API + path;
  const now = Date.now();
  const hit = store.get(url);
  if (hit && now - hit.at < FRESH_MS) return hit.body;
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  let res;
  try {
    res = await fetch(url, { headers, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 304 && hit) {
    hit.at = now;
    return hit.body;
  }
  if (!res.ok) throw new Error('make.fun API ' + res.status + ' for ' + path);
  const body = await res.json();
  store.set(url, { etag: res.headers.get('etag'), body, at: now });
  return body;
}

export function board() {
  return getJson('/competitions?status=open');
}

export function bounty(slug) {
  return getJson('/competitions/' + encodeURIComponent(slug));
}

export function leaderboard(slug) {
  return getJson('/competitions/' + encodeURIComponent(slug) + '/leaderboard');
}

export function profile(handle) {
  return getJson('/profiles/' + encodeURIComponent(handle));
}
