// A bounty's leaderboard, read straight from the API: whatever columns the
// competition ranks on (Elo, signups, judge rate — the API names them), the
// rank key and the tiebreak. Fifty rows a page; paging never refetches.

import { leader } from './api.js';
import { esc, num } from './fmt.js';

const PAGE = 50;

export async function show(v, slug) {
  const d = await leader(slug);
  const cols = (d.columns ?? []).filter((c) => !c.hidden);
  const entries = d.entries ?? [];
  let page = 0;
  const pages = Math.max(1, Math.ceil(entries.length / PAGE));
  const tie = d.tie_break ? ` · tiebreak: ${esc(d.tie_break.title)} (${esc(d.tie_break.better)})` : '';

  const head = `<tr><th class="n">#</th><th>Entrant</th>${cols.map((c) => `<th class="n">${esc(c.title)}</th>`).join('')}</tr>`;
  // A score stored in micro units (a win rate of 944244 is 94.4%) shows as a
  // percentage; anything else shows as a plain count.
  const val = (c, v) => (c.source && c.source.includes('micro') ? (Number(v) / 10000).toFixed(1) + '%' : num(v));
  const draw = () => {
    const slice = entries.slice(page * PAGE, (page + 1) * PAGE);
    const rows = slice.map((e) => {
      const vals = e.values ?? {};
      const src = e.image ? (e.image.startsWith('/') ? 'https://make.fun' + e.image : e.image) : '';
      const img = src ? `<img class="av" crossorigin="anonymous" src="${esc(src)}" alt="" loading="lazy">` : '';
      return `<tr><td class="n">${num(e.rank)}</td><td>${img}<a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a></td>${cols
        .map((c) => `<td class="n">${val(c, vals[c.key])}</td>`)
        .join('')}</tr>`;
    }).join('');
    v.querySelector('tbody').innerHTML = rows;
    v.querySelector('.pg span').textContent = `Page ${page + 1} of ${pages} · ${num(entries.length)} entries`;
    v.querySelector('.pg .prev').disabled = page === 0;
    v.querySelector('.pg .next').disabled = page >= pages - 1;
  };

  v.innerHTML = `<p><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(d.competition?.title ?? slug)}</a></p>
    <h1>${esc(d.title ?? 'Leaderboard')}</h1>
    <p class="sub">${esc(d.phase?.title ?? '')} · ranked by ${esc(d.rank_key ?? '')}${tie}</p>
    <table class="lb"><thead>${head}</thead><tbody></tbody></table>
    <div class="pg"><button class="prev">← Prev</button><span></span><button class="next">Next →</button></div>`;
  v.querySelector('.pg .prev').addEventListener('click', () => { if (page > 0) { page--; draw(); } });
  v.querySelector('.pg .next').addEventListener('click', () => { if (page < pages - 1) { page++; draw(); } });
  draw();
}
