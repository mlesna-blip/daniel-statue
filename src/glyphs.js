import * as THREE from 'three';
// v6: rare cuneiform numerals drifting among the embers. Babylonian sexagesimal wedges drawn on a canvas
// (no font download): units are upright wedges, tens are corner wedges, 60s shift one place left.
const NUMS = [7, 10, 12, 42, 70, 1260, 2300];
// v8: more prophecy numbers, drawn either as wedges or as plain carved numerals
const MORE = [4, 2, 62, 69, 490, 457, 538, 1290, 1335, 1798, 1844, 3.5, 360, 120];
function plainTex(label) { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.font = '600 66px Cinzel, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(240,200,140,1)'; x.shadowColor = 'rgba(255,150,60,.9)'; x.shadowBlur = 12; x.fillText(label, 128, 66); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const FORMULAS = [[[42], '×', [30], '=', [1260]], [[70], '×', [7]], [[7], '×', [360]], [[2300]], [[1260], '=', [3.5, 'times'], '×', [360]]];
function wedgeV(x, cx, cy, s) { // upright wedge: triangular head, thin tail
  x.beginPath(); x.moveTo(cx - s * .42, cy - s * .5); x.lineTo(cx + s * .42, cy - s * .5); x.lineTo(cx + s * .06, cy - s * .22); x.lineTo(cx + s * .04, cy + s * .55); x.lineTo(cx - s * .04, cy + s * .55); x.lineTo(cx - s * .06, cy - s * .22); x.closePath(); x.fill();
}
function wedgeT(x, cx, cy, s) { // corner wedge (Winkelhaken): opening to the right
  x.beginPath(); x.moveTo(cx + s * .32, cy - s * .48); x.lineTo(cx - s * .32, cy); x.lineTo(cx + s * .32, cy + s * .48); x.lineTo(cx + s * .12, cy); x.closePath(); x.fill();
}
function wedgeH(x, cx, cy, s) { x.save(); x.translate(cx, cy); x.rotate(-Math.PI / 2); wedgeV(x, 0, 0, s); x.restore(); }
// draw one base-60 digit (0..59) starting at x0; returns width used
function digit(x, n, x0, cy, s) {
  const t = Math.floor(n / 10), u = n % 10; let cx = x0;
  for (let i = 0; i < t; i++) { const row = i % 3 === 1 ? -1 : (i % 3 === 2 ? 1 : 0); wedgeT(x, cx + s * .3, cy + row * s * .55 * (t > 1 ? 1 : 0), s * .8); if (i % 3 === 2 || i === t - 1) cx += s * .55; }
  if (t) cx += s * .2;
  const rows = u <= 3 ? [u] : u <= 6 ? [3, u - 3] : [Math.ceil(u / 3), Math.ceil((u - Math.ceil(u / 3)) / 2), u - Math.ceil(u / 3) - Math.ceil((u - Math.ceil(u / 3)) / 2)];
  const cols = Math.max(...rows, 0);
  rows.forEach((k, r) => { for (let j = 0; j < k; j++) wedgeV(x, cx + j * s * .42 + s * .2, cy + (r - (rows.length - 1) / 2) * s * .62, s * (rows.length > 1 ? .6 : .9)); });
  return cx - x0 + cols * s * .42 + s * .2;
}
function numeral(x, n, x0, cy, s) {
  if (n === 3.5) { let w = digit(x, 3, x0, cy, s); x.font = `${s * .5}px Cinzel, serif`; x.fillText('½', x0 + w, cy + s * .2); return w + s * .4; }
  const ds = []; let v = n; do { ds.unshift(v % 60); v = Math.floor(v / 60); } while (v > 0);
  let cx = x0; ds.forEach((d, i) => { if (i) cx += s * .35; cx += d === 0 ? s * .5 : digit(x, d, cx, cy, s); }); return cx - x0;
}
export function makeTex(parts, label) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
  // measure in a first pass
  const s = 46; const pass = (draw) => { let cx = 0; for (const p of parts) { if (typeof p === 'string') { if (draw) { if (p === '×') { x.save(); x.translate(draw + cx + s * .3, 62); x.rotate(Math.PI / 4); wedgeH(x, 0, 0, s * .5); x.rotate(Math.PI / 2); wedgeH(x, 0, 0, s * .5); x.restore(); } else { wedgeH(x, draw + cx + s * .3, 54, s * .45); wedgeH(x, draw + cx + s * .3, 72, s * .45); } } cx += s * .7; } else { cx += (draw ? numeral(x, p[0], draw + cx, 62, s) : numeral(fake, p[0], cx, 62, s)) + s * .15; } } return cx; };
  const fake = { beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, save() {}, restore() {}, translate() {}, rotate() {}, fillText() {}, set font(v) {} };
  const W = pass(0); const x0 = Math.max(8, (512 - W) / 2);
  const g = x.createLinearGradient(0, 20, 0, 110); g.addColorStop(0, 'rgba(255,214,150,1)'); g.addColorStop(1, 'rgba(200,110,50,1)');
  x.fillStyle = g; x.shadowColor = 'rgba(255,150,60,.9)'; x.shadowBlur = 10; pass(x0);
  x.shadowBlur = 4; x.font = '600 24px Cinzel, serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(232,194,140,.75)'; x.fillText(label, 256, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dingir() { // eight-wedge star (DINGIR), the sign for heaven / god
  const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'); x.fillStyle = 'rgba(255,200,130,1)'; x.shadowColor = 'rgba(255,150,60,.9)'; x.shadowBlur = 10;
  for (let k = 0; k < 4; k++) { x.save(); x.translate(80, 80); x.rotate(k * Math.PI / 4); wedgeV(x, 0, -30, 52); x.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function createGlyphs(scene, eager) {
  const fmtLbl = f => f.map(p => typeof p === 'string' ? p : (p[0] === 3.5 ? '3½' : p[0])).join(' ');
  const defs = [...NUMS.map(n => ({ tex: () => makeTex([[n]], String(n)), w: 1, num: n })), ...NUMS.map(n => ({ tex: () => makeTex([[n]], String(n)), w: 1, num: n })), ...FORMULAS.map(f => ({ tex: () => makeTex(f, fmtLbl(f)), w: 1.9, num: [...f].reverse().find(p => typeof p !== 'string' && p[0] !== 360 && p[0] !== 3.5 && p[0] !== 30)?.[0] })), { tex: dingir, w: .55, sq: true },
    ...NUMS.map(n => ({ tex: () => plainTex(String(n)), w: .55, num: n, plain: true })), ...MORE.map(n => ({ tex: () => n === 3.5 ? plainTex('3½') : (n < 60 || n % 1 ? makeTex([[n]], String(n)) : plainTex(String(n))), w: n === 3.5 || n >= 60 ? .55 : 1, num: null, plain: n >= 60 }))];
  const cache = new Map(); const getTex = i => cache.get(i) || (cache.set(i, defs[i].tex()), cache.get(i));
  const slots = []; const N = 8;
  for (let k = 0; k < N; k++) { const m = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }); const sp = new THREE.Sprite(m); sp.visible = false; scene.add(sp); slots.push({ sp, t0: eager ? .5 + k * 1.2 : 2 + k * 3.5 + Math.random() * 5, dur: 0, small: k >= 2 }); }
  const fwd = new THREE.Vector3(), right = new THREE.Vector3();
  let fontReady = false; document.fonts && document.fonts.ready.then(() => (fontReady = true));
  function spawn(s, camera, t) {
    const i = Math.floor(Math.random() * defs.length), d = defs[i];
    s.sp.material.map = getTex(i); s.sp.material.needsUpdate = true; s.num = d.num;
    camera.getWorldDirection(fwd); right.crossVectors(fwd, camera.up).normalize();
    const far = s.small; const dist = far ? 110 + Math.random() * 140 : 45 + Math.random() * 70; const sc = dist * (far ? .045 : .085) * (d.plain ? 1.6 : 1);
    s.sp.position.copy(camera.position).addScaledVector(fwd, dist).addScaledVector(right, (Math.random() - .5) * dist * .9); s.sp.position.y += (Math.random() - .3) * dist * .35;
    s.sp.scale.set(sc * 3.2 * d.w, d.sq ? sc * 3.2 * d.w : (d.plain ? sc * 3.2 * d.w / 2 : sc), 1); s.sp.visible = true; s.t0 = t; s.dur = 8 + Math.random() * 4; s.peak = far ? .16 + Math.random() * .14 : .3 + Math.random() * .18;
  }
  return {
    slots, get fontReady() { return fontReady; },
    hit(ray) { for (const s of slots) { if (!s.dur || !s.num || s.sp.material.opacity < .04) continue; const box = s.sp.scale.y * 1.2; const d = ray.ray.distanceToPoint(s.sp.position); if (d < Math.max(box, s.sp.scale.x * .35)) { s.dur = 0; s.sp.visible = false; s.t0 = (s.lastT || 0) + 12; return s.num; } } return null; },
    update(t, dt, camera, enabled) {
      for (const s of slots) { s.lastT = t;
        if (!s.dur) { if (t > s.t0 && enabled && fontReady) spawn(s, camera, t); continue; }
        const u = (t - s.t0) / s.dur; s.sp.position.x += dt * 2.2; s.sp.position.y += dt * .25;
        s.sp.material.opacity = s.peak * Math.sin(Math.PI * Math.min(1, u)) ** 2 * (enabled ? 1 : 0);
        if (u >= 1) { s.dur = 0; s.sp.visible = false; s.t0 = t + (s.small ? 4 + Math.random() * 8 : 10 + Math.random() * 16); }
      }
    },
  };
}
