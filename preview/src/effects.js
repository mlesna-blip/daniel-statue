import * as THREE from 'three';
import { rnd } from './textures.js';

// Smooth value noise for rock displacement
function h3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function n3(x, y, z) { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz; const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz); const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h3(ix, iy, iz), h3(ix + 1, iy, iz), u), L(h3(ix, iy + 1, iz), h3(ix + 1, iy + 1, iz), u), v), L(L(h3(ix, iy, iz + 1), h3(ix + 1, iy, iz + 1), u), L(h3(ix, iy + 1, iz + 1), h3(ix + 1, iy + 1, iz + 1), u), v), w); }
const fbm = (x, y, z) => n3(x, y, z) * .5 + n3(x * 2.1, y * 2.1, z * 2.1) * .3 + n3(x * 4.3, y * 4.3, z * 4.3) * .2;
function displace(geo, amp, freq, f = (v, n) => 1 + (n - .5) * amp) { const p = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = fbm(v.x * freq + 3, v.y * freq, v.z * freq); v.multiplyScalar(f(v, n)); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); return geo; }

export function createStone(envMap) {
  const geo = displace(new THREE.IcosahedronGeometry(6, 4), .55, .35);
  const stone = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0e0c0a, roughness: .98, metalness: 0, flatShading: true, envMap, envMapIntensity: .15, emissive: 0x100c08, emissiveIntensity: 0 }));
  stone.castShadow = true; stone.visible = false; return stone;
}
export function createMountain(envMap) {
  // v6: smooth-shaded rock with soft strata and crevice darkening baked into vertex colours (no texture download)
  const geo = new THREE.SphereGeometry(1, 160, 80, 0, Math.PI * 2, 0, Math.PI / 2);
  displace(geo, 0, 2.2, (v, n) => { const ridge = 1 - Math.abs(n3(v.x * 5, v.y * 5, v.z * 5) - .5) * 2; return .78 + n * .35 + ridge * .12 * v.y; });
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Math.pow(Math.max(p.getY(i), 0), 1.35) * 1.15);
  geo.computeVertexNormals();
  const col = new Float32Array(p.count * 3), nrm = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const strata = .5 + .5 * Math.sin(y * 38 + fbm(x * 3, y * 3, z * 3) * 6);
    const cav = Math.pow(n3(x * 14, y * 14, z * 14), 1.6), slope = 1 - nrm.getY(i);
    const k = .55 + .2 * strata + .25 * cav - .18 * slope;
    col.set([.62 * k + .04, .55 * k + .03, .47 * k + .02], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xb3a490, vertexColors: true, roughness: .85, envMap, envMapIntensity: 2.4, emissive: 0x2a170c, emissiveIntensity: 1 }));
  m.scale.setScalar(.001); m.visible = false; m.receiveShadow = m.castShadow = true; return m;
}

// Pre-sampled shards: one InstancedMesh per section material, positions sampled from the assembled statue's surface.
const SECTION_DELAY = { feet: 0, legs: .3, belly: .62, chest: .9, head: 1.2 };
export function createShards(statue, scene) {
  statue.root.updateMatrixWorld(true);
  const byMat = new Map(); const v = new THREE.Vector3(), im = new THREE.Matrix4();
  const COUNTS = { feet: 900, legs: 700, belly: 600, chest: 800, head: 500 };
  for (const [id, sec] of Object.entries(statue.sections)) {
    const meshes = []; sec.userData.pivot.traverse(o => { if (o.isMesh && !o.userData.noPick) meshes.push(o); });
    const weights = meshes.map(o => { const b = new THREE.Box3().setFromObject(o).getSize(v); return Math.max(b.x * b.y + b.y * b.z + b.x * b.z, .5); }); const tot = weights.reduce((a, b) => a + b, 0);
    meshes.forEach((o, mi) => {
      const n = Math.max(2, Math.round(COUNTS[id] * weights[mi] / tot)); const mat0 = [].concat(o.material)[0]; if (!mat0.userData.shardMat) { const sm = mat0.clone(); sm.transparent = true; sm.onBeforeCompile = () => {}; mat0.userData.shardMat = sm; } const mat = mat0.userData.shardMat; if (!byMat.has(mat)) byMat.set(mat, []);
      const pos = o.geometry.attributes.position;
      for (let k = 0; k < n; k++) {
        v.fromBufferAttribute(pos, Math.floor(rnd() * pos.count));
        if (o.isInstancedMesh) { o.getMatrixAt(Math.floor(rnd() * o.count), im); v.applyMatrix4(im); }
        v.applyMatrix4(o.matrixWorld);
        const out = new THREE.Vector3(v.x, 0, v.z - 2).normalize();
        byMat.get(mat).push({ p: v.clone(), vel: new THREE.Vector3(out.x * (2 + rnd() * 8) * (id === 'feet' ? 1.8 : 1), id === 'feet' ? 4 + rnd() * 10 : rnd() * 4 - 1, out.z * (2 + rnd() * 8) + (id === 'feet' ? 9 : 2)), axis: new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize(), spin: 2 + rnd() * 6, size: ((id === 'feet' ? .7 : .45) + Math.pow(rnd(), 3) * 2.6) * (rnd() < .08 ? 1.8 : 1), delay: SECTION_DELAY[id] + rnd() * .25 + (id === 'feet' ? 0 : (v.y - sec.userData.bottom) * .006), lift: .6 + rnd() * .8 });
      }
    });
  }
  const geo = new THREE.DodecahedronGeometry(1, 0); geo.scale(1, .55, .8); const groups = [];
  for (const [mat, list] of byMat) { const m = new THREE.InstancedMesh(geo, mat, list.length); m.frustumCulled = false; m.castShadow = true; m.visible = false; scene.add(m); groups.push({ m, list }); }
  const d = new THREE.Object3D(), q = new THREE.Quaternion();
  function update(T) {
    for (const { m, list } of groups) {
      m.visible = T > 0 && T < 7.9; if (!m.visible) continue; m.material.opacity = 1 - THREE.MathUtils.smoothstep(T, 3.6, 7.4); m.material.depthWrite = m.material.opacity > .98;
      list.forEach((s, i) => {
        const tau = T - s.delay;
        if (tau <= 0) { d.scale.setScalar(0); d.position.copy(s.p); }
        else {
          // ballistic fall with drag, resting on the ground; v10: then (Dan 2:35) the wind scatters the chaff along the
          // ground around the statue, tumbling a little, and it fades out where it lies (nothing flies off into the sky)
          const k = 1.1, dr = (1 - Math.exp(-k * tau)) / k, gy = s.size * .35;
          let y = s.p.y + s.vel.y * dr - 15 * tau * tau; if (y < gy) y = gy;
          const w = Math.max(0, T - 2.3 - s.lift * 1.1), roll = 1 - Math.exp(-w * .7), grounded = y <= gy + .01;
          const sx = (10 + s.lift * 22) * roll, sz = (s.axis.x * 9 - 2) * roll;
          d.position.set(s.p.x + s.vel.x * dr + sx, y, s.p.z + s.vel.z * dr + sz);
          d.quaternion.copy(q.setFromAxisAngle(s.axis, s.spin * (dr * 2 + (grounded ? roll * 2.2 : w))));
          d.scale.setScalar(s.size);
        }
        d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    }
  }
  return { update, delays: SECTION_DELAY };
}

// v6: impact dust (normal-blended, brown) and wind-blown chaff (tiny specks in the section metals)
export function createDebrisFX(scene) {
  const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const mkPts = (n, attrs, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); for (const [k, sz] of attrs) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(n * sz), sz)); const p = new THREE.Points(g, mat); p.frustumCulled = false; p.visible = false; scene.add(p); return p; };
  const DN = 260, dust = mkPts(DN, [['a', 1]], new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uMap: { value: tex }, uPx: { value: innerHeight } },
    vertexShader: 'attribute float a; uniform float uPx; varying float vA; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vA = a; gl_PointSize = clamp((4. + 14.*(1.-a))*uPx/-mv.z*3., 2., 260.); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ float m = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vec3(.16,.12,.09), m*vA*.55); }' }));
  const dd = []; for (let i = 0; i < DN; i++) { const a = rnd() * 6.283, up = rnd(); dd.push({ v: new THREE.Vector3(Math.cos(a) * (6 + rnd() * 22), up * 7, Math.sin(a) * (6 + rnd() * 18) + 4), d: rnd() * .5 + (i > DN * .6 ? 1 + rnd() * 1.5 : 0), y0: i > DN * .6 ? 10 + rnd() * 70 : 3 + rnd() * 5 }); }
  const CN = 420, chaff = mkPts(CN, [['color', 3]], new THREE.PointsMaterial({ size: .55, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 }));
  const pal = [[1, .7, .3], [.8, .85, 1], [.85, .45, .2], [.5, .55, .65], [.6, .32, .2]]; const cd = [];
  for (let i = 0; i < CN; i++) { const c = pal[i % 5]; chaff.geometry.attributes.color.setXYZ(i, c[0] * .6, c[1] * .6, c[2] * .6); cd.push({ p: new THREE.Vector3((rnd() - .5) * 30, 2 + rnd() * 100, (rnd() - .5) * 16), s: .6 + rnd(), ph: rnd() * 6 }); }
  return {
    update(T) {
      dust.visible = T > 0 && T < 9; chaff.visible = T > 2.2 && T < 10;
      if (dust.visible) { const pa = dust.geometry.attributes.position, aa = dust.geometry.attributes.a; dust.material.uniforms.uPx.value = innerHeight;
        dd.forEach((o, i) => { const tau = Math.max(0, T - o.d); const k = (1 - Math.exp(-1.4 * tau)) / 1.4; pa.setXYZ(i, o.v.x * k + Math.max(0, T - 2.3) ** 2 * 3, o.y0 + o.v.y * k + tau * 1.2, 13 + o.v.z * k); aa.setX(i, tau <= 0 ? 0 : Math.min(1, tau * 4) * (1 - THREE.MathUtils.smoothstep(tau, 2.5, 7))); });
        pa.needsUpdate = aa.needsUpdate = true; }
      if (chaff.visible) { const pa = chaff.geometry.attributes.position, w = T - 2.2;
        cd.forEach((o, i) => { const fall = Math.max(.4 + o.s * .5, o.p.y - w * w * 14 * o.s), r = 1 - Math.exp(-w * .6); pa.setXYZ(i, o.p.x + r * 18 * o.s + Math.sin(w * 2 + o.ph) * 1.2, fall + Math.abs(Math.sin(w * 3 + o.ph)) * .4, o.p.z + r * (o.ph - 3) * 2); }); pa.needsUpdate = true;
        chaff.material.opacity = .8 * Math.min(1, w * 2) * (1 - THREE.MathUtils.smoothstep(w, 4, 7.5)); }
    },
  };
}
