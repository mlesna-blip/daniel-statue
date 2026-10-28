import * as THREE from 'three';
// v8: light, minimal callouts after Victor's mockup. Line icon above a large serif name and a small italic date;
// an italic description sits on the opposite side. One connector per section: an angled run from the section's
// silhouette edge, then straight across to the name (at most one bend). Anchors are re-projected every frame.
export const CALLOUT = {
  head:  { name: 'Babylon', metal: 'Head of gold', date: '605 – 539 BC', why: '“Thou art this head of gold.” The one kingdom Daniel names outright, the richest metal for the first and most splendid.', ref: 'Dan 2:32, 37–38' },
  chest: { name: 'Medo-Persia', metal: 'Breast & arms of silver', date: '539 – 331 BC', why: '“Another kingdom inferior to thee.” Two arms, two peoples: the Medes and the Persians.', ref: 'Dan 2:32, 39 · 8:20' },
  belly: { name: 'Greece', metal: 'Belly & thighs of brass', date: '331 – 168 BC', why: 'A kingdom of brass “which shall bear rule over all the earth”: Alexander’s swift reach.', ref: 'Dan 2:32, 39 · 8:21' },
  legs:  { name: 'Rome', metal: 'Legs of iron', date: '168 BC – AD 476', why: 'Strong as iron, it “breaketh in pieces and subdueth all things.”', ref: 'Dan 2:33, 40' },
  feet:  { name: 'Divided Kingdoms', metal: 'Feet of iron & clay', date: 'AD 476 – ', why: 'Partly strong, partly broken; they “shall not cleave one to another.”', ref: 'Dan 2:33, 41–43' },
};
export const SEC_BEASTS = { head: ['lion'], chest: ['bear', 'ram'], belly: ['leopard', 'goat'], legs: ['fourth'], feet: [] };
export const SEC_BEAST = { head: 'lion', chest: 'bear', belly: 'leopard', legs: 'fourth' };
// the date each kingdom gave way to the next (shown between sections in the exploded view)
const SUCC = [['head', 'chest', '539 BC'], ['chest', 'belly', '331 BC'], ['belly', 'legs', '168 BC'], ['legs', 'feet', 'AD 476']];
const NS = 'http://www.w3.org/2000/svg';
export function createCallouts(onBeast) {
  const root = document.createElement('div'); root.id = 'callouts'; document.body.appendChild(root);
  const svg = document.createElementNS(NS, 'svg'); root.appendChild(svg);
  svg.innerHTML = `<defs><filter id="coGlow" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  const items = {};
  for (const id in CALLOUT) {
    const c = CALLOUT[id], g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'co-g co-g-' + id); g.setAttribute('filter', 'url(#coGlow)');
    const line = document.createElementNS(NS, 'polyline'); line.setAttribute('class', 'co-line');
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('class', 'co-dot'); dot.setAttribute('r', 2.2);
    const ring = document.createElementNS(NS, 'circle'); ring.setAttribute('class', 'co-ring'); ring.setAttribute('r', 4.5);
    g.append(line, dot, ring); svg.appendChild(g);
    const b = SEC_BEAST[id];
    const el = document.createElement('div'); el.className = 'co-lbl co-' + id;
    el.innerHTML = `${b ? `<button class="co-icon" data-b="${b}" title="Open the Daniel 7 beast"><img src="data/beasts/line/${b}.png" alt=""></button>` : '<div class="co-icon none"></div>'}<button class="co-name" ${b ? `data-b="${b}"` : ''}></button><div class="co-date"></div>`;
    el.querySelector('.co-name').textContent = c.name; el.querySelector('.co-date').textContent = `${c.metal} · ${c.date}`;
    el.addEventListener('click', e => { const t = e.target.closest('[data-b]'); if (t && onBeast) onBeast(t.dataset.b, id); });
    const de = document.createElement('div'); de.className = 'co-desc co-d-' + id; de.innerHTML = '<p></p><span></span>';
    de.querySelector('p').textContent = c.why; de.querySelector('span').textContent = c.ref;
    root.append(el, de); items[id] = { g, line, dot, ring, el, de, a: 0 };
  }
  const succ = SUCC.map(([a, b, d]) => { const el = document.createElement('div'); el.className = 'co-succ'; el.innerHTML = `<i></i><span>${d}</span>`; root.appendChild(el); return { a, b, el, o: 0 }; });
  const box = new THREE.Box3(), V = new THREE.Vector3(), P = new THREE.Vector3();
  function screenBox(sec, camera, w, h) {
    box.setFromObject(sec); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, behind = false;
    for (let k = 0; k < 8; k++) { V.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).project(camera); if (V.z > 1) behind = true;
      const x = (V.x * .5 + .5) * w, y = (-V.y * .5 + .5) * h; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { x0, x1, y0, y1, cy: (y0 + y1) / 2, cx: (x0 + x1) / 2, behind };
  }
  /** show: { id: { sec, alpha?, desc? } }; succession marks: opts.succ = { id: sec } */
  function update(camera, show, dt, opts = {}) {
    const w = innerWidth, h = innerHeight; svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const boxes = {}; let col = -1e9, dcol = 1e9;
    for (const id in show) { const b = screenBox(show[id].sec, camera, w, h); boxes[id] = b; col = Math.max(col, b.x1 * .82 + b.cx * .18 + 70); dcol = Math.min(dcol, b.x0 * .85 + b.cx * .15 - 50); }
    col = Math.min(col, w - 300); dcol = Math.max(dcol, 280);
    const placed = [];
    const order = Object.keys(items).filter(id => boxes[id]).sort((a, b) => boxes[a].cy - boxes[b].cy);
    const lys = {}; for (const id of order) { const B = boxes[id]; let ly = Math.max(150, Math.min(h - 150, B.cy)); for (const o of placed) if (Math.abs(o - ly) < 118) ly = o + 118; placed.push(ly); lys[id] = ly; }
    for (const id in items) {
      const it = items[id], s = show[id], B = boxes[id]; const goal = s && !B.behind ? (s.alpha ?? 1) : 0; it.a += (goal - it.a) * Math.min(1, dt * 5);
      const vis = it.a > .01; it.g.style.opacity = vis ? it.a : 0; it.el.style.opacity = vis ? it.a : 0; it.de.style.opacity = vis && s && s.desc ? it.a * .92 : 0;
      it.el.style.pointerEvents = it.a > .5 ? 'auto' : 'none';
      if (!s || !B) continue;
      // anchor: on the section's right silhouette at its own height
      const ax = B.x1 * .82 + B.cx * .18, ay = B.cy, ly = lys[id], lx = col - 10;
      const run = Math.min(Math.abs(ly - ay) * .9, lx - ax - 20);
      const bx = ax + Math.max(14, run);
      it.line.setAttribute('points', Math.abs(ly - ay) < 2 ? `${ax},${ay} ${lx},${ly}` : `${ax},${ay} ${bx},${ly} ${lx},${ly}`);
      it.dot.setAttribute('cx', ax); it.dot.setAttribute('cy', ay); it.ring.setAttribute('cx', lx); it.ring.setAttribute('cy', ly);
      it.el.style.transform = `translate(${col + 6}px, ${ly}px) translateY(-62%)`;
      it.de.style.transform = `translate(${dcol}px, ${ly}px) translate(-100%, -50%)`;
    }
    // succession marks centred in the gap between sections
    for (const m of succ) {
      const A = opts.succ && opts.succ[m.a], Bs = opts.succ && opts.succ[m.b]; const goal = A && Bs ? .85 : 0; m.o += (goal - m.o) * Math.min(1, dt * 4); m.el.style.opacity = m.o;
      if (!A || !Bs) continue;
      A.getWorldPosition(P); const top = P.y - A.userData.size.y * .5 * A.parent.scale.y; Bs.getWorldPosition(V); const bot = V.y + Bs.userData.size.y * .5 * Bs.parent.scale.y;
      P.lerp(V, .5); P.y = (top + bot) / 2; P.project(camera); m.el.style.transform = `translate(${(P.x * .5 + .5) * w}px, ${(-P.y * .5 + .5) * h}px) translate(-50%, -50%)`;
    }
  }
  return { update, root, items };
}
