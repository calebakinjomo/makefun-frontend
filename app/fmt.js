// fmt.js — small formatters for money, counts and time left.
export function fmtUsd(n) {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || Number.isNaN(v)) return '—';
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return '$' + (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '$' + (Math.round(v * 100) / 100);
}

export function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtLeft(deadline) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'closed';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return d + 'd ' + h + 'h left';
  if (h > 0) return h + 'h ' + m + 'm left';
  if (m > 0) return m + 'm ' + (s % 60) + 's left';
  return s + 's left';
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function takesEntries(c) {
  if (!c) return false;
  if (c.acceptingSubmissions === true) return true;
  if (c.acceptingSubmissions === false) return false;
  if (!c.deadline) return c.status === 'open';
  return c.status === 'open' && new Date(c.deadline).getTime() > Date.now();
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}
