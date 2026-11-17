// board.js — the bounty board with a split master-detail view: the board
// stays visible beside the bounty you pick. Rows are patched in place — the
// time left ticks every second and a minute refresh revalidates the list
// (ETag 304 when nothing changed) without rebuilding the page.
import { apiGet, apiFresh } from './api.js';
import { fmtUsd, fmtNum, fmtLeft, fmtDate, takesEntries, esc } from './fmt.js';

const REFRESH_MS = 60_000;
const leaders = new Map(); // slug -> top-5 rows once fetched

export function renderBoard(main, ctx) {
  const wrap = document.createElement('div');
  wrap.className = 'split';
  wrap.innerHTML =
    '<div class="board-list" role="list" aria-label="Live bounties"></div>' +
    '<aside class="detail" aria-label="Bounty detail"><p class="muted">Pick a bounty to see it here — its rewards, dates and top 5.</p></aside>';
  main.replaceChildren(wrap);
  const listEl = wrap.querySelector('.board-list');
  const detailEl = wrap.querySelector('.detail');

  const rows = new Map(); // slug -> {el, left, pot, fee, entries, status, leader, data}
  let selected = null;
  let timer = 0;
  let refreshTimer = 0;
  let dead = false;

  function sortKey(c) {
    const open = takesEntries(c) ? 0 : 1;
    return open * 1e15 + new Date(c.deadline || 0).getTime();
  }

  function rowHtml(c) {
    const open = takesEntries(c);
    return (
      '<span class="row-title">' + esc(c.title) + '</span>' +
      '<span class="row-meta"><b class="pot">' + fmtUsd(c.potUsd) + '</b>' +
      (c.entryFeeUsd ? ' · <span class="fee">fee ' + fmtUsd(c.entryFeeUsd) + '</span>' : ' · <span class="fee">free</span>') +
      ' · <span class="left">' + fmtLeft(c.deadline) + '</span></span>' +
      '<span class="row-sub"><span class="entries">' + fmtNum(c.submissionCount) + ' entries</span>' +
      ' · <span class="status ' + (open ? 'open' : 'closed') + '">' + (open ? 'taking entries' : 'closed') + '</span>' +
      '<span class="leader"></span></span>'
    );
  }

  function makeRow(c) {
    const el = document.createElement('div');
    el.className = 'row';
    el.setAttribute('role', 'listitem');
    el.tabIndex = 0;
    el.innerHTML = rowHtml(c);
    el.addEventListener('click', () => select(c.slug));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') select(c.slug); });
    return {
      el,
      left: el.querySelector('.left'),
      pot: el.querySelector('.pot'),
      fee: el.querySelector('.fee'),
      entries: el.querySelector('.entries'),
      status: el.querySelector('.status'),
      leader: el.querySelector('.leader'),
      data: c,
    };
  }

  // Patch one row's fields in place; only touched text nodes change.
  function patchRow(r, c) {
    const old = r.data;
    if (old.potUsd !== c.potUsd) r.pot.textContent = fmtUsd(c.potUsd);
    if (old.submissionCount !== c.submissionCount) r.entries.textContent = fmtNum(c.submissionCount) + ' entries';
    const open = takesEntries(c);
    if (takesEntries(old) !== open) {
      r.status.textContent = open ? 'taking entries' : 'closed';
      r.status.className = 'status ' + (open ? 'open' : 'closed');
    }
    r.left.textContent = fmtLeft(c.deadline);
    r.data = c;
  }

  function renderList(items) {
    items = [...items].sort((a, b) => sortKey(a) - sortKey(b));
    const seen = new Set();
    for (const c of items) {
      seen.add(c.slug);
      const r = rows.get(c.slug);
      if (r) patchRow(r, c);
      else {
        const nr = makeRow(c);
        rows.set(c.slug, nr);
        listEl.appendChild(nr.el);
      }
    }
    for (const [slug, r] of rows) {
      if (!seen.has(slug)) { r.el.remove(); rows.delete(slug); }
    }
    // Keep DOM order matching the sort without rebuilding rows.
    for (const c of items) listEl.appendChild(rows.get(c.slug).el);
    if (selected) paintLeader(selected);
    return items;
  }

  function paintLeader(slug) {
    const r = rows.get(slug);
    const got = leaders.get(slug);
    if (r && got && got.top.length) {
      r.leader.textContent = ' · top: ' + got.top[0].handle;
    }
  }

  async function select(slug) {
    selected = slug;
    for (const [s, r] of rows) r.el.classList.toggle('sel', s === slug);
    const c = rows.get(slug);
    if (!c) return;
    detailEl.innerHTML = '<p class="muted">Loading ' + esc(c.data.title) + '…</p>';
    const d = c.data;
    let top5 = leaders.get(slug);
    if (!top5) {
      try {
        const lb = await apiGet('/competitions/' + slug + '/leaderboard');
        top5 = { key: lb.rank_key || 'score', top: (lb.entries || []).slice(0, 5) };
        leaders.set(slug, top5);
        paintLeader(slug);
      } catch (e) { top5 = { key: 'score', top: [] }; }
      if (dead || selected !== slug) return;
    }
    const rewards = (d.rewardsNow || []).slice(0, 5);
    detailEl.innerHTML =
      '<h2>' + esc(d.title) + '</h2>' +
      '<p>' + esc(d.summary || '') + '</p>' +
      '<p class="row-meta"><b>' + fmtUsd(d.potUsd) + ' live pot</b>' +
      (d.entryFeeUsd ? ' · fee ' + fmtUsd(d.entryFeeUsd) : ' · free entry') +
      ' · ' + fmtNum(d.submissionCount) + ' entries</p>' +
      '<p class="row-meta">Opens ' + fmtDate(d.publishedAt || d.opensAt) + ' · closes ' + fmtDate(d.deadline) +
      ' · <span class="status ' + (takesEntries(d) ? 'open' : 'closed') + '">' + (takesEntries(d) ? 'taking entries' : 'closed') + '</span></p>' +
      (rewards.length
        ? '<h3>Rewards</h3><table class="rewards"><tbody>' +
          rewards.map((r) => '<tr><td>#' + r.place + '</td><td>' + fmtUsd(r.amountUsd) + '</td></tr>').join('') +
          '</tbody></table>'
        : '') +
      '<h3>Top 5</h3>' +
      (top5.top.length
        ? '<ol class="top5">' + top5.top.map((e) => {
          const v = e.values || {};
          const score = (e.display && e.display[top5.key] != null) ? e.display[top5.key] : v[top5.key];
          return '<li><a href="#/u/' + esc(e.handle) + '">' + esc(e.handle) + '</a> — ' + esc(top5.key) + ' ' + esc(String(score ?? '')) + '</li>';
        }).join('') + '</ol>'
        : '<p class="muted">No entries yet.</p>') +
      '<p><a href="#/bounty/' + esc(slug) + '">Open bounty page →</a> · ' +
      '<a href="#/bounty/' + esc(slug) + '/leaderboard">Full leaderboard →</a></p>';
    ctx.shotReady(true);
  }

  async function load(fresh) {
    ctx.shotReady(false);
    try {
      const data = fresh ? await apiFresh('/competitions?status=open') : await apiGet('/competitions?status=open');
      if (dead) return;
      const items = renderList(data.items || []);
      ctx.shotReady(true);
      // The split view is the point: open the first bounty beside the board
      // on arrival, so the detail is never an empty box.
      if (!selected && items.length) select(items[0].slug);
    } catch (e) {
      if (dead) return;
      listEl.innerHTML = '<p class="err">Could not load the board: ' + esc(e.message) + '</p>';
      ctx.shotReady(true);
    }
  }

  load(false);
  timer = setInterval(() => {
    for (const [, r] of rows) r.left.textContent = fmtLeft(r.data.deadline);
  }, 1000);
  refreshTimer = setInterval(() => { if (!dead) load(true); }, REFRESH_MS);

  return () => {
    dead = true;
    clearInterval(timer);
    clearInterval(refreshTimer);
  };
}
