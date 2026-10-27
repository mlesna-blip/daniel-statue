// v11o: loading screen. Full: a dark Babylonian screen (glazed-brick wall, frieze bands) with a clay tablet whose
// incised wedges bake to a fired colour as the statue loads; it fades away and the statue fades in.
// Mini: after a statue swap (or while one is starting) only a small tablet sits over the black swap fade.
const WEDGES = (() => { let s = ''; for (let r = 0; r < 3; r++) for (let i = 0; i < 15; i++) { const x = 9 + i * 12.4 + (r % 2) * 5, y = 13 + r * 15, k = (i * 7 + r * 3) % 4;
  s += k === 0 ? `<path d="M${x} ${y}l6 -3v6z"/>` : k === 1 ? `<path d="M${x} ${y - 3}h6l-3 7z"/>` : k === 2 ? `<path d="M${x} ${y}l6 -3v6z"/><path d="M${x + 6} ${y - 1}h3v2h-3z"/>` : `<path d="M${x + 1} ${y - 4}l4 2l-4 2z"/><path d="M${x + 4} ${y}h4v1.5h-4z"/>`; } return s; })();
const TABLET = `<svg class="lt-svg" viewBox="0 0 200 58" preserveAspectRatio="none"><defs><clipPath id="ltc"><rect class="lt-clip" x="0" y="0" width="0" height="58"/></clipPath></defs>
<rect x="1" y="1" width="198" height="56" rx="9" class="lt-body"/><g class="lt-w">${WEDGES}</g><g clip-path="url(#ltc)"><rect x="1" y="1" width="198" height="56" rx="9" class="lt-fired"/><g class="lt-wf">${WEDGES}</g></g>
<rect x="1" y="1" width="198" height="56" rx="9" class="lt-edge"/></svg>`;
export function createLoader() {
  const T = s => (window.__tr ? window.__tr(s) : s);
  let mini = false; try { mini = !!sessionStorage.getItem('dan2-resume'); } catch (e) { }
  const el = document.createElement('div'); el.id = 'loadscr'; if (mini) el.className = 'mini';
  el.innerHTML = `<div class="ls-wall"></div><div class="ls-band ls-top"></div><div class="ls-band ls-bot"></div>
  <div class="ls-in"><div class="ls-orn">✦</div><div class="ls-t">${T('Raising the image')}</div><div class="ls-tab">${TABLET}</div><div class="ls-p">0%</div><div class="ls-s">${T('Daniel 2 · The Great Image')}</div></div>`;
  document.body.appendChild(el);
  const clip = el.querySelector('.lt-clip'), pct = el.querySelector('.ls-p'); let shown = 0, goal = 0, raf = 0;
  const tick = () => { shown += (goal - shown) * .18; if (Math.abs(goal - shown) < .002) shown = goal; clip.setAttribute('width', (200 * shown).toFixed(1)); pct.textContent = Math.round(shown * 100) + '%'; raf = shown < goal ? requestAnimationFrame(tick) : 0; };
  const set = f => { goal = Math.max(goal, Math.min(1, f)); if (!raf) raf = requestAnimationFrame(tick); };
  const hold = new URLSearchParams(location.search).get('holdload'); // test hook: ?holdload=0.6 freezes the screen at 60%
  if (hold) { const h = +hold; return { set: () => {}, done: () => { goal = h; shown = h * .999; tick(); return new Promise(() => {}); }, mini }; }
  function done() { set(1); return new Promise(r => setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); r(); }, 1100); }, 350)); }
  return { set, done, mini };
}
// small tablet shown over the swap fade before the page reloads with the chosen statue
window.__loadMini = name => {
  const T = s => (window.__tr ? window.__tr(s) : s);
  const el = document.createElement('div'); el.id = 'loadscr'; el.className = 'mini pre';
  el.innerHTML = `<div class="ls-in"><div class="ls-t">${T(name || 'Raising the image')}</div><div class="ls-tab">${TABLET}</div><div class="ls-p"></div></div>`;
  document.body.appendChild(el); const clip = el.querySelector('.lt-clip'); let w = 0; const go = () => { w = Math.min(60, w + 1.2); clip.setAttribute('width', w); if (el.isConnected) requestAnimationFrame(go); }; go();
};
