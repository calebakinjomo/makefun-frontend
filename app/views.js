// The four surfaces: board, bounty page, leaderboard, profile. All data comes
// from make.fun's public API through api.js; nothing here writes anywhere.
import { board, bounty, leaderboard, profile } from './api.js';
import { esc, money, rate, num, compact, left, when, ago } from './fmt.js';

const PER_PAGE = 50;

function isOpen(c) {
  return c.deadline ? new Date(c.deadline).getTime() > Date.now() : false;
}

function potOf(c) {
  const v = parseFloat(c.potUsd);
  return isFinite(v) ? v : 0;
}

function imgSrc(img) {
  if (!img) return '';
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('/')) return 'https://make.fun' + img;
  return img;
}

// A small markdown renderer: headings, fenced code, lists, bold, italic,
// inline code and links. Enough for bounty descriptions and rules.
function md(src) {
  const lines = String(src || '').split('\n');
  let out = '';
  let list = null;
  let fence = false;
  const flushList = () => {
    if (list !== null) {
      out += '<ul>' + list + '</ul>';
      list = null;
    }
  };
  const inline = (t) => {
    let e = esc(t);
    e = e.replace(/`([^`]+)`/g, '<code>$1</code>');
    e = e.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    e = e.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    e = e.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return e;
  };
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (fence) {
        out += '</code></pre>';
        fence = false;
      } else {
        flushList();
        out += '<pre><code>';
        fence = true;
      }
      continue;
    }
    if (fence) {
      out += esc(line) + '\n';
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushList();
      out += '<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>';
      continue;
    }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      list = (list || '') + '<li>' + inline(li[1]) + '</li>';
      continue;
    }
    if (line.trim() === '') {
      flushList();
      continue;
    }
    flushList();
    out += '<p>' + inline(line.trim()) + '</p>';
  }
  flushList();
  if (fence) out += '</code></pre>';
  return out;
}

function snippet(text, n) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

export async function showBoard(view) {
  const data = await board();
  const items = data.items || [];
  const open = items.filter(isOpen);
  const closed = items.filter((c) => !isOpen(c));
  const pot = items.reduce((s, c) => s + potOf(c), 0);
  const entries = items.reduce((s, c) => s + (c.submissionCount || 0), 0);
  const card = (c) => {
    const fee = c.entryFeeUsd === null || c.entryFeeUsd === undefined ? 'Free entry' : money(c.entryFeeUsd) + ' fee';
    const openNow = isOpen(c);
    return '<article class="card" data-search="' + esc((c.title + ' ' + c.slug + ' ' + (c.category || '')).toLowerCase()) + '">'
      + '<h3><a href="#/bounty/' + encodeURIComponent(c.slug) + '">' + esc(c.title) + '</a></h3>'
      + '<p>' + esc(snippet(c.summary || c.description, 150)) + '</p>'
      + '<div class="meta">'
      + '<span>Pot <b>' + money(potOf(c)) + '</b></span>'
      + '<span>' + esc(fee) + '</span>'
      + '<span data-dl="' + esc(c.deadline || '') + '">' + esc(left(c.deadline)) + '</span>'
      + '<span><b>' + num(c.submissionCount || 0) + '</b> entries</span>'
      + '<span class="pill ' + (openNow ? 'live' : 'closed') + '">' + (openNow ? 'taking entries' : 'closed') + '</span>'
      + '</div>'
      + '<div class="links"><a href="#/bounty/' + encodeURIComponent(c.slug) + '">Bounty page</a>'
      + '<a href="#/bounty/' + encodeURIComponent(c.slug) + '/leaderboard">Results</a></div>'
      + '</article>';
  };
  view.innerHTML = '<h1>Live bounties</h1>'
    + '<p class="sub">Every competition on make.fun, with its live pot, entry fee, time left and entries.</p>'
    + '<div class="stats">'
    + '<div class="stat"><b>' + open.length + '</b><span>taking entries</span></div>'
    + '<div class="stat"><b>' + closed.length + '</b><span>closed</span></div>'
    + '<div class="stat"><b>' + money(pot) + '</b><span>in live pots</span></div>'
    + '<div class="stat"><b>' + compact(entries) + '</b><span>entries in all</span></div>'
    + '</div>'
    + '<input id="filter" class="filter" type="search" placeholder="Filter by name, slug or category…" aria-label="Filter bounties" autocomplete="off">'
    + '<div class="cards">' + items.map(card).join('') + '</div>';
  const box = view.querySelector('#filter');
  box.addEventListener('input', () => {
    const q = box.value.trim().toLowerCase();
    for (const el of view.querySelectorAll('.card')) {
      el.style.display = !q || (el.getAttribute('data-search') || '').includes(q) ? '' : 'none';
    }
  });
}

export async function showBounty(view, slug, wantLeaderboard) {
  const c = await bounty(slug);
  if (wantLeaderboard) return showLeaderboard(view, c);
  const openNow = isOpen(c);
  const rows = (c.rewardsNow || []).map((r) => '<tr><td>' + esc(String(r.place)) + '</td>'
    + '<td class="num">' + money(r.baseUsd, 2) + '</td>'
    + '<td class="num">' + money(r.feeShareUsd, 2) + '</td>'
    + '<td class="num"><b>' + money(r.amountUsd, 2) + '</b></td></tr>').join('');
  const subs = (c.submissions || []).slice(0, 8).map((s) => '<tr><td><a href="#/u/' + encodeURIComponent(s.hunter || '') + '">' + esc(s.hunter || '—') + '</a></td>'
    + '<td>' + esc(s.title || '—') + '</td>'
    + '<td>' + esc(s.status || '') + '</td>'
    + '<td>' + esc(ago(s.createdAt)) + '</td></tr>').join('');
  view.innerHTML = '<p><a href="#/">&larr; All bounties</a></p>'
    + '<h1>' + esc(c.title || slug) + '</h1>'
    + '<p class="sub">' + esc(snippet(c.summary || c.description, 220)) + '</p>'
    + '<div class="meta"><span class="pill ' + (openNow ? 'live' : 'closed') + '">' + (openNow ? 'taking entries' : 'closed') + '</span>'
    + '<span>Category <b>' + esc(c.category || '—') + '</b></span>'
    + '<span>Status <b>' + esc(c.status || '—') + '</b></span></div>'
    + '<div class="stats">'
    + '<div class="stat"><b>' + money(potOf(c)) + '</b><span>live pot</span></div>'
    + '<div class="stat"><b>' + (c.entryFeeUsd === null || c.entryFeeUsd === undefined ? 'Free' : money(c.entryFeeUsd)) + '</b><span>entry fee</span></div>'
    + '<div class="stat"><b>' + num(c.submissionCount || 0) + '</b><span>entries</span></div>'
    + '<div class="stat"><b data-dl="' + esc(c.deadline || '') + '">' + esc(left(c.deadline)) + '</b><span>time left</span></div>'
    + '</div>'
    + '<div class="links"><a href="#/bounty/' + encodeURIComponent(c.slug) + '/leaderboard">See the results &rarr;</a></div>'
    + (c.winner ? '<p class="sub">Winner: <b>' + esc(typeof c.winner === 'string' ? c.winner : (c.winner.handle || c.winner.title || '')) + '</b></p>' : '')
    + '<h2>Rewards</h2>'
    + '<div class="table-wrap"><table><thead><tr><th>Place</th><th class="num">Base</th><th class="num">Fee share</th><th class="num">Total now</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    + '<h2>Dates</h2>'
    + '<p class="sub">Opened ' + esc(when(c.publishedAt || c.opensAt)) + ' &middot; entries close ' + esc(when(c.deadline)) + ' &middot; ' + esc(left(c.deadline)) + '</p>'
    + '<h2>About this bounty</h2>'
    + '<div class="md">' + md(c.description || '') + '</div>'
    + (c.rules ? '<h2>Rules</h2><div class="md">' + md(c.rules) + '</div>' : '')
    + '<h2>Latest entries</h2>'
    + '<div class="table-wrap"><table><thead><tr><th>Maker</th><th>Entry</th><th>Status</th><th>When</th></tr></thead><tbody>' + (subs || '<tr><td colspan="4">No entries yet.</td></tr>') + '</tbody></table></div>';
}

function isRateKey(key) {
  return key === 'judge' || key.indexOf('rate') !== -1 || key.indexOf('win_rate') !== -1;
}

function cell(entry, col) {
  const v = entry.values ? entry.values[col.key] : undefined;
  const d = entry.display ? entry.display[col.key] : undefined;
  if (v === undefined || v === null) return '—';
  if (isRateKey(col.key)) return rate(v);
  if (d !== undefined && d !== null && String(d) !== String(v)) return esc(String(d));
  return num(v, col.precision || 0);
}

async function showLeaderboard(view, c) {
  const lb = await leaderboard(c.slug);
  const cols = (lb.columns || []).filter((col) => !col.hidden);
  const entries = lb.entries || [];
  const tie = lb.tie_break || {};
  let page = 0;
  const pages = Math.max(1, Math.ceil(entries.length / PER_PAGE));
  const head = '<p><a href="#/bounty/' + encodeURIComponent(c.slug) + '">&larr; ' + esc(c.title || c.slug) + '</a></p>'
    + '<h1>Results</h1>'
    + '<p class="sub">' + esc(lb.phase && lb.phase.title ? lb.phase.title : 'Leaderboard') + ' &middot; ranked by <b>' + esc(lb.rank_key || 'score') + '</b>'
    + (tie.key ? ' &middot; tiebreak: ' + esc(tie.title || tie.key) + ' (' + esc(tie.better || 'higher') + ')' : '')
    + ' &middot; ' + num(entries.length) + ' entries</p>';
  const table = () => {
    const rows = entries.slice(page * PER_PAGE, (page + 1) * PER_PAGE).map((e) => {
      const avatar = e.image ? '<img src="' + esc(imgSrc(e.image)) + '" alt="" crossorigin="anonymous" style="width:26px;height:26px;border-radius:50%;vertical-align:middle;margin-right:6px">' : '';
      return '<tr><td class="num"><b>' + num(e.rank || 0) + '</b></td>'
        + '<td>' + avatar + '<a href="#/u/' + encodeURIComponent(e.handle || '') + '">' + esc(e.handle || '—') + '</a></td>'
        + '<td>' + esc(e.title || '—') + '</td>'
        + cols.map((col) => '<td class="num">' + cell(e, col) + '</td>').join('')
        + '</tr>';
    }).join('');
    return '<div class="table-wrap"><table><thead><tr><th class="num">#</th><th>Entrant</th><th>Entry</th>'
      + cols.map((col) => '<th class="num">' + esc(col.title || col.key) + '</th>').join('')
      + '</tr></thead><tbody>' + (rows || '<tr><td colspan="' + (3 + cols.length) + '">No entries yet.</td></tr>') + '</tbody></table></div>'
      + '<div class="pager"><button class="btn" id="prev" ' + (page === 0 ? 'disabled' : '') + '>&larr; Prev</button>'
      + '<span>Page ' + (page + 1) + ' of ' + pages + '</span>'
      + '<button class="btn" id="next" ' + (page >= pages - 1 ? 'disabled' : '') + '>Next &rarr;</button></div>';
  };
  view.innerHTML = head + '<div id="lb-table">' + table() + '</div>';
  view.querySelector('#lb-table').addEventListener('click', (ev) => {
    if (ev.target.id === 'prev' && page > 0) page -= 1;
    else if (ev.target.id === 'next' && page < pages - 1) page += 1;
    else return;
    view.querySelector('#lb-table').innerHTML = table();
  });
}

export async function showProfile(view, handle) {
  const p = await profile(handle);
  const pic = imgSrc(p.image || p.avatar);
  const rec = p.record || {};
  const rows = (p.solutions || []).map((s) => {
    const comp = s.competition || {};
    let score = '—';
    if (s.score) {
      const col = s.score.column || {};
      if (isRateKey(col.key || '') || String(col.source || '').indexOf('win_rate_micro') !== -1) score = rate(s.score.value);
      else score = esc(String(s.score.display ?? s.score.value ?? '—'));
    }
    return '<tr><td><a href="#/bounty/' + encodeURIComponent(comp.slug || '') + '">' + esc(comp.title || comp.slug || '—') + '</a></td>'
      + '<td>' + esc(s.title || '—') + '</td>'
      + '<td class="num">' + score + '</td>'
      + '<td class="num">' + (s.placement === null || s.placement === undefined ? '—' : esc(String(s.placement))) + '</td>'
      + '<td class="num">' + (s.prize_usd === null || s.prize_usd === undefined ? '—' : money(s.prize_usd, 2)) + '</td>'
      + '<td>' + esc(when(s.entered_at)) + '</td></tr>';
  }).join('');
  view.innerHTML = '<p><a href="#/">&larr; All bounties</a></p>'
    + '<div class="profile-head">'
    + (pic ? '<img class="avatar" src="' + esc(pic) + '" alt="" crossorigin="anonymous">' : '')
    + '<div><h1>' + esc(p.display_name || p.handle) + '</h1>'
    + '<p class="sub">@' + esc(p.handle) + (p.github_login ? ' &middot; GitHub <a href="https://github.com/' + encodeURIComponent(p.github_login) + '">' + esc(p.github_login) + '</a>' : '')
    + (p.x && p.x.username ? ' &middot; X <a href="https://x.com/' + encodeURIComponent(p.x.username) + '">@' + esc(p.x.username) + '</a>' : '')
    + (p.wallet && p.wallet.address ? ' &middot; wallet <span class="mono">' + esc(p.wallet.address.slice(0, 8)) + '…' + esc(p.wallet.address.slice(-4)) + '</span>' : '')
    + '</p></div></div>'
    + '<p>' + esc(p.bio || 'No bio yet.') + (p.joined_at ? ' Joined ' + esc(when(p.joined_at)) + '.' : '') + '</p>'
    + '<div class="stats">'
    + '<div class="stat"><b>' + num(rec.competitions_entered || 0) + '</b><span>competitions entered</span></div>'
    + '<div class="stat"><b>' + num(rec.competitions_placed || 0) + '</b><span>placed</span></div>'
    + '<div class="stat"><b>' + num(rec.competitions_won || 0) + '</b><span>won</span></div>'
    + '<div class="stat"><b>' + money(rec.prize_usd || 0, 2) + '</b><span>prize money</span></div>'
    + '</div>'
    + '<h2>Entries</h2>'
    + '<div class="table-wrap"><table><thead><tr><th>Competition</th><th>Entry</th><th class="num">Score</th><th class="num">Place</th><th class="num">Prize</th><th>Entered</th></tr></thead><tbody>'
    + (rows || '<tr><td colspan="6">No entries yet.</td></tr>')
    + '</tbody></table></div>';
}
