// Live make.fun data, read-only. Answers are cached in memory and revalidated
// with ETags: fresh for a minute, then one conditional request (304 when
// nothing changed, since the API's tags turn over each minute).

const cache = new Map();

export async function get(path) {
  const url = 'https://make.fun/api' + path;
  const hit = cache.get(url);
  const now = Date.now();
  if (hit && now - hit.t < 60000) return hit.d;
  const res = await fetch(url, hit && hit.e ? { headers: { 'If-None-Match': hit.e } } : {});
  if (res.status === 304 && hit) { hit.t = now; return hit.d; }
  if (!res.ok) throw new Error('make.fun answered ' + res.status);
  const data = await res.json();
  cache.set(url, { d: data, e: res.headers.get('ETag'), t: now });
  return data;
}

/** The bounty board: { items: [...] }. */
export const board = () => get('/competitions?status=open&activity=times');

/** One bounty, by slug. */
export const bounty = (slug) => get('/competitions/' + encodeURIComponent(slug));

/** A bounty's leaderboard: { columns, entries, rank_key, tie_break }. */
export const leader = (slug) => get('/competitions/' + encodeURIComponent(slug) + '/leaderboard');

/** An account's public profile, by handle. */
export const profile = (handle) => get('/profiles/' + encodeURIComponent(handle));
