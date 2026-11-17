// vlist.js — a virtual list: only the rows on screen exist in the DOM, so a
// leaderboard of 8,000 entries scrolls like one of 20. Rows are a fixed height;
// a spacer gives the scroll bar its true size and the window is re-rendered
// on scroll (throttled by animation frame).
export function virtualList(el, opts) {
  const rowH = opts.rowH || 44;
  const over = opts.overscan || 6;
  let count = opts.count || 0;
  let render = opts.render;
  let raf = 0;

  el.classList.add('vlist');
  el.innerHTML = '';
  const spacer = document.createElement('div');
  spacer.className = 'vlist-spacer';
  el.appendChild(spacer);
  const win = document.createElement('div');
  win.className = 'vlist-win';
  el.appendChild(win);
  paint(); // render the first window at once, not only on scroll

  function paint() {
    raf = 0;
    const top = el.scrollTop;
    const h = el.clientHeight || 400;
    const first = Math.max(0, Math.floor(top / rowH) - over);
    const last = Math.min(count - 1, Math.ceil((top + h) / rowH) + over);
    spacer.style.height = count * rowH + 'px';
    win.style.transform = 'translateY(' + first * rowH + 'px)';
    const frag = document.createDocumentFragment();
    for (let i = first; i <= last; i++) {
      const row = render(i);
      row.style.height = rowH + 'px';
      frag.appendChild(row);
    }
    win.replaceChildren(frag);
  }

  function onScroll() {
    if (!raf) raf = requestAnimationFrame(paint);
  }
  el.addEventListener('scroll', onScroll, { passive: true });
  // A resize (window, phone rotation) changes how many rows fit: repaint.
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => paint()) : null;
  if (ro) ro.observe(el);

  return {
    setCount(n) { count = n; paint(); },
    setRender(fn) { render = fn; paint(); },
    refresh() { paint(); },
    destroy() { el.removeEventListener('scroll', onScroll); if (ro) ro.disconnect(); },
  };
}
