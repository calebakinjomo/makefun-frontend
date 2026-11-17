// b.js — boot: stylesheet, header with live request counters, theme, router.
// The first load is only index.html; this module arrives by import() after it.
import { net, onNet } from './api.js';
import { renderBoard } from './board.js';
import { renderBounty, renderLeaderboard, renderProfile } from './views.js';

const mount = document.getElementById('a');
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = './style.css';
document.head.appendChild(link);

mount.outerHTML =
  '<header><a class="brand" href="#/">make.fun</a>' +
  '<span class="tag">live bounties, live pots</span>' +
  '<span class="net" id="net" title="API requests this session · 304s are ETag revalidations, no download"></span>' +
  '<button id="theme" type="button" title="Switch light / dark theme">Dark</button></header>' +
  '<main id="m"></main>';
const main = document.getElementById('m');
const netEl = document.getElementById('net');
const themeBtn = document.getElementById('theme');

function paintNet() {
  netEl.textContent = net.req + ' req · ' + net.hit + ' × 304 · ETag on';
}
onNet(paintNet);
paintNet();

// Light and dark themes: stored choice wins, else the system setting.
const store = { get: () => { try { return localStorage.getItem('mf-theme'); } catch (e) { return null; } }, set: (v) => { try { localStorage.setItem('mf-theme', v); } catch (e) {} } };
function themeNow() {
  const saved = store.get();
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  themeBtn.textContent = t === 'dark' ? 'Light' : 'Dark';
}
applyTheme(themeNow());
themeBtn.addEventListener('click', () => {
  const next = themeNow() === 'dark' ? 'light' : 'dark';
  store.set(next);
  applyTheme(next);
});

const ctx = {
  shotReady(v) { window.__shotReady = v; },
  token: 0, // route token: a view that awaited a fetch checks it before writing
};
window.__shotReady = false;

let cleanup = null;
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const h = location.hash.replace(/^#/, '') || '/';
  const parts = h.split('/').filter(Boolean);
  window.__shotReady = false;
  ctx.token++;
  main.scrollTop = 0;
  if (parts.length === 0) {
    cleanup = renderBoard(main, ctx) || null;
  } else if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') {
    renderLeaderboard(main, decodeURIComponent(parts[1]), ctx).then((c) => { cleanup = c || null; });
  } else if (parts[0] === 'bounty' && parts[1]) {
    renderBounty(main, decodeURIComponent(parts[1]), ctx).then((c) => { cleanup = c || null; });
  } else if (parts[0] === 'u' && parts[1]) {
    renderProfile(main, decodeURIComponent(parts[1]), ctx);
  } else {
    cleanup = renderBoard(main, ctx) || null;
  }
}
window.addEventListener('hashchange', route);
route();
