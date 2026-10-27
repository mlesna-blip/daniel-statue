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
  const light = new THREE.SpotLight(0xffb070, 0, 70, THREE.MathUtils.degToRad(24), .8, 1.4); light.position.set(0, 40, 30); group.add(light, light.target);
  const glowMat = new THREE.MeshBasicMaterial({ map: radialSprite('rgba(255,150,70,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false });
  const items = {}; const pickables = [];
  for (const b of BEASTS) {
    const holder = new THREE.Group(); holder.position.set(b.pos[0], top, b.pos[1]); group.add(holder);
    const pl = new THREE.Mesh(plinthGeo, plinthMat); pl.scale.set(b.len * .78, 1.6, b.len * .5); pl.position.y = .8; pl.castShadow = pl.receiveShadow = true; holder.add(pl);
    const pl2 = new THREE.Mesh(plinthGeo, plinthMat); pl2.scale.set(b.len * .86, .5, b.len * .58); pl2.position.y = .25; pl2.receiveShadow = true; holder.add(pl2);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat.clone()); glow.rotation.x = -Math.PI / 2; glow.position.y = 1.65; glow.scale.set(b.len * 1.1, b.len * .8, 1); holder.add(glow);
    items[b.id] = { ...b, holder, glow, mats: [], k: 0, model: null, sx: 1 };
  }
  const tmpBox = new THREE.Box3(), V = new THREE.Vector3();
  async function load(b) {
    const g = await loader.loadAsync(`models/beasts/${b.file}.glb`); const m = g.scene; const it = items[b.id];
    tmpBox.setFromObject(m); const sz = tmpBox.getSize(V); const s = b.len / Math.max(sz.x, sz.z);
    m.scale.setScalar(s); tmpBox.setFromObject(m); const c = tmpBox.getCenter(new THREE.Vector3());
    const pivot = new THREE.Group(); m.position.set(-c.x, -tmpBox.min.y, -c.z); pivot.add(m); pivot.position.y = 1.6; pivot.rotation.y = b.face; it.holder.add(pivot);
    m.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.userData.beast = b.id; pickables.push(o);
      const mt = o.material; mt.envMap = world.envMap; mt.envMapIntensity = .35; mt.userData.c0 = mt.color.clone(); mt.emissive = new THREE.Color(0xffa860); mt.emissiveMap = mt.map; mt.emissiveIntensity = 0; it.mats.push(mt); });
    it.model = pivot;
  }
  // statue first, then the beasts one at a time so they never compete with the first paint
  (async () => { for (const b of BEASTS) { try { await load(b); } catch (e) { console.warn('beast', b.id, e); } } window.__beastsLoaded = true; })();
  const secToBeast = Object.fromEntries(BEASTS.map(b => [b.sec, b.id]));
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let cur = null;
  // v12 (redline): rest in front of the statue's feet on the far edge of the map, half on the platform; enter from the east
  // side along the map's edge and leave to the west, curving outward so the path never crosses the statue or its plinth.
  const H_REST = new THREE.Vector3(-2, top, 36), H_RUN = 150, H_BOW = 34, H_SC = 1.65, HB = { head: 'lion', chest: 'bear', belly: 'leopard', legs: 'fourth', feet: 'fourth' };
  let hShown = null, hWas = false;
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function slideTo(it, goal, delay = 0, from) { if (from !== undefined) it.sx = from; it.sGoal = goal; it.sFrom = it.sx; it.sAt = performance.now() + delay * 1000; } // wall-clock, so slow frames never stall it
  function histUpdate(on, dt) {
    if (!on) { if (hWas) { for (const id in items) { const it = items[id]; it.holder.position.set(it.pos[0], top, it.pos[1]); it.holder.rotation.y = 0; it.holder.scale.setScalar(1); it.holder.visible = true; it.sx = 1; it.sGoal = undefined; } hShown = null; } hWas = false; return; }
    if (!hWas) { for (const id in items) { items[id].sx = 1; items[id].holder.visible = false; items[id].holder.scale.setScalar(H_SC); } hWas = true; }
    const evOpen = document.querySelector('#hist .evidence.on'), want = HB[history.metal] || null;
    if (want !== hShown) { if (hShown) slideTo(items[hShown], -1); if (want) slideTo(items[want], 0, hShown ? .5 : .2, 1); /* in from the east, out to the west */ hShown = want; }
    const cam = world.camera;
    for (const id in items) {
      const it = items[id];
      if (it.sGoal !== undefined) { const k = window.__slideK ?? Math.max(0, Math.min(1, (performance.now() - it.sAt) / 1900)); it.sx = it.sFrom + (it.sGoal - it.sFrom) * ease(k); if (k >= 1) { it.sx = it.sGoal; it.sGoal = undefined; } }
      it.holder.visible = Math.abs(it.sx) < .999;
      if (!it.holder.visible) continue;
      const x = it.sx, bow = Math.sin(Math.min(1, Math.abs(x)) * Math.PI / 2);
      it.holder.position.set(H_REST.x + x * H_RUN, top, H_REST.z + bow * H_BOW);
      // walking: face the way it travels; at rest: three-quarters to the camera
      const rest = Math.atan2(cam.position.x - it.holder.position.x, cam.position.z - it.holder.position.z) + .55, walk = Math.PI / 2 + (x > 0 ? -.25 : .25) * 0;
      const w = Math.min(1, Math.abs(x) * 4); it.holder.rotation.y = rest * (1 - w) + walk * w - it.face;
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
      if (it) { const p = it.holder.position; light.position.set(p.x * .7, p.y + 34, p.z + 26); light.target.position.set(p.x, p.y + 5, p.z); }
      light.intensity = k * 2600;
    },
  };
}
