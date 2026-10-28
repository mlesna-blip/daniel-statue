import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { radialSprite } from './textures.js';
// v8: the four beasts of Daniel 7 as dark metal statues on low plinths flanking the image, mostly in shadow.
// Whichever kingdom is active (hover, exploded selection, beast tablet or the current empire in history)
// wakes its beast with a warm pool of light; the rest stay dim. Loaded lazily after the statue.
export const BEASTS = [
  { id: 'lion', file: 'lion', sec: 'head', pos: [-48, -26], len: 20.4, face: .35 },
  { id: 'bear', file: 'bear', sec: 'chest', pos: [48, -26], len: 20.4, face: -.35 },
  { id: 'leopard', file: 'leopard', sec: 'belly', pos: [-60, -58], len: 20.4, face: .55 },
  { id: 'fourth', file: 'beast4', sec: 'legs', pos: [60, -58], len: 21.6, face: -.55 },
];
export async function createBeasts({ world, statue, history }) {
  const q = new URLSearchParams(location.search); if (q.has('nobeasts')) return null;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const group = new THREE.Group(); group.name = 'beasts'; world.scene.add(group);
  const top = world.PLAT_TOP;
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x2a211b, roughness: .95, envMap: world.envMap, envMapIntensity: .08 });
  const plinthGeo = new THREE.BoxGeometry(1, 1, 1);
  const light = new THREE.SpotLight(0xffb070, 0, 140, THREE.MathUtils.degToRad(32), .65, 1.2); light.position.set(0, 40, 30); light.castShadow = false; group.add(light, light.target);
  const glowMat = new THREE.MeshBasicMaterial({ map: radialSprite('rgba(255,150,70,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false });
  const items = {}; const pickables = [];
  for (const b of BEASTS) {
    const holder = new THREE.Group(); holder.position.set(b.pos[0], top, b.pos[1]); group.add(holder);
    const pl = new THREE.Mesh(plinthGeo, plinthMat); pl.scale.set(b.len * .78, 1.6, b.len * .5); pl.position.y = .8; pl.castShadow = pl.receiveShadow = true; holder.add(pl);
    const pl2 = new THREE.Mesh(plinthGeo, plinthMat); pl2.scale.set(b.len * .86, .5, b.len * .58); pl2.position.y = .25; pl2.receiveShadow = true; holder.add(pl2); pl.userData.plinth = true; pl2.userData.plinth = true;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat.clone()); glow.rotation.x = -Math.PI / 2; glow.position.y = 1.65; glow.scale.set(b.len * 1.1, b.len * .8, 1); holder.add(glow);
    items[b.id] = { ...b, holder, glow, mats: [], k: 0, model: null, sx: 1, plinths: [pl, pl2] };
  }
  const tmpBox = new THREE.Box3(), V = new THREE.Vector3();
  async function load(b) {
    const g = await loader.loadAsync(`models/beasts/${b.file}.glb?v=20261027c`); const m = g.scene; const it = items[b.id];
    tmpBox.setFromObject(m); const sz = tmpBox.getSize(V); const s = b.len / Math.max(sz.x, sz.z);
    m.scale.setScalar(s); tmpBox.setFromObject(m); const c = tmpBox.getCenter(new THREE.Vector3());
    const pivot = new THREE.Group(); m.position.set(-c.x, -tmpBox.min.y, -c.z); pivot.add(m); pivot.position.y = 1.6; pivot.rotation.y = b.face; it.holder.add(pivot);
    m.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.userData.beast = b.id; pickables.push(o);
      const mt = o.material; mt.envMap = world.envMap; mt.envMapIntensity = .35; mt.userData.c0 = mt.color.clone(); mt.emissive = new THREE.Color(0xffa860); mt.emissiveMap = mt.map; mt.emissiveIntensity = 0; it.mats.push(mt); });
    it.model = pivot; if (hWas) it.grounded = false;
  }
  // statue first, then the beasts one at a time so they never compete with the first paint
  (async () => { for (const b of BEASTS) { try { await load(b); } catch (e) { console.warn('beast', b.id, e); } } window.__beastsLoaded = true; })();
  const secToBeast = Object.fromEntries(BEASTS.map(b => [b.sec, b.id]));
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let cur = null;
  // v13: History beasts rise from the map (no spin, no plinth), with a simple dust puff; sink/fade out when the era ends.
  const H_REST = new THREE.Vector3(-2, 0, 36), HB = { head: 'lion', chest: 'bear', belly: 'leopard', legs: 'fourth', feet: 'fourth' };
  const H_SC = 1.65; let hShown = null, hWas = false;
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  // soft dust puff (canvas sprite)
  const dustTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(180,140,90,.55)'); g.addColorStop(.45, 'rgba(120,90,55,.22)'); g.addColorStop(1, 'rgba(80,55,30,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  function mkDust(it) {
    if (it.dust) return it.dust;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, opacity: 0 }));
    spr.scale.set(18, 7, 1); spr.position.set(0, 1.2, 0); it.holder.add(spr); it.dust = spr; return spr;
  }
  function groundY(x, z) {
    // Surface between map relief and platform — never below platform top near the statue.
    let g = top;
    try { if (history && history.map && history.map.groundAt) g = history.map.groundAt(x, z); } catch (e) { }
    // Blend toward platform when near the colossus feet so beasts stand on the shared ledge
    if (z > 20 && z < 50 && Math.abs(x) < 40) g = Math.max(g, top * .92);
    return g;
  }
  const _bbox = new THREE.Box3();
  /** Snap holder Y so the model's world-space feet sit at surfaceY (remeasure every call — pivots/scale differ per beast). */
  function snapFeetTo(it, surfaceY) {
    if (!it.model) return;
    it.holder.updateMatrixWorld(true);
    _bbox.setFromObject(it.model);
    if (!_bbox.isEmpty()) it.holder.position.y += surfaceY - _bbox.min.y;
    it.grounded = true;
  }
  function slideTo(it, goal, delay = 0, from) {
    if (from !== undefined) it.sx = from; it.sGoal = goal; it.sFrom = it.sx; it.sAt = performance.now() + delay * 1000;
  }
  function histUpdate(on, dt) {
    if (!on) {
      if (hWas) {
        for (const id in items) {
          const it = items[id];
          it.plinths && it.plinths.forEach(p => (p.visible = true));
          it.holder.position.set(it.pos[0], top, it.pos[1]); it.holder.rotation.y = 0; it.holder.scale.setScalar(1);
          it.holder.visible = true; it.sx = 1; it.sGoal = undefined; it.grounded = false;
          if (it.dust) it.dust.material.opacity = 0;
          it.mats.forEach(m => { if (m.userData._histOp != null) { m.opacity = m.userData._histOp; m.transparent = m.userData._histTr; } });
        }
        hShown = null;
      }
      hWas = false; return;
    }
    if (!hWas) {
      for (const id in items) {
        const it = items[id]; it.sx = 1; it.holder.visible = false; it.holder.scale.setScalar(H_SC);
        it.plinths && it.plinths.forEach(p => (p.visible = false)); // no platform under History beasts
        it.glow.visible = false;
      }
      hWas = true;
    }
    const want = HB[history.metal] || null;
    if (want !== hShown) {
      if (hShown) slideTo(items[hShown], 1); // sink out
      if (want) {
        const it = items[want];
        it.holder.position.set(H_REST.x, groundY(H_REST.x, H_REST.z) - 14, H_REST.z); // start buried
        it.holder.rotation.y = Math.atan2(world.camera.position.x - H_REST.x, world.camera.position.z - H_REST.z) + .55 - it.face;
        it.holder.visible = true; it.grounded = false;
        slideTo(it, 0, hShown ? .35 : .15, 1); // rise in (sx 1→0)
        const d = mkDust(it); d.material.opacity = 0; d.scale.set(10, 4, 1);
      }
      hShown = want;
    }
    const cam = world.camera;
    for (const id in items) {
      const it = items[id];
      if (it.sGoal !== undefined) {
        const k = window.__slideK ?? Math.max(0, Math.min(1, (performance.now() - it.sAt) / 1600));
        it.sx = it.sFrom + (it.sGoal - it.sFrom) * ease(k);
        if (k >= 1) { it.sx = it.sGoal; it.sGoal = undefined; }
      }
      const rising = it.sFrom > it.sGoal; // sFrom=1 goal=0 → rising; sFrom=0 goal=1 → sinking
      it.holder.visible = it.sx < .999 || (it.sGoal !== undefined);
      if (!it.holder.visible) continue;
      // vertical only. Remeasure world bbox after scale/rot and snap feet to surface (or buried).
      const bury = 14 * it.sx;
      const gy = groundY(H_REST.x, H_REST.z);
      it.holder.position.x = H_REST.x; it.holder.position.z = H_REST.z;
      snapFeetTo(it, gy - bury);
      // face camera (set once while rising; hold while sunk)
      if (it.sx < .85) {
        const face = Math.atan2(cam.position.x - it.holder.position.x, cam.position.z - it.holder.position.z) + .55 - it.face;
        it.holder.rotation.y += (face - it.holder.rotation.y) * Math.min(1, dt * 4);
      }
      // soft fade while sinking
      const fade = 1 - Math.max(0, it.sx - .35) / .65;
      it.mats.forEach(m => {
        if (m.userData._histOp == null) { m.userData._histOp = m.opacity; m.userData._histTr = m.transparent; }
        m.transparent = true; m.opacity = (m.userData._histOp ?? 1) * fade; m.needsUpdate = true;
      });
      // dust puff at the start of a rise
      if (it.dust) {
        const puff = rising ? Math.sin(Math.min(1, (1 - it.sx) * 2.2) * Math.PI) : Math.sin(Math.min(1, it.sx * 2) * Math.PI) * .55;
        it.dust.material.opacity = puff * .55;
        const sc = 12 + (1 - Math.abs(it.sx - .5) * 2) * 16;
        it.dust.scale.set(sc, sc * .4, 1);
      }
    }
  }
  return {
    group, items, _hist: histUpdate,
    secOf: id => items[id] && items[id].sec,
    pick(e) { if (!pickables.length) return null; ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, world.camera); const h = ray.intersectObjects(pickables, false)[0]; return h ? h.object.userData.beast : null; },
    update(t, dt, activeSec) {
      const hist = history && history.active; this._hist(hist, dt);
      const want = hist ? (hShown && Math.abs(items[hShown].sx) < .999 ? hShown : null) || hShown : activeSec ? secToBeast[activeSec] : null; if (want) cur = want;
      for (const id in items) {
        const it = items[id], goal = want === id ? 1 : 0; it.k += (goal - it.k) * Math.min(1, dt * 2.2);
        const base = .2 + it.k * .8; it.mats.forEach(m => { m.color.copy(m.userData.c0).multiplyScalar(base); m.emissiveIntensity = it.k * (hist ? .38 : .12); m.envMapIntensity = .3 + it.k * .6; });
        it.glow.material.opacity = it.k * .22;
      }
      const it = cur && items[cur]; const k = it ? it.k : 0;
      if (it) {
        const p = it.holder.position;
        // Aim from above-front at the beast chest; keep target on the mesh even while rising
        light.position.set(p.x + 8, p.y + 42, p.z + 28);
        light.target.position.set(p.x, p.y + 8, p.z);
        light.target.updateMatrixWorld();
        light.distance = hist ? 160 : 140;
      }
      light.intensity = k * (hist ? 4200 : 2600);
    },
  };
}
