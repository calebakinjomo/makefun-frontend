// api.js — read-only reads of make.fun's public API, with ETag revalidation.
// One GET per view; answers cached and revalidated with If-None-Match, so a
// refresh inside the minute costs a 304, not a full download.
export const API = 'https://make.fun/api';

// Live counters the header shows: requests sent, 304 cache hits, bytes in.
export const net = { req: 0, hit: 0, bytes: 0 };
export const netListeners = new Set();
export function onNet(fn) { netListeners.add(fn); return () => netListeners.delete(fn); }
function tick() { for (const fn of netListeners) fn(net); }

const cache = new Map(); // url -> {etag, body, at}
const FRESH_MS = 10_000; // younger than this, serve from cache with no request

export async function apiGet(path) {
  const url = API + path;
  const hit = cache.get(url);
  // A body fetched seconds ago is served straight from the cache: switching
  // between routes does not re-hit the API at all.
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.body;
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  net.req++;
  let res;
  try {
    res = await fetch(url, { headers });
  } catch (e) {
    tick();
    throw new Error('make.fun did not answer (' + path + ')');
  }
  if (res.status === 304 && hit) {
    net.hit++;
    hit.at = Date.now();
    tick();
    return hit.body;
  }
  if (!res.ok) {
    tick();
    throw new Error('make.fun answered ' + res.status + ' for ' + path);
  }
  const body = await res.json();
  net.bytes += JSON.stringify(body).length;
  const etag = res.headers.get('etag');
  if (etag) cache.set(url, { etag, body, at: Date.now() });
  tick();
  return body;
}

// A fresh read, ignoring any cached body (used when the user hits refresh).
export async function apiFresh(path) {
  cache.delete(API + path);
  return apiGet(path);
}

export function cachedEtag(path) {
  const hit = cache.get(API + path);
  return hit ? hit.etag : null;
}

export function cacheAgeMs(path) {
  const hit = cache.get(API + path);
  return hit ? Date.now() - hit.at : null;
}
