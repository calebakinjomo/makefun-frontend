// An account's public profile: avatar, bio, record, and every entry it has
// made, each linked back to its bounty.

import { profile } from './api.js';
import { date, esc, money, num } from './fmt.js';

export async function show(v, handle) {
  const p = await profile(handle);
  const r = p.record ?? {};
  const src = p.image ? (p.image.startsWith('/') ? 'https://make.fun' + p.image : p.image) : '';
  const img = src ? `<img class="av2" crossorigin="anonymous" src="${esc(src)}" alt="">` : '';
  const name = p.display_name ?? p.handle;
  const links = [
    p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub</a>` : '',
    p.x ? `<a href="https://x.com/${encodeURIComponent(p.x.username)}">X</a>` : '',
    p.wallet ? `<a href="${esc(p.wallet.explorer_url)}">Wallet</a>` : '',
    `<a href="https://make.fun/u/${encodeURIComponent(p.handle)}">On make.fun ↗</a>`,
  ].filter(Boolean).join(' · ');
  const sols = (p.solutions ?? []).map((s) => {
    const c = s.competition ?? {};
    const prize = s.prize_usd ? money(s.prize_usd) : '—';
    const place = s.placement ? '#' + num(s.placement) : '—';
    const micro = s.score?.column?.source?.includes('micro');
    const score = micro ? (Number(s.score.value) / 10000).toFixed(1) + '%' : esc(s.score?.display ?? '—');
    return `<tr><td><a href="#/bounty/${encodeURIComponent(c.slug)}">${esc(c.title ?? c.slug)}</a><br><small>${esc(s.title)}</small></td>
      <td class="n">${score}</td><td class="n">${place}</td><td class="n">${prize}</td><td>${date(s.entered_at)}</td></tr>`;
  }).join('');
  v.innerHTML = `<p><a href="#/">← All bounties</a></p>
    <div class="pr">${img}<div><h1>${esc(name)}</h1><p>@${esc(p.handle)} · joined ${date(p.joined_at)}</p><p>${links}</p></div></div>
    ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
    <div class="st">
      <div><b>${num(r.competitions_entered)}</b><span>entered</span></div>
      <div><b>${num(r.competitions_placed)}</b><span>placed</span></div>
      <div><b>${num(r.competitions_won)}</b><span>won</span></div>
      <div><b>${num(r.podium_finishes)}</b><span>podiums</span></div>
      <div><b>${r.best_placement ? '#' + num(r.best_placement) : '—'}</b><span>best place</span></div>
      <div><b>${money(r.prize_usd ?? 0)}</b><span>won in all</span></div>
    </div>
    <h2>Entries</h2>
    ${sols ? `<table><thead><tr><th>Bounty</th><th class="n">Score</th><th class="n">Place</th><th class="n">Prize</th><th>Entered</th></tr></thead><tbody>${sols}</tbody></table>` : '<p>No entries yet.</p>'}`;
}
