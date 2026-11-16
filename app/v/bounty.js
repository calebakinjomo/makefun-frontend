// One bounty's page: summary, description and rules, the rewards table with
// the live pot, its dates and status, and its latest entries. Whether it
// still takes entries is judged by its deadline, not its status alone.

import { bounty } from './api.js';
import { date, esc, md, money, num } from './fmt.js';

const open = (b) => new Date(b.deadline) > Date.now();

function rewards(b) {
  const rows = (b.rewardsNow ?? []).map(
    (r) => `<tr><td class="n">${r.place}</td><td class="n">${money(r.baseUsd)}</td><td class="n">${money(r.feeShareUsd)}</td><td class="n">${money(r.amountUsd)}</td></tr>`,
  ).join('');
  return `<h2>Rewards · live pot ${money(b.potUsd ?? b.rewardAmount)}</h2>
    <table class="rw"><thead><tr><th class="n">Place</th><th class="n">Base</th><th class="n">Fee share</th><th class="n">Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function entries(b) {
  const list = (b.submissions ?? []).slice(0, 10).map(
    (s) => `<li><a href="#/u/${encodeURIComponent(s.hunter)}">${esc(s.hunter)}</a> — ${esc(s.title)} <small>${esc(s.status)} · ${date(s.createdAt)}</small></li>`,
  ).join('');
  return list ? `<h2>Latest entries</h2><ul class="sb">${list}</ul>` : '';
}

export async function show(v, slug) {
  const b = await bounty(slug);
  const pill = open(b) ? '<span class="pill">Taking entries</span>' : '<span class="pill cl">Entries closed</span>';
  const fee = b.entryFeeUsd ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd>` : '<dt>Entry fee</dt><dd>Free</dd>';
  v.innerHTML = `<p><a href="#/">← All bounties</a> · <a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a> · <a href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">On make.fun ↗</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="sum">${esc(b.summary)}</p>
    <dl class="meta">
      <dt>Pot</dt><dd>${money(b.potUsd ?? b.rewardAmount)}</dd>
      ${fee}
      <dt>Deadline</dt><dd>${date(b.deadline)} (<span data-dl="${b.deadline}"></span>)</dd>
      <dt>Published</dt><dd>${date(b.publishedAt)}</dd>
      <dt>Status</dt><dd>${pill}</dd>
      <dt>Entries</dt><dd>${num(b.submissionCount)}</dd>
      <dt>Category</dt><dd>${esc(b.category)}${b.skills?.length ? ' · ' + b.skills.map(esc).join(', ') : ''}</dd>
    </dl>
    ${rewards(b)}
    <h2>Description</h2><div class="desc">${md(b.description ?? '')}</div>
    ${b.rules ? `<details><summary>Rules</summary><div class="desc">${md(b.rules)}</div></details>` : ''}
    ${entries(b)}`;
}
