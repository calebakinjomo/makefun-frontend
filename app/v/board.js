// The bounty board: every live bounty with its pot, entry fee, time left and
// entries. Bounties still taking entries first, nearest deadline first; the
// rest under "Entries closed". A bounty past its deadline reads closed even
// when the API still says its status is open.

import { board } from './api.js';
import { esc, money, num } from './fmt.js';

const open = (b) => new Date(b.deadline) > Date.now();

function row(b) {
  const fee = b.entryFeeUsd ? `<span class="fee">${money(b.entryFeeUsd)} entry fee</span>` : '<span class="fee">Free entry</span>';
  const pill = open(b) ? '<span class="pill">Open</span>' : '<span class="pill cl">Entries closed</span>';
  return `<li class="row" data-t="${esc((b.title + ' ' + b.category).toLowerCase())}">
    <div><h3><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h3>
    <div class="ct">${esc(b.category)} · ${esc(b.summary ?? '')}</div></div>
    <div class="pt">${money(b.potUsd ?? b.rewardAmount)}</div>
    <div class="meta2">${pill}${fee}<span class="tl" data-dl="${b.deadline}"></span><span class="en">${num(b.submissionCount)} entries</span></div>
  </li>`;
}

export async function show(v) {
  const d = await board();
  const live = d.items.filter(open).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const shut = d.items.filter((b) => !open(b)).sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
  const pot = live.reduce((s, b) => s + Number(b.potUsd ?? b.rewardAmount), 0);
  v.innerHTML = `<h1>Live bounties</h1>
    <p class="sub">${live.length} taking entries · ${shut.length} closed · ${money(pot)} in live pots</p>
    <input id="f" type="search" placeholder="Filter by name or category" aria-label="Filter bounties">
    <ul class="bl">${live.map(row).join('')}</ul>
    ${shut.length ? `<h2>Entries closed</h2><ul class="bl">${shut.map(row).join('')}</ul>` : ''}`;
  const f = v.querySelector('#f');
  f.addEventListener('input', () => {
    const q = f.value.trim().toLowerCase();
    v.querySelectorAll('.row').forEach((r) => { r.style.display = r.dataset.t.includes(q) ? '' : 'none'; });
  });
}
