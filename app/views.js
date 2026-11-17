// views.js — the bounty page, its leaderboard (virtual, thousands of rows)
// and an account's public profile. Each view makes exactly one API request.
import { apiGet } from './api.js';
import { fmtUsd, fmtNum, fmtLeft, fmtDate, takesEntries, esc } from './fmt.js';
import { virtualList } from './vlist.js';

function errBox(main, e) {
  main.innerHTML = '<p class="err">Could not load this page: ' + esc(e.message) + '</p>';
}

function mdText(s) {
  // Descriptions and rules are markdown; show them as plain text, one
  // paragraph per blank line, with no markup interpreted.
  return esc(s || '').split(/\n\s*\n/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
}

export async function renderBounty(main, slug, ctx) {
  const mine = ctx.token;
  ctx.shotReady(false);
  main.innerHTML = '<p class="muted">Loading bounty…</p>';
  let d;
  try {
    d = await apiGet('/competitions/' + slug);
  } catch (e) { if (mine === ctx.token) { errBox(main, e); ctx.shotReady(true); } return; }
  if (mine !== ctx.token) return; // the user navigated on while we fetched
  const rewards = d.rewardsNow || [];
  const open = takesEntries(d);
  main.innerHTML =
    '<p class="crumbs"><a href="#/">Board</a> / ' + esc(d.category || 'Bounty') + '</p>' +
    '<h1>' + esc(d.title) + '</h1>' +
    '<p class="row-meta"><b>' + fmtUsd(d.potUsd) + ' live pot</b>' +
    (d.entryFeeUsd ? ' · entry fee ' + fmtUsd(d.entryFeeUsd) : ' · free entry') +
    ' · <span class="left">' + fmtLeft(d.deadline) + '</span>' +
    ' · ' + fmtNum(d.submissionCount) + ' entries · ' +
    '<span class="status ' + (open ? 'open' : 'closed') + '">' + (open ? 'taking entries' : 'closed') + '</span></p>' +
    '<h2>Dates</h2><p>Opens ' + fmtDate(d.publishedAt || d.opensAt) + ' · closes ' + fmtDate(d.deadline) + ' · status ' + esc(d.status) + '</p>' +
    '<div class="summary">' + mdText(d.summary) + '</div>' +
    (rewards.length
      ? '<h2>Rewards</h2><table class="rewards"><thead><tr><th>Place</th><th>Prize</th></tr></thead><tbody>' +
        rewards.map((r) => '<tr><td>#' + r.place + '</td><td>' + fmtUsd(r.amountUsd) + (r.feeShareUsd && parseFloat(r.feeShareUsd) > 0 ? ' <span class="muted">(incl. ' + fmtUsd(r.feeShareUsd) + ' fees)</span>' : '') + '</td></tr>').join('') +
        '</tbody></table>'
      : '') +
    '<details><summary>Full description</summary><div class="desc">' + mdText(d.description) + '</div></details>' +
    (d.rules ? '<details><summary>Rules</summary><div class="rules">' + mdText(d.rules) + '</div></details>' : '') +
    '<p><a href="#/bounty/' + esc(slug) + '/leaderboard">Leaderboard →</a></p>';
  const left = main.querySelector('.left');
  const tick = setInterval(() => { if (left.isConnected) left.textContent = fmtLeft(d.deadline); }, 1000);
  ctx.shotReady(true);
  return () => clearInterval(tick);
}

export async function renderLeaderboard(main, slug, ctx) {
  const mine = ctx.token;
  ctx.shotReady(false);
  main.innerHTML = '<p class="muted">Loading leaderboard…</p>';
  let lb;
  try {
    lb = await apiGet('/competitions/' + slug + '/leaderboard');
  } catch (e) { if (mine === ctx.token) { errBox(main, e); ctx.shotReady(true); } return; }
  if (mine !== ctx.token) return;
  const entries = lb.entries || [];
  const key = lb.rank_key || 'score';
  const comp = lb.competition || {};
  const phase = typeof lb.phase === 'string' ? lb.phase : '';
  const head = document.createElement('div');
  head.innerHTML =
    '<p class="crumbs"><a href="#/">Board</a> / <a href="#/bounty/' + esc(slug) + '">' + esc(comp.title || slug) + '</a> / Leaderboard</p>' +
    '<h1>' + esc(comp.title || slug) + ' — leaderboard</h1>' +
    '<p class="row-meta"><b>' + fmtNum(entries.length) + ' entries</b> · ranked by ' + esc(key) +
    (phase ? ' · ' + esc(phase) : '') + '</p>' +
    '<p class="muted count-line"></p>';
  const box = document.createElement('div');
  box.className = 'lb-box';
  main.replaceChildren(head, box);
  const countLine = head.querySelector('.count-line');

  function rowNode(i) {
    const e = entries[i];
    const row = document.createElement('div');
    row.className = 'lb-row';
    const vals = e.values || {};
    const disp = e.display || {};
    const score = disp[key] != null ? disp[key] : vals[key];
    // Every other metric labelled with its key; 'working' (1/0) says nothing.
    const rest = Object.keys(vals).filter((k) => k !== key && k !== 'working')
      .map((k) => k.replace(/_/g, ' ') + ' ' + fmtNum(vals[k])).join(' · ');
    row.innerHTML =
      '<span class="lb-rank">#' + (e.rank ?? i + 1) + '</span>' +
      '<a class="lb-handle" href="#/u/' + esc(e.handle) + '">' + esc(e.handle) + '</a>' +
      '<span class="lb-title">' + esc(e.title || '') + '</span>' +
      '<span class="lb-score"><b>' + esc(String(score ?? '')) + '</b>' + (rest ? ' <span class="muted">' + esc(rest) + '</span>' : '') + '</span>';
    return row;
  }

  const vl = virtualList(box, { rowH: 44, count: entries.length, render: rowNode });
  const showCount = () => {
    const vis = box.querySelectorAll('.lb-row').length;
    countLine.textContent = 'Showing ' + vis + ' rows on screen of ' + fmtNum(entries.length) + ' — scroll, the list is virtual.';
  };
  box.addEventListener('scroll', showCount, { passive: true });
  showCount();
  ctx.shotReady(true);
  return () => vl.destroy();
}

export async function renderProfile(main, handle, ctx) {
  const mine = ctx.token;
  ctx.shotReady(false);
  main.innerHTML = '<p class="muted">Loading profile…</p>';
  let p;
  try {
    p = await apiGet('/profiles/' + encodeURIComponent(handle));
  } catch (e) { if (mine === ctx.token) { errBox(main, e); ctx.shotReady(true); } return; }
  if (mine !== ctx.token) return;
  const rec = p.record || {};
  const sols = p.solutions || [];
  main.innerHTML =
    '<p class="crumbs"><a href="#/">Board</a> / Profile</p>' +
    '<div class="profile">' +
    (p.image ? '<img class="avatar" crossorigin="anonymous" src="' + esc(p.image) + '" alt="">' : '') +
    '<div><h1>' + esc(p.display_name || p.handle) + '</h1>' +
    '<p class="muted">@' + esc(p.handle) + (p.github_login ? ' · GitHub ' + esc(p.github_login) : '') +
    (p.x ? ' · X <a href="' + esc(p.x.url) + '">@' + esc(p.x.username) + '</a>' : '') +
    ' · joined ' + fmtDate(p.joined_at) + '</p>' +
    (p.bio ? '<p>' + esc(p.bio) + '</p>' : '') + '</div></div>' +
    '<p class="row-meta"><b>' + fmtNum(rec.competitions_entered) + ' entered</b> · ' +
    fmtNum(rec.competitions_placed) + ' placed · ' + fmtNum(rec.competitions_won) + ' won · ' +
    fmtNum(rec.podium_finishes) + ' podiums · <b>' + fmtUsd(rec.prize_usd) + ' won</b></p>' +
    '<h2>Entries</h2>' +
    (sols.length
      ? '<ul class="sols">' + sols.map((s) =>
        '<li><a href="#/bounty/' + esc(s.competition.slug) + '">' + esc(s.title) + '</a>' +
        ' <span class="muted">— ' + esc(s.competition.title) + ' · ' + esc(s.competition.status) + '</span></li>').join('') + '</ul>'
      : '<p class="muted">No entries yet.</p>');
  ctx.shotReady(true);
}
