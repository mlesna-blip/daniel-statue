// v11: statue switcher. A small clay statue icon in the tools row opens a dropdown of statue designs.
// Slot 1 = the new statue (default), slot 2 = the original statue (unlocked by finishing the quiz), slot 3 = the v11d statue, slot 4 = the v11f statue, slot 5 = the v11o ziggurat statue, slot 6 = placeholder.
// Swapping fades to black, stores the choice and the current view, reloads, and fades back in on the same view.
import { STATUES, isUnlocked } from './statueGLB.js?v=20261028v15';
const $ = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
const ICON = '<svg viewBox="0 0 24 24" class="qi"><circle cx="12" cy="4.2" r="2.1"/><path d="M9.2 7.6h5.6l.6 5.2h-6.8z"/><path d="M9.6 12.8h4.8l-.3 5.4h-4.2z"/><path d="M8 20.6h8"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" class="lk"><rect x="6" y="11" width="12" height="9" rx="1.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>';
export function createV11({ statue, director, history }) {
  const T = s => (window.__tr ? window.__tr(s) : s);
  const SLOTS = [
    { id: 'v11o', name: 'The Ziggurat Image', sub: 'Default · winged ziggurat' },
    { id: 'v11f', name: 'The Lamassu Image', sub: 'Lamassu beard' },
    { id: 'v11d', name: 'The Griffin Image', sub: 'Griffin kilt' },
    { id: 'classic', name: 'The First Image', sub: 'The original statue' },
    { id: 'new', name: 'The Great Image', sub: 'Babylonian royal figure' },
    { id: null, name: 'More statues coming', sub: 'New designs will appear here' },
  ];
  const tools = document.getElementById('tools');
  const btn = $(`<button id="statue-btn" class="clay-btn" title="Choose a statue" aria-label="Choose a statue">${ICON}</button>`);
  const menu = $(`<div id="statue-menu" class="clayf" role="menu"><div class="sm-h">Statue</div>${SLOTS.map((s, i) => `<button class="sm-it" data-i="${i}" role="menuitem"><i class="sm-n">${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}</i><span><b>${s.name}</b><em class="sm-sub">${s.sub}</em>${s.lock ? `<em class="sm-lock">${s.lock}</em>` : ''}</span><i class="sm-st"></i></button>`).join('')}</div>`);
  (tools || document.body).prepend(btn); document.body.appendChild(menu);
  function render() {
    menu.querySelectorAll('.sm-it').forEach(el => {
      const s = SLOTS[+el.dataset.i], open = s.id && isUnlocked(s.id), cur = s.id === statue.id;
      el.classList.toggle('cur', cur); el.classList.toggle('locked', !open); el.disabled = !open;
      el.querySelector('.sm-st').innerHTML = cur ? '✦' : open ? '' : LOCK;
      const lk = el.querySelector('.sm-lock'); if (lk) lk.style.display = open ? 'none' : '';
      const sub = el.querySelector('.sm-sub'); if (sub && s.lock) sub.style.display = open ? '' : 'none';
    });
  }
  render();
  const place = () => { const r = btn.getBoundingClientRect(); menu.style.right = Math.max(8, innerWidth - r.right) + 'px'; menu.style.bottom = (innerHeight - r.top + 10) + 'px'; };
  btn.onclick = e => { e.stopPropagation(); render(); place(); menu.classList.toggle('on'); };
  addEventListener('resize', () => menu.classList.contains('on') && place());
  document.addEventListener('pointerdown', e => { if (!e.target.closest('#statue-menu, #statue-btn')) menu.classList.remove('on'); });
  addEventListener('keydown', e => { if (e.key === 'Escape') menu.classList.remove('on'); });
  const fade = document.getElementById('swapfade') || document.body.appendChild($('<div id="swapfade"></div>'));
  menu.addEventListener('click', e => {
    const el = e.target.closest('.sm-it'); if (!el || el.disabled) return; const id = SLOTS[+el.dataset.i].id;
    if (id === statue.id) { menu.classList.remove('on'); return; }
    try { localStorage.setItem('dan2-statue', id); sessionStorage.setItem('dan2-resume', JSON.stringify({ state: history.active ? 'history' : director.state === 'exploded' ? 'exploded' : 'assembled' })); } catch (er) { }
    menu.classList.remove('on'); fade.classList.add('on');
    if (window.__loadMini) setTimeout(() => window.__loadMini(SLOTS[+el.dataset.i].name), 380);  // v11o: small tablet loader over the fade
    setTimeout(() => { const u = new URL(location.href); u.searchParams.delete('statue'); location.replace(u.href); }, 750);
  });
  addEventListener('dan2-unlock', ev => {
    render(); btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse');
    const t = $(`<div class="sm-toast clayf">${T('New statue unlocked')} · <b>${T('The First Image')}</b></div>`); document.body.appendChild(t); setTimeout(() => t.classList.add('on'), 30); setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 800); }, 4200);
  });
  return { render, slots: SLOTS };
}
// call after the scene is ready: restores the view kept across a swap and fades back in
export function resumeAfterSwap({ director, history }) {
  let r = null; try { r = JSON.parse(sessionStorage.getItem('dan2-resume') || 'null'); sessionStorage.removeItem('dan2-resume'); } catch (e) { }
  const fade = document.getElementById('swapfade') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'swapfade' }));
  if (!r) return;
  fade.classList.add('on', 'instant'); void fade.offsetWidth; fade.classList.remove('instant');
  if (r.state === 'exploded') director.explode(true); else if (r.state === 'history') history.enter(true);
  setTimeout(() => fade.classList.remove('on'), 350);
}
