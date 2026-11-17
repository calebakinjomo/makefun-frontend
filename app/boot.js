// Boot: hash router for the make.fun frontend. First load is only this file
// plus index.html and style.css; the views load later through a literal
// import(), so they never count against the first load.
const view = document.getElementById('view');
const form = document.getElementById('lookup');
const handleBox = document.getElementById('handle');
window.__shotReady = false;

let viewsPromise = null;
function views() {
  if (!viewsPromise) viewsPromise = import('./views.js');
  return viewsPromise;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Short "time left" label, refreshed in place by the timer below.
function leftLabel(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!isFinite(ms) || ms <= 0) return 'closed';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  if (d > 0) return d + 'd ' + Math.floor(s % 86400 / 3600) + 'h';
  const h = Math.floor(s / 3600);
  if (h > 0) return h + 'h ' + Math.floor(s % 3600 / 60) + 'm';
  const m = Math.floor(s / 60);
  return m > 0 ? m + 'm' : s + 's';
}

function refreshTimes() {
  for (const el of document.querySelectorAll('[data-dl]')) {
    el.textContent = leftLabel(el.getAttribute('data-dl'));
  }
}
setInterval(refreshTimes, 30000);

function parseRoute() {
  const raw = (location.hash || '#/').replace(/^#/, '') || '/';
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'bounty' && parts[1]) {
    return { kind: 'bounty', slug: decodeURIComponent(parts[1]), tab: parts[2] || '' };
  }
  if (parts[0] === 'u' && parts[1]) {
    return { kind: 'profile', handle: decodeURIComponent(parts[1]) };
  }
  return { kind: 'board' };
}

async function render() {
  window.__shotReady = false;
  const r = parseRoute();
  document.title = r.kind === 'board'
    ? 'make.fun — live bounties, leaderboards and makers'
    : r.kind === 'bounty'
      ? 'make.fun — ' + r.slug
      : 'make.fun — @' + r.handle;
  view.innerHTML = '<p class="loading">Loading live data…</p>';
  try {
    const v = await views();
    if (r.kind === 'board') await v.showBoard(view);
    else if (r.kind === 'bounty') await v.showBounty(view, r.slug, r.tab === 'leaderboard');
    else await v.showProfile(view, r.handle);
    refreshTimes();
    window.__shotReady = true;
  } catch (err) {
    view.innerHTML = '<p class="error">Could not load this page: ' + esc(err && err.message ? err.message : String(err)) + '</p>';
  }
}

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const h = handleBox.value.trim().replace(/^@/, '');
  if (h) location.hash = '#/u/' + encodeURIComponent(h);
});

window.addEventListener('hashchange', render);
render();
