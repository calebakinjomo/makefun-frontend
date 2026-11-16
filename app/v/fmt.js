// Small helpers for showing API values.

/** Text made safe to put inside HTML. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');

/** A dollar amount ('721.50' or 500) as '$721.50' or '$500'. */
export const money = (v) => {
  const n = Number(v);
  return '$' + (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2));
};

/** A count as '12,483'. */
export const num = (v) => Number(v ?? 0).toLocaleString('en-US');

/** A deadline as a date in UTC. */
export const date = (iso) => new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';

/** The small markdown the API's descriptions use: headings, lists, bold, code, links. */
export function md(s) {
  const html = esc(s)
    .split(/\n\s*\n/)
    .map((b) => {
      if (b.startsWith('## ')) return '<h3>' + b.slice(3) + '</h3>';
      if (b.startsWith('# ')) return '<h2>' + b.slice(2) + '</h2>';
      if (b.startsWith('- ')) return '<ul>' + b.split('\n').map((l) => '<li>' + l.replace(/^- /, '') + '</li>').join('') + '</ul>';
      return '<p>' + b.replace(/\n/g, '<br>') + '</p>';
    })
    .join('');
  return html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
}
