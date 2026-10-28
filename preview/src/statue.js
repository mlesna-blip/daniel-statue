import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SECTIONS } from './data.js?v=20261028v15b';
import { bandsHeight, bullHeight, hammeredHeight, pbrSet, clayMaps, rnd } from './textures.js?v=20261028v15b';

// ---------- Materials (tweak looks here) ----------
export function makeMaterials(envMap) {
  const hammer = hammeredHeight();
  const P = (o) => new THREE.MeshPhysicalMaterial({ envMap, envMapIntensity: .9, emissiveIntensity: 0, ...o });
  const m = {
    gold: P({ color: 0xffc15a, metalness: 1, roughness: .26, clearcoat: .3, ...pbrSet(hammer, { strength: 1.5, rx: 3, ry: 3, rBase: .18, rRange: .2 }) }),
    goldDark: P({ color: 0xb07a2a, metalness: 1, roughness: .45 }),
    silver: P({ color: 0x9ea4ac, metalness: 1, roughness: .34, side: THREE.DoubleSide, ...pbrSet(bandsHeight({ lamellar: true, bands: 3 }), { strength: 3, rx: 2, ry: 1, rBase: .2, rRange: .35 }) }),
    silverPlain: P({ color: 0xaab0b8, metalness: 1, roughness: .28, side: THREE.DoubleSide, ...pbrSet(hammer, { strength: 1.2, rx: 4, ry: 4, rBase: .18, rRange: .25 }) }),
    bronze: P({ color: 0xc27a3e, metalness: 1, roughness: .32, ...pbrSet(bullHeight(), { strength: 3.5, rBase: .22, rRange: .4 }) }),
    bronzePlain: P({ color: 0xb8733a, metalness: 1, roughness: .36, ...pbrSet(bandsHeight({ bands: 5 }), { strength: 3, rx: 1, ry: 1, rBase: .25, rRange: .35 }) }),
    iron: P({ color: 0x55585e, metalness: .9, roughness: .5, ...pbrSet(bandsHeight({ bands: 6, flutes: 28 }), { strength: 3.5, rx: 1, ry: 1, rBase: .35, rRange: .4 }) }),
    ironFeet: P({ color: 0x4a4c51, metalness: .85, roughness: .55, ...pbrSet(hammer, { strength: 2, rx: 2, ry: 2, rBase: .4, rRange: .3 }) }),
    clay: new THREE.MeshStandardMaterial({ envMap, envMapIntensity: .5, color: 0xffffff, metalness: 0, roughness: .95, emissiveIntensity: 0, ...clayMaps() }),
    seam: new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  };
  m.seam.color.multiplyScalar(4);
  return m;
}

// ---------- Helpers ----------
const V2 = (r, y) => new THREE.Vector2(r, y);
const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([r, y]) => V2(r, y)), seg, Math.PI, Math.PI * 2);
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; }
function seam(sec, mats, x, y, z, r, sz = 1) { const s = new THREE.Mesh(new THREE.TorusGeometry(r, .45, 8, 64), mats.seam); s.rotation.x = Math.PI / 2; s.scale.y = sz; s.position.set(x, y, z); s.userData.noPick = true; sec.userData.pivot.add(s); }

function makeSection(meta) {
  const g = new THREE.Group(); g.name = meta.id; const pivot = new THREE.Group(); g.add(pivot);
  g.userData = { ...meta, pivot, mats: new Set(), hl: 0, hover: 0 }; return g;
}
function finishSection(g) {
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(); g.userData.pivot.traverse(o => { if (o.isMesh && !o.userData.noPick) { box.expandByObject(o); [].concat(o.material).forEach(m => g.userData.mats.add(m)); } });
  const c = box.getCenter(new THREE.Vector3()); const s = box.getSize(new THREE.Vector3());
  g.position.copy(c); g.userData.pivot.position.copy(c).negate();
  g.userData.home = c.clone(); g.userData.size = s; g.userData.radius = s.length() / 2; g.userData.bottom = box.min.y;
}

// ---------- Sections ----------
const HZ = 2.5; // head pushed forward so the beard rests on the chest
function buildHead(sec, m) {
  const p = sec.userData.pivot;
  mesh(new THREE.CylinderGeometry(4.6, 5.6, 6, 32), m.gold, p, 0, 88.5, HZ * .5);
  const skull = mesh(new THREE.SphereGeometry(7, 64, 40), m.gold, p, 0, 97, HZ); skull.scale.set(1, 1.1, 1);
  // face planes
  const brow = mesh(new RoundedBoxGeometry(9.4, 1.4, 2.4, 3, .5), m.gold, p, 0, 99.4, HZ + 5.6); brow.rotation.x = -.2;
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(1, 20, 12), m.goldDark, p, s * 2.4, 98.1, HZ + 6.05); eye.scale.set(1.45, .5, .45);
    const lid = mesh(new THREE.CapsuleGeometry(.32, 2.2, 4, 8), m.gold, p, s * 2.4, 98.75, HZ + 6.25); lid.rotation.z = Math.PI / 2 + s * .18;
    const cheek = mesh(new THREE.SphereGeometry(2.2, 20, 14), m.gold, p, s * 3.1, 95.4, HZ + 4.6); cheek.scale.set(1, .8, .6);
    const ear = mesh(new THREE.TorusGeometry(1.1, .45, 8, 16, Math.PI * 1.3), m.gold, p, s * 6.35, 96.8, HZ + .2); ear.rotation.set(0, s * Math.PI / 2, -1);
    const mo = mesh(new THREE.CapsuleGeometry(.55, 2.6, 4, 10), m.gold, p, s * 1.6, 93.9, HZ + 6.7); mo.rotation.z = s * 1.15; mo.rotation.y = s * .3;
  }
  const ns = new THREE.Shape(); ns.moveTo(0, 2.8); ns.lineTo(.5, 2.4); ns.lineTo(1.9, -.4); ns.lineTo(1.4, -.9); ns.lineTo(0, -.9);
  const ng = new THREE.ExtrudeGeometry(ns, { depth: 1.7, bevelEnabled: true, bevelSize: .3, bevelThickness: .3, bevelSegments: 2 }); ng.translate(0, 0, -.85); ng.rotateY(-Math.PI / 2);
  mesh(ng, m.gold, p, 0, 95.6, HZ + 6.1);
  mesh(new RoundedBoxGeometry(2.6, .5, .8, 2, .2), m.goldDark, p, 0, 93.1, HZ + 6.5);
  // squared ringlet beard
  mesh(new RoundedBoxGeometry(10, 9.5, 5, 3, 1.5), m.gold, p, 0, 88.1, HZ + 3.8);
  const ring = new THREE.TorusGeometry(.6, .34, 8, 16); const rows = 6, cols = 7;
  const beard = new THREE.InstancedMesh(ring, m.gold, rows * cols + 2 * 7 * 2 + 40); let k = 0; const d = new THREE.Object3D();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = (c - 3) * 1.4 + (r % 2) * .35 - .17, y = 92.2 - r * 1.45; d.position.set(x, y, HZ + 6.2 + r * .22 - .045 * x * x); d.rotation.set(0, x * .06, 0); d.updateMatrix(); beard.setMatrixAt(k++, d.matrix);
  }
  // side ringlet locks and back hair
  for (const s of [-1, 1]) for (let c = 0; c < 2; c++) for (let r = 0; r < 7; r++) { d.position.set(s * (6.1 + c * .2), 95.5 - r * 1.5, HZ - .5 - c * 1.6); d.rotation.set(0, Math.PI / 2, 0); d.updateMatrix(); beard.setMatrixAt(k++, d.matrix); }
  for (let i = 0; i < 40; i++) { const a = Math.PI * (.15 + (i % 10) / 9 * .7) + Math.PI / 2, r = Math.floor(i / 10); d.position.set(Math.cos(a) * 6.4 * -1, 94 - r * 1.6, HZ + Math.sin(a) * -6.6); d.rotation.set(0, a, 0); d.updateMatrix(); beard.setMatrixAt(k++, d.matrix); }
  beard.castShadow = true; p.add(beard);
  // tiered crown
  const tiers = [[6.7, 6.4, 101.6, 2.6, 18], [6.0, 6.2, 104.2, 2.2, 14], [4.9, 5.3, 106.4, 2, 10]];
  tiers.forEach(([rt, rb, y, h, n], i) => {
    mesh(new THREE.CylinderGeometry(rt, rb, h, 48), i === 1 ? m.goldDark : m.gold, p, 0, y + h / 2, HZ);
    mesh(new THREE.TorusGeometry(rt + .1, .35, 8, 48), m.gold, p, 0, y + h, HZ).rotation.x = Math.PI / 2;
    mesh(new THREE.TorusGeometry(rb + .1, .3, 8, 48), m.gold, p, 0, y, HZ).rotation.x = Math.PI / 2;
    for (let t = 0; t < n; t++) { const a = t / n * Math.PI * 2; const tooth = mesh(i === 2 ? new THREE.ConeGeometry(.6, 2.4, 4) : new RoundedBoxGeometry(1, 1.8, .7, 2, .2), m.gold, p, Math.sin(a) * rt, y + h + .9, HZ + Math.cos(a) * rt); tooth.rotation.y = a; }
    if (i === 0) for (let t = 0; t < 7; t++) { const a = (t - 3) * .32; mesh(new THREE.SphereGeometry(.45, 12, 8), m.goldDark, p, Math.sin(a) * (rt + .2), y + h / 2, HZ + Math.cos(a) * (rt + .2)); }
  });
  mesh(new THREE.ConeGeometry(1.5, 3.4, 8), m.gold, p, 0, 110.2, HZ); mesh(new THREE.SphereGeometry(.7, 16, 10), m.gold, p, 0, 112.2, HZ);
  // scale the whole head up around the neck base: the gold head should dominate like in the concept
  const hg = new THREE.Group(); hg.position.set(0, 86, 0); hg.scale.setScalar(1.38); hg.rotation.x = .2;
  [...p.children].forEach(c => { c.position.y -= 86; hg.add(c); }); p.add(hg);
  seam(sec, m, 0, 86, HZ * .5, 5.4);
}

function buildHand(m) {
  const h = new THREE.Group(); const add = (g, x, y, z) => { const o = new THREE.Mesh(g, m.silverPlain); o.position.set(x, y, z); o.castShadow = true; h.add(o); return o; };
  add(new RoundedBoxGeometry(3.4, 5.4, 4.6, 3, 1), 0, 0, 0);
  for (let f = 0; f < 4; f++) { const fz = 1.65 - f * 1.1; const arc = add(new THREE.TorusGeometry(1.25, .62, 10, 14, Math.PI * 1.15), -.55, -2.3, fz); arc.rotation.z = Math.PI * .62; add(new THREE.SphereGeometry(.62, 10, 8), -1.6, -1.3, fz); }
  const th = add(new THREE.CapsuleGeometry(.6, 2.2, 4, 10), -1.5, .2, 2.4); th.rotation.set(.5, 0, .5);
  return h;
}
function buildChest(sec, m) {
  const p = sec.userData.pivot;
  const chest = mesh(lathe([[13.2, 64], [14.6, 68], [16.2, 73], [17.2, 78], [16.4, 82], [12.6, 85], [7, 87.3], [5, 87.6]]), m.silver, p); chest.scale.z = .72;
  const gorget = mesh(new THREE.TorusGeometry(8.4, 1.3, 16, 64), m.silverPlain, p, 0, 85.4, .4); gorget.rotation.x = Math.PI / 2; gorget.scale.y = .74;
  // winged-sun emblem
  mesh(new THREE.CylinderGeometry(1.8, 1.8, .8, 32), m.silverPlain, p, 0, 77.5, 12.1).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const w = mesh(new RoundedBoxGeometry(5.5 - i * .9, .7, .5, 2, .2), m.silverPlain, p, s * (4 - i * .2), 78.2 - i * .75, 11.9 - i * .05 - (4 - i * .2) * .08); w.rotation.z = s * (.12 + i * .05); }
  for (const s of [-1, 1]) {
    // layered pauldrons
    for (let i = 0; i < 3; i++) { const cap = mesh(new THREE.SphereGeometry(7.8 + i * .9, 40, 16, 0, Math.PI * 2, 0, 1.15), m.silverPlain, p, s * (17.5 + i * .6), 84.2 - i * 2.8, 0); cap.scale.set(1, .62, 1.05); cap.rotation.z = -s * (.35 + i * .14); }
    mesh(new THREE.SphereGeometry(4.6, 24, 16), m.silver, p, s * 19.6, 80.5, 0);
    mesh(lathe([[3.8, 0], [4.4, 5], [4.5, 13], [3.9, 18]], 32), m.silver, p, s * 20, 62, 0);
    mesh(new THREE.SphereGeometry(3.8, 24, 16), m.silverPlain, p, s * 20.1, 62, 0);
    mesh(lathe([[3.1, 0], [3.3, 2], [4.1, 11], [3.9, 17]], 32), m.silver, p, s * 20.4, 45.5, 0);
    for (const y of [47, 56, 61.3]) mesh(new THREE.TorusGeometry(y === 47 ? 3.4 : 4.15, .4, 8, 32), m.silverPlain, p, s * 20.4, y, 0).rotation.x = Math.PI / 2;
    const hand = buildHand(m); hand.position.set(s * 20.6, 41.5, .4); hand.scale.x = s; p.add(hand);
  }
  seam(sec, m, 0, 64.2, 0, 13.4, .72);
}
function buildBelly(sec, m) {
  const p = sec.userData.pivot;
  const belly = mesh(lathe([[11.8, 48], [14, 51.5], [15.4, 56], [15.2, 61], [13.4, 64.5]]), m.bronze, p); belly.scale.z = .8;
  for (const [y, r] of [[50.6, 13.6], [64.2, 13.6]]) { const b = mesh(new THREE.TorusGeometry(r, 1.05, 12, 64), m.bronzePlain, p, 0, y, 0); b.rotation.x = Math.PI / 2; b.scale.y = .8; }
  for (const s of [-1, 1]) mesh(lathe([[6.1, 40.5], [6.6, 44], [7.7, 50], [8.1, 54]], 40), m.bronzePlain, p, s * 8, 0, 0);
  // hanging apron with fringe
  const sh = new THREE.Shape(); sh.moveTo(-5, 0); sh.lineTo(5, 0); sh.lineTo(3.9, -19); sh.lineTo(-3.9, -19); sh.closePath();
  const ag = new THREE.ExtrudeGeometry(sh, { depth: .6, bevelEnabled: true, bevelSize: .35, bevelThickness: .35, bevelSegments: 2 });
  const pos = ag.attributes.position, uv = ag.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + 5) / 10 * .3 + .35, (pos.getY(i) + 19) / 19 * .7 + .15);
  const apron = mesh(ag, m.bronzePlain, p, 0, 50.4, 11.2); apron.rotation.x = -.06;
  for (let i = 0; i < 9; i++) mesh(new THREE.CylinderGeometry(.28, .2, 2.4, 6), m.bronzePlain, p, -3.6 + i * .9, 30.2, 12.5);
  mesh(new THREE.TorusGeometry(1.2, .35, 8, 20), m.bronzePlain, p, 0, 47.8, 12.4);
  seam(sec, m, -8, 41, 0, 6.6); seam(sec, m, 8, 41, 0, 6.6);
}
function buildLegs(sec, m) {
  const p = sec.userData.pivot;
  for (const s of [-1, 1]) {
    mesh(lathe([[4.6, 6.5], [5.5, 11], [5.9, 18], [5.3, 25], [5.7, 28], [6.4, 36], [6.5, 42]]), m.iron, p, s * 8, 0, 0);
    for (const [y, r] of [[11.5, 5.7], [25.5, 5.6], [36, 6.6], [40.5, 6.7]]) mesh(new THREE.TorusGeometry(r, .55, 10, 48), m.iron, p, s * 8, y, 0).rotation.x = Math.PI / 2;
  }
  seam(sec, m, -8, 7, 0, 5); seam(sec, m, 8, 7, 0, 5);
}
// Feet: interleaved strata of iron and terracotta clay chunks that do not bond (Dan 2:41–43)
function buildFeet(sec, m) {
  const p = sec.userData.pivot; const chunk = new THREE.DodecahedronGeometry(1, 0); const d = new THREE.Object3D();
  sec.userData.toes = [];
  for (const s of [-1, 1]) {
    const iron = new THREE.InstancedMesh(chunk, m.ironFeet, 500), clay = new THREE.InstancedMesh(chunk, m.clay, 500); let ni = 0, nc = 0;
    for (let L = 0; L < 6; L++) {
      const y = .55 + L * 1.12, hw = 5.6 - L * .32, z0 = -5.6 + L * .2, z1 = 9.2 - L * 1.25;
      for (let x = -hw; x <= hw; x += 1.55) for (let z = z0; z <= z1; z += 1.6) {
        const ex = (x / hw) ** 2 + ((z - (z0 + z1) / 2) / ((z1 - z0) / 2)) ** 2; if (ex > 1.15) continue;
        const isIron = (L % 2 === 0) ? rnd() < .72 : rnd() < .28;
        d.position.set(s * 8 + x + (rnd() - .5) * .5, y + (rnd() - .5) * .3, z + (rnd() - .5) * .5);
        d.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); const sc = .85 + rnd() * .45; d.scale.set(sc * 1.1, sc * (isIron ? .62 : .72), sc); d.updateMatrix();
        if (isIron) iron.setMatrixAt(ni++, d.matrix); else clay.setMatrixAt(nc++, d.matrix);
      }
    }
    iron.count = ni; clay.count = nc; [iron, clay].forEach(o => { o.castShadow = o.receiveShadow = true; p.add(o); });
    // ten toes: segments alternating iron / clay with hairline gaps
    for (let i = 0; i < 5; i++) {
      const t = new THREE.Group(); const r = i === 0 ? 1.35 : 1.05 - i * .07, len = i === 0 ? 4.6 : 4.1 - i * .35;
      t.position.set(s * 8 - s * (3.6 - i * 1.85), r, 8.2 - i * .55 + (i === 0 ? .4 : 0)); t.rotation.y = -s * (i - 2) * .05;
      const segs = 3; let z = 0;
      for (let k = 0; k < segs; k++) {
        const L = len / segs - .12; const mat = (k + i) % 2 ? m.clay : m.ironFeet;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * (1 - k * .06), r * (1 - (k - 1) * .06), L, 14), mat); seg.rotation.x = Math.PI / 2; seg.position.z = z + L / 2; seg.castShadow = true;
        seg.userData.homeZ = seg.position.z; seg.userData.k = k; t.add(seg); z += L + .12;
      }
      const tip = new THREE.Mesh(new THREE.SphereGeometry(r * .86, 14, 10), (i % 2) ? m.ironFeet : m.clay); tip.position.z = z; tip.userData.homeZ = z; tip.userData.k = segs; tip.castShadow = true; t.add(tip);
      t.userData.home = t.position.clone(); t.userData.homeRotY = t.rotation.y; t.userData.index = (s < 0 ? 4 - i : 5 + i); p.add(t); sec.userData.toes.push(t);
    }
  }
}

export function buildStatue(mats) {
  const root = new THREE.Group(); root.name = 'statue'; const sections = {};
  const builders = { head: buildHead, chest: buildChest, belly: buildBelly, legs: buildLegs, feet: buildFeet };
  SECTIONS.forEach((meta, i) => { const g = makeSection({ ...meta, index: i }); builders[meta.id](g, mats); root.add(g); finishSection(g); sections[meta.id] = g; });
  root.traverse(o => { if (o.isMesh) { [].concat(o.material).forEach(mm => { if (mm.emissive && mm !== mats.seam) mm.emissive.copy(mm === mats.clay ? new THREE.Color(0x8a4a2a) : mm.color); }); } });
  return { root, sections };
}
