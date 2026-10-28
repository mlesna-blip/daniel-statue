import * as THREE from 'three';
// Procedural canvas textures: height maps are drawn in grayscale and converted to normal and roughness maps.
export function cnv(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; }
let seed = 7; export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function heightToNormal(src, strength = 2.5) {
  const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const [c, ctx] = cnv(w, h); const out = ctx.createImageData(w, h);
  const H = (x, y) => d[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = -(H(x + 1, y) - H(x - 1, y)) * strength, ny = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(nx, ny, 1), i = (y * w + x) * 4;
    out.data[i] = (nx / l * .5 + .5) * 255; out.data[i + 1] = (ny / l * .5 + .5) * 255; out.data[i + 2] = (1 / l * .5 + .5) * 255; out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0); return c;
}
function heightToRough(src, base = .3, range = .45) {
  const [c, ctx] = cnv(src.width, src.height); const img = src.getContext('2d').getImageData(0, 0, src.width, src.height);
  for (let i = 0; i < img.data.length; i += 4) { const v = (base + (1 - img.data[i] / 255) * range + (Math.random() - .5) * .08) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; }
  ctx.putImageData(img, 0, 0); return c;
}
export function tex(c, rx = 1, ry = 1, srgb = false) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function pbrSet(heightCanvas, { strength = 2.5, rx = 1, ry = 1, rBase = .25, rRange = .45 } = {}) {
  return { normalMap: tex(heightToNormal(heightCanvas, strength), rx, ry), roughnessMap: tex(heightToRough(heightCanvas, rBase, rRange), rx, ry) };
}
const g = v => `rgb(${v},${v},${v})`;
function speckle(ctx, w, h, n, a = .06) { for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(${rnd() > .5 ? 255 : 0},${rnd() > .5 ? 255 : 0},${rnd() > .5 ? 255 : 0},${a})`; ctx.fillStyle = rnd() > .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, rnd() * 3 + .5, 0, 7); ctx.fill(); } }
function rosette(ctx, x, y, r) { ctx.fillStyle = g(215); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5, r * .42, r * .2, a, 0, 7); ctx.fill(); } ctx.fillStyle = g(245); ctx.beginPath(); ctx.arc(x, y, r * .25, 0, 7); ctx.fill(); }
function band(ctx, w, y, h, kind) {
  ctx.fillStyle = g(195); ctx.fillRect(0, y, w, h); ctx.fillStyle = g(90); ctx.fillRect(0, y, w, 2); ctx.fillRect(0, y + h - 2, w, 2);
  ctx.fillStyle = g(230); ctx.fillRect(0, y + 3, w, 2); ctx.fillRect(0, y + h - 5, w, 2);
  const n = Math.round(w / h);
  for (let i = 0; i < n; i++) {
    const cx = (i + .5) * w / n, cy = y + h / 2;
    if (kind === 'rosette') rosette(ctx, cx, cy, h * .38);
    else if (kind === 'zigzag') { ctx.strokeStyle = g(240); ctx.lineWidth = h * .12; ctx.beginPath(); ctx.moveTo(cx - w / n / 2, cy + h * .25); ctx.lineTo(cx, cy - h * .25); ctx.lineTo(cx + w / n / 2, cy + h * .25); ctx.stroke(); }
    else { for (let k = 0; k < 4; k++) { ctx.fillStyle = g(k % 2 ? 60 : 250); const sx = cx - w / n * .35 + k * w / n * .2; ctx.beginPath(); ctx.moveTo(sx, cy - h * .28); ctx.lineTo(sx + h * .14, cy - h * .28); ctx.lineTo(sx + h * .07, cy + h * .28); ctx.fill(); } }
  }
}
// Engraved bands (chest lamellar, leg columns)
export function bandsHeight({ w = 512, h = 512, bands = 4, flutes = 0, lamellar = false } = {}) {
  const [c, ctx] = cnv(w, h); ctx.fillStyle = g(140); ctx.fillRect(0, 0, w, h);
  if (flutes) for (let i = 0; i < flutes; i++) { const x = i * w / flutes; const gr = ctx.createLinearGradient(x, 0, x + w / flutes, 0); gr.addColorStop(0, g(90)); gr.addColorStop(.5, g(190)); gr.addColorStop(1, g(90)); ctx.fillStyle = gr; ctx.fillRect(x, 0, w / flutes, h); }
  if (lamellar) for (let r = 0; r < 16; r++) for (let i = 0; i < 32; i++) { const x = i * w / 32 + (r % 2) * w / 64, y = r * h / 16; ctx.fillStyle = g(170); ctx.beginPath(); ctx.roundRect(x + 1, y + 1, w / 32 - 3, h / 16 - 3, 6); ctx.fill(); ctx.fillStyle = g(205); ctx.beginPath(); ctx.arc(x + w / 64, y + 6, 2, 0, 7); ctx.fill(); }
  const kinds = ['rosette', 'cune', 'zigzag'];
  for (let b = 0; b < bands; b++) band(ctx, w, (b + .5) * h / bands - 18, 36, kinds[b % 3]);
  speckle(ctx, w, h, 1500); return c;
}
// Winged-bull (lamassu) relief centred on the front (u = 0.5) of a lathe
export function bullHeight() {
  const w = 1024, h = 512; const [c, ctx] = cnv(w, h); ctx.fillStyle = g(135); ctx.fillRect(0, 0, w, h);
  band(ctx, w, 14, 40, 'rosette'); band(ctx, w, h - 60, 40, 'cune');
  ctx.save(); ctx.translate(w / 2, h / 2 + 10); ctx.scale(1.15, 1.25);
  const raised = g(225);
  ctx.fillStyle = g(100); ctx.beginPath(); ctx.roundRect(-118, -112, 236, 236, 16); ctx.fill(); ctx.fillStyle = g(120); ctx.beginPath(); ctx.roundRect(-110, -104, 220, 220, 12); ctx.fill();
  ctx.fillStyle = raised;
  ctx.beginPath(); ctx.ellipse(10, 20, 70, 34, 0, 0, 7); ctx.fill();               // body
  [[-40, 48], [-20, 50], [40, 48], [60, 46]].forEach(([x, y]) => ctx.fillRect(x - 7, y, 14, 46)); // legs
  ctx.fillRect(-48, 90, 120, 6);
  ctx.beginPath(); ctx.ellipse(-70, -20, 18, 22, 0, 0, 7); ctx.fill();                // head
  ctx.fillRect(-88, -58, 36, 14);                                                     // tiara
  ctx.fillStyle = g(200); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(-82 + j * 8, 6 + i * 8, 3.5, 0, 7); ctx.fill(); } // beard curls
  ctx.strokeStyle = g(245); ctx.lineWidth = 5;
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 4, 0); ctx.quadraticCurveTo(10 + i * 10, -50 - i * 6, 80 + i * 4, -70 - i * 3); ctx.stroke(); } // wing feathers
  ctx.strokeStyle = g(205); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(80, 15); ctx.quadraticCurveTo(105, 30, 95, 60); ctx.stroke(); // tail
  ctx.restore(); speckle(ctx, w, h, 2500); return c;
}
export function hammeredHeight(w = 256) { const [c, ctx] = cnv(w); ctx.fillStyle = g(128); ctx.fillRect(0, 0, w, w); for (let i = 0; i < 900; i++) { const r = 3 + rnd() * 9, x = rnd() * w, y = rnd() * w; const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); } return c; }
function cracks(ctx, w, h, n, col, lw = 2) { ctx.strokeStyle = col; for (let i = 0; i < n; i++) { let x = rnd() * w, y = rnd() * h, a = rnd() * 7; ctx.lineWidth = lw * (.5 + rnd()); ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 14; k++) { a += (rnd() - .5) * 1.4; x += Math.cos(a) * 12; y += Math.sin(a) * 12; ctx.lineTo(x, y); } ctx.stroke(); } }
export function clayMaps() {
  const [hc, hx] = cnv(512); hx.fillStyle = g(160); hx.fillRect(0, 0, 512, 512); speckle(hx, 512, 512, 4000, .1); cracks(hx, 512, 512, 40, g(20), 3);
  const [cc, cx] = cnv(512); cx.fillStyle = '#9a5b38'; cx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) { cx.fillStyle = `rgba(${60 + rnd() * 90},${30 + rnd() * 40},${20 + rnd() * 20},.12)`; cx.beginPath(); cx.arc(rnd() * 512, rnd() * 512, rnd() * 6, 0, 7); cx.fill(); }
  seed = 7; cracks(cx, 512, 512, 40, '#2a140a', 3);
  return { map: tex(cc, 1, 1, true), ...pbrSet(hc, { strength: 4, rBase: .75, rRange: .25 }) };
}
export function groundMaps() {
  const S = 1024; const [cc, cx] = cnv(S); cx.fillStyle = '#9a8268'; cx.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { const v = rnd(); cx.fillStyle = v > .5 ? `rgba(200,160,110,${.05 + rnd() * .06})` : `rgba(70,45,30,${.05 + rnd() * .06})`; cx.beginPath(); cx.arc(rnd() * S, rnd() * S, rnd() * 14, 0, 7); cx.fill(); }
  cracks(cx, S, S, 70, 'rgba(60,38,24,.55)', 1.5);
  const [hc, hx] = cnv(512); hx.drawImage(cc, 0, 0, 512, 512);
  return { map: tex(cc, 40, 40, true), ...Object.fromEntries(Object.entries(pbrSet(hc, { strength: 3, rBase: .8, rRange: .2 })).map(([k, t]) => (t.repeat.set(40, 40), [k, t]))) };
}
// Blue glazed bricks with a yellow lion frieze (Ishtar Gate / Processional Way style)
export function wallMap() {
  const w = 512, h = 512; const [c, ctx] = cnv(w, h);
  for (let y = 0; y < h; y += 16) for (let x = -(y / 16 % 2) * 16; x < w; x += 32) { const b = 0.75 + rnd() * .35; ctx.fillStyle = `rgb(${30 * b},${70 * b},${150 * b})`; ctx.fillRect(x + 1, y + 1, 30, 14); }
  const fr = (y0) => { ctx.fillStyle = '#e8d6a8'; ctx.fillRect(0, y0, w, 6); ctx.fillRect(0, y0 + 74, w, 6); for (let i = 0; i < 2; i++) { const x = 60 + i * 256; ctx.fillStyle = '#d9a23a'; ctx.beginPath(); ctx.ellipse(x + 60, y0 + 40, 60, 18, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x, y0 + 30, 16, 0, 7); ctx.fill(); [10, 30, 90, 110].forEach(dx => ctx.fillRect(x + dx, y0 + 48, 8, 24)); ctx.strokeStyle = '#d9a23a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 118, y0 + 36); ctx.quadraticCurveTo(140, y0 + 20, 150, y0 + 34); ctx.stroke(); } };
  fr(150); for (let i = 0; i < 8; i++) { rosetteColor(ctx, 32 + i * 64, 60); rosetteColor(ctx, 32 + i * 64, 400); }
  return tex(c, 1, 1, true);
}
function rosetteColor(ctx, x, y) { ctx.fillStyle = '#f1e4c0'; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 8, 4, a, 0, 7); ctx.fill(); } ctx.fillStyle = '#d9a23a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
export function radialSprite(inner = 'rgba(255,230,180,1)', S = 64) { const [c, ctx] = cnv(S); const gr = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); gr.addColorStop(0, inner); gr.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, S, S); return tex(c); }
export function rayTexture() { const [c, ctx] = cnv(64, 256); const img = ctx.createImageData(64, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) { const u = (x / 63 - .5) * 2, v = y / 255; const a = Math.exp(-u * u * 5) * Math.pow(v, 1.6) * 255; const i = (y * 64 + x) * 4; img.data[i] = 255; img.data[i + 1] = 210; img.data[i + 2] = 140; img.data[i + 3] = a; } ctx.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); return t; }

// Carved stone paving for the colossus' platform: irregular flagstones, chipped joints, cracks, a carved rosette band.
export function pavingMaps() {
  const S = 1024; const [cc, cx] = cnv(S); const [hc, hx] = cnv(S);
  cx.fillStyle = '#1a120c'; cx.fillRect(0, 0, S, S); hx.fillStyle = g(40); hx.fillRect(0, 0, S, S);
  const rows = 8; let y = 0;
  for (let r = 0; r < rows; r++) {
    const h = S / rows; let x = -rnd() * 80;
    while (x < S) {
      const w = 90 + rnd() * 120, b = .75 + rnd() * .4, j = 3 + rnd() * 3;
      cx.fillStyle = `rgb(${118 * b},${92 * b},${70 * b})`; cx.fillRect(x + j, y + j, w - 2 * j, h - 2 * j);
      hx.fillStyle = g(170 + rnd() * 40); hx.fillRect(x + j, y + j, w - 2 * j, h - 2 * j);
      // chipped corners
      for (let k = 0; k < 3; k++) { const px = x + (rnd() > .5 ? j : w - j), py = y + (rnd() > .5 ? j : h - j), rr = 4 + rnd() * 10; cx.fillStyle = '#1a120c'; hx.fillStyle = g(50); cx.beginPath(); cx.arc(px, py, rr, 0, 7); cx.fill(); hx.beginPath(); hx.arc(px, py, rr, 0, 7); hx.fill(); }
      // wear: lighter centre, pits
      for (let k = 0; k < 40; k++) { const px = x + rnd() * w, py = y + rnd() * h, rr = rnd() * 3 + .5; cx.fillStyle = `rgba(20,12,8,${.2 + rnd() * .3})`; cx.beginPath(); cx.arc(px, py, rr, 0, 7); cx.fill(); hx.fillStyle = g(90); hx.beginPath(); hx.arc(px, py, rr, 0, 7); hx.fill(); }
      x += w;
    }
    y += h;
  }
  for (let i = 0; i < 9000; i++) { const v = rnd(); cx.fillStyle = v > .5 ? `rgba(190,150,110,${.03 + rnd() * .05})` : `rgba(30,18,10,${.05 + rnd() * .08})`; cx.beginPath(); cx.arc(rnd() * S, rnd() * S, rnd() * 9, 0, 7); cx.fill(); }
  cracks(cx, S, S, 60, 'rgba(18,10,6,.8)', 1.4); seed = 11; cracks(hx, S, S, 60, g(60), 1.4);
  return { map: tex(cc, 1, 1, true), ...pbrSet(hc, { strength: 5, rBase: .78, rRange: .2 }) };
}
