import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { SECTIONS } from './data.js?v=20261028v15';

// GLB node name -> section id
const NODE = { head: 'head_gold', chest: 'chest_silver', belly: 'belly_bronze', legs: 'legs_iron', feet: 'feet_clay' };
// subtle multipliers on the baked albedo so the metals separate a touch more (head -> gold, chest -> cool silver)
const COLOR_NEW = { head: 0xffffff, chest: 0xffffff, belly: 0xffffff, legs: 0xffffff, feet: 0xffffff }; // v10: metals are graded into the texture
const COLOR_CLASSIC = { head: 0xffffff, chest: 0xeef3ff, belly: 0xd9c6b2, legs: 0xe4e8ee, feet: 0xffffff }; // v9 tints
// v11: statue switcher. 'new' = v10 statue (default), 'classic' = the original v9 statue (unlockable), 'v11d' = the v11d design (open), 'v11f' = the v11f lamassu design (open)
export const ASSET_V = '20261028v15';
const asset = (p) => p + (p.includes('?') ? '&' : '?') + 'v=' + ASSET_V;
export const STATUES = { new: { hd: 'models/statue_hd.glb', lod: 'models/statue_lod.glb', color: COLOR_NEW, fx: true }, classic: { hd: 'models/statue_classic_hd.glb', lod: 'models/statue_classic_lod.glb', color: COLOR_CLASSIC, fx: false },
  // v11d: Hunyuan 'v11d-A' design (griffin kilt), processed in /workspace/gt/v11d (same 5 nodes, 0..1 height -> 112 units; feet/legs/belly cuts on the v10 heights, belly/chest on the kilt's top edge; capped)
  v11d: { hd: 'models/statue_v11d_hd.glb', lod: 'models/statue_v11d_lod.glb', color: COLOR_NEW, fx: true },
  // v11f: Hunyuan 'v11f take 1' (lamassu-style beard, tall cap, hands on chest), processed in /workspace/gt/v11f (same rig: feet/legs/belly on the v10 heights, belly/chest on the kilt top, gold head incl. the long beard; capped)
  v11f: { hd: 'models/statue_v11f_hd.glb', lod: 'models/statue_v11f_lod.glb', color: COLOR_NEW, fx: true },
  // v11o: Hunyuan 'v11o-2' (waist wings, hilt-style rod, ziggurat backer), processed in /workspace/gt/v11o (same rig + an unsliced 'backer_stone' node behind the figure)
  v11o: { hd: 'models/statue_v11o_hd.glb', lod: 'models/statue_v11o_lod.glb', color: COLOR_NEW, fx: true } };
export function isUnlocked(id) {
  // v13: all current styles selectable; Ziggurat (v11o) is the default. Rewards/locking held off.
  if (id === 'new' || id === 'classic' || id === 'v11d' || id === 'v11f' || id === 'v11o') return true;
  try { return localStorage.getItem('dan2-unlock-' + id) === '1'; } catch (e) { return false; }
}
export function pickStatue(q) { let id = q.get('statue') || (() => { try { return localStorage.getItem('dan2-statue'); } catch (e) { return null; } })() || 'v11o'; if (!(id in STATUES)) id = 'new'; if (!isUnlocked(id) && !q.has('statue')) id = 'new'; return id; }
const TINT = { head: 0xffb84a, chest: 0xc8d4e6, belly: 0xd08040, legs: 0x8090a8, feet: 0xb06a3a };
// v6: soft spotlight on one section. Everything outside the world-space band [uLo,uHi] sinks to a dark,
// half-transparent silhouette; the boundary is warped by 3D noise so it never reads as a straight cut.
export const STATUE_FX = { uLo: { value: -1e4 }, uHi: { value: 1e4 }, uDim: { value: 0 } };
function softSpot(mat, opt = {}) {
  // v10: per-material uniforms. uYMax clamps the highlight band for the silver section so the raised hand counts
  // with the silver (not the gold head); uHot softly limits hot specular spots and cools warm reflections on silver.
  const U = mat.userData.fxU = { uYMax: { value: 1e4 }, uHot: { value: opt.hot || 0 }, uCool: { value: opt.cool || 0 } };
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, STATUE_FX, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSWP;').replace('#include <project_vertex>', '#include <project_vertex>\nvSWP = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vSWP; uniform float uLo, uHi, uDim, uYMax, uHot, uCool;
float sh3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float sn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(sh3(i),sh3(i+vec3(1,0,0)),f.x), mix(sh3(i+vec3(0,1,0)),sh3(i+vec3(1,1,0)),f.x), f.y), mix(mix(sh3(i+vec3(0,0,1)),sh3(i+vec3(1,0,1)),f.x), mix(sh3(i+vec3(0,1,1)),sh3(i+vec3(1,1,1)),f.x), f.y), f.z); }`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  if (uCool > 0.) { float l = dot(gl_FragColor.rgb, vec3(.299,.587,.114)); gl_FragColor.rgb = mix(gl_FragColor.rgb, l * vec3(.9,.97,1.08), uCool * smoothstep(.05, .6, l)); }
  if (uHot > 0.) { float m = max(max(gl_FragColor.r, gl_FragColor.g), gl_FragColor.b); if (m > uHot) gl_FragColor.rgb *= (uHot + (m - uHot) * .18) / m; }
  if (uDim > .001) {
    float n = sn3(vSWP*.07)*.65 + sn3(vSWP*.19)*.35;
    float sy = min(vSWP.y, uYMax);
    float dOut = max(uLo - sy, sy - uHi);
    float k = smoothstep(-5., 9., dOut + (n - .5) * 13.) * uDim;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * .13 + vec3(.006,.005,.004), k);
    gl_FragColor.a *= 1. - k * .25;
  }`);
  };
  mat.customProgramCacheKey = () => 'softspot';
}
// v11h: cross-section caps. The baked caps sit in the same mesh as the body (UVs parked on a grey texel), so we
// split the flat faces at each cut into their own mesh with a procedural metal section material + a bright rim strip.
const CAPCOL = { head: [0xe0a83c, 0xe0a83c], chest: [0xc9d0da, 0xc9d0da], belly: [0xb8743a, 0xb8743a], legs: [0x77746f, 0x77746f], feet: [0x6f6c68, 0xa05a34] };
function capMaterial(id, envMap) {
  const [c1, c2] = CAPCOL[id];
  const mat = new THREE.MeshStandardMaterial({ color: c1, metalness: id === 'feet' ? .7 : id === 'legs' ? .8 : 1, roughness: .42, envMap, envMapIntensity: id === 'legs' || id === 'feet' ? 1.3 : 2.2, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  mat.userData.capU = { uC2: { value: new THREE.Color(c2) }, uMix: { value: id === 'feet' ? 1 : 0 }, uGlow: { value: new THREE.Color({ head: 0xffb84a, chest: 0xc8d0dc, belly: 0xd08040, legs: 0x9a9088, feet: 0xa87050 }[id]).multiplyScalar(.04) } };
  return mat;
}
function capShader(mat) {
  const prev = mat.onBeforeCompile, CU = mat.userData.capU;
  mat.onBeforeCompile = sh => {
    prev(sh); Object.assign(sh.uniforms, CU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aCap; varying vec3 vCap;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCap = aCap;');
    sh.fragmentShader = sh.fragmentShader.replace('varying vec3 vSWP;', 'varying vec3 vSWP; varying vec3 vCap; uniform vec3 uC2, uGlow; uniform float uMix;')
      .replace('#include <color_fragment>', `#include <color_fragment>
  float cr = length(vCap.xy); float cn = sn3(vSWP*1.7)*.6 + sn3(vSWP*5.3)*.4;
  float ring = .5 + .5*sin(cr*9.0 + cn*2.2);  // concentric 'growth' rings of a cast section
  float brush = sn3(vec3(vSWP.x*.25, vSWP.z*14., 0.))*.6 + sn3(vec3(vSWP.x*.5, vSWP.z*31., 1.))*.4;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(.33))) * vec3(1.04,1.,.95), uMix > -1. && diffuseColor.b > diffuseColor.r ? .6 : 0.);
  if (uMix > 0.) diffuseColor.rgb = mix(diffuseColor.rgb, uC2, smoothstep(.42, .58, sn3(vSWP*.45)*.7 + sn3(vSWP*1.6)*.3));
  diffuseColor.rgb *= .58 + .42*ring + .2*brush + .12*cn;
  diffuseColor.rgb *= mix(.75, 1.15, smoothstep(.0, .35, vCap.z));
  float cRim = 1. - smoothstep(.0, .09, vCap.z);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = clamp(roughnessFactor + (ring-.5)*.2 + (brush-.5)*.16 - cRim*.18, .08, 1.);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uGlow * (.35 + .65*ring) * smoothstep(.15, .6, vCap.z) + diffuseColor.rgb * (.07 + cRim * .45);');
  };
  mat.customProgramCacheKey = () => 'softspot-cap';
}
function splitCaps(geo, mw, id, forceMid = null) {
  // world-oriented face normals; caps = near-horizontal faces at the section's cut planes
  const g = geo.index ? geo : geo.clone();
  const P = g.attributes.position, I = g.index ? g.index.array : null, n = I ? I.length / 3 : P.count / 3;
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nm = new THREE.Vector3();
  let ymin = 1e9, ymax = -1e9; const W = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { v[0].fromBufferAttribute(P, i).applyMatrix4(mw); W.set([v[0].x, v[0].y, v[0].z], i * 3); ymin = Math.min(ymin, v[0].y); ymax = Math.max(ymax, v[0].y); }
  const eps = (ymax - ymin) * .006, keepLo = id !== 'feet', keepHi = id !== 'head', mid = (ymin + ymax) / 2;
  // group flat faces by height; the cut plane on each side is the height band with the most flat area
  const flatF = [], groups = new Map();
  for (let f = 0; f < n; f++) {
    const ix = [0, 1, 2].map(k => I ? I[f * 3 + k] : f * 3 + k); ix.forEach((q, k) => v[k].fromArray(W, q * 3));
    e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); nm.crossVectors(e1, e2); const L = nm.length();
    const spread = Math.max(v[0].y, v[1].y, v[2].y) - Math.min(v[0].y, v[1].y, v[2].y);
    if (L > 1e-12 && Math.abs(nm.y) / L > .96 && spread < eps) { const b = Math.round(((v[0].y + v[1].y + v[2].y) / 3) / eps); flatF[f] = b; groups.set(b, (groups.get(b) || 0) + L); }
  }
  let bLo = null, bHi = null, aLo = 0, aHi = 0;
  // flat-cut fallback (classic): only height bands right at the section's ends count, so flat ledges (kilt top) stay body
  const endTol = (ymax - ymin) * .03;
  groups.forEach((a, b) => { const y = b * eps; if (keepLo && y < ymin + endTol && a > aLo) { aLo = a; bLo = b; } if (keepHi && y > ymax - endTol && a > aHi) { aHi = a; bHi = b; } });
  const inB = (f, b) => b !== null && flatF[f] !== undefined && Math.abs(flatF[f] - b) <= 1;
  // v11h: caps made by the cap script (new / v11d) are fans whose 3 vertices share one UV (a metal or parked texel)
  const UVa = g.attributes.uv; const sameUV = f => { if (!UVa) return false; const q = [0, 1, 2].map(k => I ? I[f * 3 + k] : f * 3 + k); const u0 = UVa.getX(q[0]), v0 = UVa.getY(q[0]); return q.every(k => Math.abs(UVa.getX(k) - u0) < 1e-6 && Math.abs(UVa.getY(k) - v0) < 1e-6); };
  let nUV = 0; for (let f = 0; f < n; f++) if (sameUV(f)) nUV++;
  const useUV = nUV > 2 && forceMid === null;
  const capTris = { lo: [], hi: [] }, rest = [];
  for (let f = 0; f < n; f++) { const ix = [0, 1, 2].map(k => I ? I[f * 3 + k] : f * 3 + k);
    if (forceMid !== null) { const cy = (W[ix[0] * 3 + 1] + W[ix[1] * 3 + 1] + W[ix[2] * 3 + 1]) / 3; capTris[cy < forceMid ? 'lo' : 'hi'].push(ix); continue; }
    if (useUV) { if (sameUV(f) && (() => { [0, 1, 2].forEach(k => v[k].fromArray(W, ix[k] * 3)); e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); nm.crossVectors(e1, e2); const L = nm.length(); return L > 1e-12 && Math.abs(nm.y) / L > .55; })()) { const cy = (W[ix[0] * 3 + 1] + W[ix[1] * 3 + 1] + W[ix[2] * 3 + 1]) / 3; const side = cy < mid ? 'lo' : 'hi'; if ((side === 'lo' && keepLo) || (side === 'hi' && keepHi)) { capTris[side].push(ix); continue; } } rest.push(...ix); continue; }
    // classic fallback: near-horizontal faces in the last 4% at each end of the section (its caps are not quite flat)
    [0, 1, 2].forEach(k => v[k].fromArray(W, ix[k] * 3)); e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); nm.crossVectors(e1, e2); const L = nm.length(), hz = L > 1e-12 && Math.abs(nm.y) / L > .85, cy = (v[0].y + v[1].y + v[2].y) / 3, et = (ymax - ymin) * .04;
    if (hz && keepLo && cy < ymin + et) capTris.lo.push(ix); else if (hz && keepHi && cy > ymax - et) capTris.hi.push(ix); else rest.push(...ix); }
  const yLo = bLo * eps, yHi = bHi * eps;
  const caps = [];
  for (const side of ['lo', 'hi']) {
    const T = capTris[side]; if (T.length < 3) continue;
    // centre / radius of the cut, boundary edges (used once) for the rim distance
    const cnt = new Map(); T.forEach(t => [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]].forEach(([a, b]) => { const k = a < b ? a + '_' + b : b + '_' + a; cnt.set(k, (cnt.get(k) || 0) + 1); }));
    const bnd = []; cnt.forEach((c, k) => { if (c === 1) { const [a, b] = k.split('_').map(Number); bnd.push([W[a * 3], W[a * 3 + 2], W[b * 3], W[b * 3 + 2]]); } });
    let cx = 0, cz = 0, m = 0; T.flat().forEach(q => { cx += W[q * 3]; cz += W[q * 3 + 2]; m++; }); cx /= m; cz /= m;
    let R = 0; bnd.forEach(b => (R = Math.max(R, Math.hypot(b[0] - cx, b[1] - cz))));
    // rim distance: brute-force distance field on a small grid over the cut, sampled bilinearly
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; bnd.forEach(([ax, az, bx, bz]) => { x0 = Math.min(x0, ax, bx); x1 = Math.max(x1, ax, bx); z0 = Math.min(z0, az, bz); z1 = Math.max(z1, az, bz); });
    const G = 48, DF = new Float32Array(G * G), gx = (x1 - x0) / (G - 1) || 1, gz = (z1 - z0) / (G - 1) || 1;
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const px = x0 + i * gx, pz = z0 + j * gz; let d = 1e9; for (const [ax, az, bx, bz] of bnd) { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1e-12, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)); const ex = px - ax - t * dx, ez = pz - az - t * dz, q = ex * ex + ez * ez; if (q < d) d = q; } DF[j * G + i] = Math.sqrt(d); }
    const segD = (px, pz) => { const fi = Math.max(0, Math.min(G - 1.001, (px - x0) / gx)), fj = Math.max(0, Math.min(G - 1.001, (pz - z0) / gz)), i = fi | 0, j = fj | 0, a = fi - i, b = fj - j; return (DF[j * G + i] * (1 - a) + DF[j * G + i + 1] * a) * (1 - b) + (DF[(j + 1) * G + i] * (1 - a) + DF[(j + 1) * G + i + 1] * a) * b; };
    // fan caps from jagged cut loops can spike up/down: clamp the cap to a thin slab around its median height
    if (forceMid === null) { const ys = T.flat().map(q => W[q * 3 + 1]).sort((a, b) => a - b), ym = ys[ys.length >> 1], d = (ymax - ymin) * .012; T.flat().forEach(q => (W[q * 3 + 1] = Math.max(ym - d, Math.min(ym + d, W[q * 3 + 1])))); }
    const pos = [], cap = [], nrmL = [], ny = side === 'hi' ? 1 : -1;
    const push = (x, y, z) => { pos.push(x, y, z); cap.push((x - cx) / Math.max(R, 1e-6) * 2.2, (z - cz) / Math.max(R, 1e-6) * 2.2, Math.min(1, segD(x, z) / Math.max(R, 1e-6))); };
    for (const t of T) {
      const A = [0, 1, 2].map(k => [W[t[k] * 3], W[t[k] * 3 + 1], W[t[k] * 3 + 2]]);
      const me = Math.max(...[[0, 1], [1, 2], [2, 0]].map(([u, w]) => Math.hypot(A[u][0] - A[w][0], A[u][2] - A[w][2]))), DIV = Math.max(1, Math.min(6, Math.ceil(me / (R * .12 || 1))));
      const at = (i, j) => { const a = i / DIV, b = j / DIV, c = 1 - a - b; return [0, 1, 2].map(d => A[0][d] * c + A[1][d] * a + A[2][d] * b); };
      for (let i = 0; i < DIV; i++) for (let j = 0; j < DIV - i; j++) {
        const tri = [[at(i, j), at(i + 1, j), at(i, j + 1)]]; if (i + j < DIV - 1) tri.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
        for (let [p0, p1, p2] of tri) { const up = ((p1[0] - p0[0]) * (p2[2] - p0[2]) - (p1[2] - p0[2]) * (p2[0] - p0[0])) * -1; if ((up > 0 ? 1 : -1) !== ny) [p1, p2] = [p2, p1]; [p0, p1, p2].forEach(p => push(p[0], p[1], p[2])); const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2], bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2]; let nx = ay * bz - az * by, nY = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, nY, nz) || 1; nx /= l; nY /= l; nz /= l; if (nY * ny < 0) { nx = -nx; nY = -nY; nz = -nz; } if (Math.abs(nY) < .5) { nx *= .3; nz *= .3; nY = ny; } for (let r = 0; r < 3; r++) nrmL.push(nx, nY, nz); }
      }
    }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('aCap', new THREE.Float32BufferAttribute(cap, 3));
    cg.setAttribute('normal', new THREE.Float32BufferAttribute(nrmL, 3));
    caps.push({ geo: cg, side, n: T.length, R });
  }
  let body = geo; if (caps.length) { body = g.clone(); body.setIndex(rest); }
  return { body, caps };
}

export const STATUE_HEIGHT = 112; // world units (matches the scene layout from v2)

export async function loadStatue(envMap, mats, onProgress) {
  const q = new URLSearchParams(location.search);
  const lite = q.get('lod') === 'low' || (q.get('lod') !== 'high' && matchMedia('(max-width: 820px), (pointer: coarse)').matches);
  const sid = pickStatue(q), S = STATUES[sid], COLOR = S.color;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(asset(lite ? S.lod : S.hd), e => onProgress && e.total && onProgress(e.loaded / e.total));
  const src = gltf.scene; src.updateMatrixWorld(true);
  // v11o: scale/offset from the five figure sections only (a backer node may sit lower/wider than the figure)
  const box = new THREE.Box3(); Object.values(NODE).forEach(n => { const o = src.getObjectByName(n); if (o) box.expandByObject(o); }); if (box.isEmpty()) box.setFromObject(src);
  const s = STATUE_HEIGHT / (box.max.y - box.min.y);
  const root = new THREE.Group(); root.name = 'statue'; const sections = {};
  SECTIONS.forEach((meta, i) => {
    const node = src.getObjectByName(NODE[meta.id]);
    const g = new THREE.Group(); g.name = meta.id; const pivot = new THREE.Group(); g.add(pivot);
    g.userData = { ...meta, index: i, pivot, mats: new Set(), hl: 0, dim: 0, hover: 0, toes: [] };
    // v11h: pipelines now export planar caps as '<node>_cap' meshes; older files (classic) fall back to splitting
    let hasCap = false, nb = new THREE.Box3(); node.traverse(o => { if (/_cap$/.test(o.name)) hasCap = true; else if (o.isMesh) nb.expandByObject(o); });
    const nMid = (nb.min.y + nb.max.y) / 2;
    node.traverse(o => {
      if (!o.isMesh) return;
      const isCap = /_cap$/.test(o.name) || (o.parent && /_cap$/.test(o.parent.name));
      if (isCap && q.has('nocaps')) return;
      const sp = isCap ? splitCaps(o.geometry, o.matrixWorld, meta.id, nMid) : (q.has('nocaps') || hasCap) ? { body: o.geometry, caps: [] } : splitCaps(o.geometry, o.matrixWorld, meta.id);
      if (isCap) { sp.caps.forEach(c => { const cm = capMaterial(meta.id, envMap); cm.color && cm.color.multiplyScalar(.35); cm.metalness = 0; cm.roughness = 1; cm.envMapIntensity = 0; softSpot(cm); capShader(cm); const k = new THREE.Mesh(c.geo, cm); k.scale.setScalar(s); k.position.y = -box.min.y * s; k.receiveShadow = true; k.name = 'cap_' + c.side; pivot.add(k); g.userData.mats.add(cm); g.userData.caps = (g.userData.caps || 0) + c.n; }); return; }
      const m = new THREE.Mesh(sp.body, o.material.clone());
      m.applyMatrix4(o.matrixWorld); m.position.multiplyScalar(s); m.scale.multiplyScalar(s);
      m.position.y -= box.min.y * s;
      // cap geometry is already in GLB world space -> same uniform scale + offset as the body
      sp.caps.forEach(c => { const cm = capMaterial(meta.id, envMap); cm.color && cm.color.multiplyScalar(.35); cm.metalness = 0; cm.roughness = 1; cm.envMapIntensity = 0; softSpot(cm); capShader(cm); const k = new THREE.Mesh(c.geo, cm); k.scale.setScalar(s); k.position.y = -box.min.y * s; k.receiveShadow = true; k.castShadow = false; k.name = 'cap_' + c.side; pivot.add(k); g.userData.mats.add(cm); g.userData.caps = (g.userData.caps || 0) + c.n; });
      const mat = m.material; mat.envMap = envMap; mat.envMapIntensity = 1.35; mat.side = THREE.FrontSide; mat.color = new THREE.Color(COLOR[meta.id]);
      mat.emissive = new THREE.Color(TINT[meta.id]); mat.emissiveMap = mat.map; mat.emissiveIntensity = 0;
      softSpot(mat, !S.fx ? {} : meta.id === 'chest' ? { hot: 1.25, cool: .45 } : meta.id === 'head' ? { hot: 2.2 } : {}); m.castShadow = m.receiveShadow = true; pivot.add(m); g.userData.mats.add(mat);
    });
    root.add(g);
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(pivot); const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
    g.position.copy(c); pivot.position.copy(c).negate();
    // glowing seam ring at the section's lower cut (shown in the exploded view)
    if (false) { const r = new THREE.Mesh(new THREE.TorusGeometry(Math.max(sz.x, sz.z) * .3, .35, 8, 64), mats.seam); r.rotation.x = Math.PI / 2; r.position.set(c.x, b.min.y, c.z); r.userData.noPick = true; pivot.add(r); }
    g.userData.home = c.clone(); g.userData.size = sz; g.userData.radius = sz.length() / 2; g.userData.bottom = b.min.y;
    // v10: authored height band (model units 0..1 -> world) so a raised arm doesn't stretch the chest's highlight band
    const band = node.userData && node.userData.band; if (band) g.userData.band = [band[0] * STATUE_HEIGHT, band[1] * STATUE_HEIGHT];
    sections[meta.id] = g;
  });
  // v11o: optional unsliced backer (the ziggurat slab). Not a section: it is not picked, stays put in Exploded
  // (only eases back a little) and is hidden when the stone shatters the image.
  let backer = null; const bn = src.getObjectByName('backer_stone');
  if (bn) { backer = new THREE.Group(); backer.name = 'backer'; const mats = new Set();
    bn.traverse(o => { if (!o.isMesh) return; const m = new THREE.Mesh(o.geometry, o.material.clone()); m.applyMatrix4(o.matrixWorld); m.position.multiplyScalar(s); m.scale.multiplyScalar(s); m.position.y -= box.min.y * s;
      const mat = m.material; mat.envMap = envMap; mat.envMapIntensity = 1.0; mat.side = THREE.FrontSide; softSpot(mat, { hot: 1.05, cool: .3 }); m.castShadow = m.receiveShadow = true; m.userData.noPick = true; backer.add(m); mats.add(mat); });
    backer.userData = { mats, noPick: true }; root.add(backer); }
  return { root, sections, lite, id: sid, backer };
}

export function setHistoryCaps(statue, hide) {
  if (!statue || !statue.root) return;
  statue.root.traverse(o => {
    if (!o.isMesh || !/^cap_/.test(o.name || '')) return;
    if (hide) { o.visible = false; }
    else {
      o.visible = true;
      const m = o.material; if (!m) return;
      if (m.userData && m.userData.capU && m.userData.capU.uGlow) m.userData.capU.uGlow.value.multiplyScalar(0);
      if ('opacity' in m) { m.transparent = true; m.opacity = .35; }
      if (m.color) m.color.setHex(0x1a120c);
      m.needsUpdate = true;
    }
  });
}
