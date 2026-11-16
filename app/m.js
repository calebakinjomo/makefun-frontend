// Four hash routes, each view loaded on demand. window.__shotReady is false
// while a view loads and true once it is on screen.

// Time until a deadline.
const tl = (iso) => {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return 'ended';
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  return d ? `${d}d ${h}h left` : h ? `${h}h ${m}m left` : `${m}m left`;
};

// Refresh every time-left label in place, without rebuilding the page.
const tick = () => document.querySelectorAll('[data-dl]').forEach((e) => { e.textContent = tl(e.dataset.dl); });
setInterval(tick, 30000);

const v = document.getElementById('v');

async function go() {
  window.__shotReady = false;
  v.innerHTML = '<p class="ld">Loading…</p>';
  const h = location.hash || '#/';
  let m;
  try {
    if ((m = h.match(/^#\/bounty\/([^/]+)\/leaderboard$/))) {
      await (await import('./v/leader.js')).show(v, decodeURIComponent(m[1]));
    } else if ((m = h.match(/^#\/bounty\/([^/]+)$/))) {
      await (await import('./v/bounty.js')).show(v, decodeURIComponent(m[1]));
    } else if ((m = h.match(/^#\/u\/([^/]+)$/))) {
      await (await import('./v/profile.js')).show(v, decodeURIComponent(m[1]));
    } else {
      await (await import('./v/board.js')).show(v);
    }
  } catch (e) {
    v.innerHTML = `<p class="er">Could not load this view. <a href="${h}">Retry</a></p>`;
  }
  tick();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

document.getElementById('pf').addEventListener('submit', (e) => {
  e.preventDefault();
  const handle = new FormData(e.target).get('h').trim();
  if (handle) location.hash = `#/u/${encodeURIComponent(handle)}`;
});

addEventListener('hashchange', go);
go();
