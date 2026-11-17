// Small formatting helpers: money, dates, numbers, and HTML escaping.
// Every string the API hands us goes through esc() before it reaches the DOM.
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function money(n, places) {
  const v = typeof n === 'string' ? parseFloat(n) : Number(n);
  if (!isFinite(v)) return '—';
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: places ?? 0, maximumFractionDigits: places ?? 0 });
}

// A judge score stored in micro units (691333) becomes a percent (69.1%).
export function rate(micro) {
  const v = Number(micro);
  if (!isFinite(v)) return '—';
  return (v / 10000).toFixed(1) + '%';
}

export function num(n, places) {
  const v = Number(n);
  if (!isFinite(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: places ?? 0, maximumFractionDigits: places ?? 0 });
}

// Compact form for big counts: 12974 -> 13.0k, 1200000 -> 1.2M.
export function compact(n) {
  const v = Number(n);
  if (!isFinite(v)) return '—';
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(v);
}

export function left(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!isFinite(ms) || ms <= 0) return 'closed';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  if (d > 0) return d + 'd ' + Math.floor((s % 86400) / 3600) + 'h left';
  const h = Math.floor(s / 3600);
  if (h > 0) return h + 'h ' + Math.floor((s % 3600) / 60) + 'm left';
  const m = Math.floor(s / 60);
  if (m > 0) return m + 'm left';
  return s + 's left';
}

export function when(iso) {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ago(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms) || ms < 0) return 'just now';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 30) return d + 'd ago';
  return when(iso);
}
