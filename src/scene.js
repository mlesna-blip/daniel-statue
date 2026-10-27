import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundMaps, pavingMaps, radialSprite, rayTexture, rnd } from './textures.js';
import { createPlume, createFire } from './fire.js';

// Faint storm light sits behind the colossus' head.
export const SUN_DIR = new THREE.Vector3(.2, .95, -1).normalize();
const BABYLON_DIR = new THREE.Vector3(0, 0, -1); // the city glows behind the statue

const skyVert = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
// No horizon: near-black void, very faint clouds, and a low warm glow rising from behind Babylon's walls.
const skyFrag = `
uniform float uTime; uniform vec3 uSun; uniform float uStorm; uniform vec3 uGlowDir; uniform float uGlow; varying vec3 vDir;
// v8: all noise is sampled on the 3D view direction, so there is no pole pinch at the zenith.
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x), f.y), mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x), f.y), f.z); }
float fbm3(vec3 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n3(p); p=p*2.07+vec3(1.7,9.2,3.1); a*=.5; } return v; }
float stars(vec3 d, float sc, float th){ vec3 p = d*sc; vec3 i = floor(p); vec3 f = fract(p) - .5; float r = h3(i); if (r < th) return 0.;
  vec3 o = vec3(h3(i+1.3), h3(i+2.7), h3(i+5.1)) - .5; float dd = length(f - o*.6); return smoothstep(.09, 0., dd) * (r - th) / (1. - th); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 col = mix(vec3(.0015,.0011,.0009), vec3(.004,.0038,.0042), smoothstep(.0,.4,h));
  // faint drifting cloud veils
  float v = fbm3(d*3.2 + vec3(uTime*.004, 0., uTime*.002));
  col += vec3(.007,.006,.007) * smoothstep(.5,.85,v) * smoothstep(.05,.35,h) * (1. - smoothstep(.75,1.,h)*.5);
  // the Milky Way: a soft band along a tilted great circle, dust lanes cut through it
  vec3 bn = normalize(vec3(.55, .35, .76)); float bd = dot(d, bn);
  float band = exp(-bd*bd*18.); float dust = fbm3(d*7.) ; float core = exp(-bd*bd*70.);
  float mw = band * (.55 + .6*fbm3(d*4.3 + 7.)) * (1. - .75*smoothstep(.45,.7,dust)*core);
  float up = smoothstep(.08, .5, h);
  col += vec3(.020,.017,.016) * mw * up + vec3(.028,.020,.014) * core * smoothstep(.5,.8,fbm3(d*9.+3.)) * up;
  // stars: many dim pinpricks, denser inside the band, a few brighter ones
  float s = stars(d, 260., .965) * (.35 + .9*band) + stars(d, 90., .985) * 1.6;
  col += vec3(.75,.7,.62) * s * .16 * up * (1. - uStorm*.15);
  // warm city glow behind the walls
  float az = max(dot(normalize(vec3(d.x,0.,d.z)), uGlowDir), 0.);
  float gband = exp(-max(h+.01,0.)*9.) * smoothstep(-.06,.02,h);
  col += vec3(.20,.085,.03) * pow(az, 6.) * gband * uGlow * (.75 + .5*v);
  col += vec3(.05,.022,.01) * pow(az, 2.) * exp(-max(h,0.)*3.5) * smoothstep(-.1,.05,h) * uGlow * v;
  col += vec3(.02,.02,.025) * pow(max(dot(d, normalize(uSun)),0.), 14.) * (1.-uStorm*.5);
  col *= smoothstep(-.2, .0, h) * .85 + .15;
  gl_FragColor = vec4(col, 1.);
}`;

function flameSprite() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(.2, 'rgba(255,170,80,.7)'); g.addColorStop(.5, 'rgba(200,80,20,.18)'); g.addColorStop(1, 'rgba(120,30,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
function vGradTex(stops) { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); stops.forEach(([o, s]) => g.addColorStop(o, s)); x.fillStyle = g; x.fillRect(0, 0, 4, 256); return new THREE.CanvasTexture(c); }

// Babylon's walls as dark silhouettes far behind the statue: curtain wall, towers, a gate, the Etemenanki ziggurat.
function babylonWalls() {
  const gs = [];
  const box = (w, h, d, x, y, z, ry = 0) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(0, h / 2, 0); b.rotateY(ry); b.translate(x, y, z); gs.push(b); };
  const R = 980, A0 = -.55, A1 = .55;
  // v10: the curtain wall follows a path: the long arc behind the statue, then at each end it turns the corner
  // gradually and runs off into the distance (no abrupt end); the far run sinks a little lower as it recedes.
  const STEP = R * .0105, path = [];
  for (let a = A0; a < A1; a += .0105) path.push({ x: Math.sin(a) * R, z: -Math.cos(a) * R, hx: Math.cos(a), hz: Math.sin(a), k: 0 });
  for (const side of [-1, 1]) {
    const e = side > 0 ? path[path.length - 1] : path[0]; let x = e.x, z = e.z, h = Math.atan2(side > 0 ? e.hz : -e.hz, side > 0 ? e.hx : -e.hx);
    const goal = side > 0 ? -Math.PI / 2 : Math.PI * 1.5; // heading straight away from the viewer (-z)
    for (let i = 1; i <= 70; i++) {
      const turn = Math.min(1, i / 36); h += (goal - h) * .055 * (1 + turn); const hx = Math.cos(h), hz = Math.sin(h); x += hx * STEP; z += hz * STEP;
      const seg = { x, z, hx: side > 0 ? hx : -hx, hz: side > 0 ? hz : -hz, k: i / 70 }; if (side > 0) path.push(seg); else path.unshift(seg);
    }
  }
  path.forEach((p, i) => {
    const ry = Math.atan2(-p.hz, p.hx), tower = i % 6 === 0, H = (34 + Math.sin(i * .08) * 3) * (1 - p.k * .28);
    const nx = -p.hz, nz = p.hx; box(STEP * 1.12, H, 18, p.x, 0, p.z, ry);
    for (let k = -1; k <= 1; k += 2) box(3.2, 4.5, 18, p.x + p.hx * k * 3, H, p.z + p.hz * k * 3, ry);
    if (tower) { box(18, H + 18 * (1 - p.k * .3), 26, p.x, 0, p.z, ry); for (let k = -1; k <= 1; k++) box(4, 5, 26, p.x + p.hx * k * 6, H + 18 * (1 - p.k * .3), p.z + p.hz * k * 6, ry); }
  });
  // gate towers flanking a passage slightly right of centre
  const ga = .09, gx = Math.sin(ga) * (R - 8), gz = -Math.cos(ga) * (R - 8);
  for (const k of [-1, 1]) box(22, 66, 30, gx + k * 20, 0, gz, -ga);
  // Etemenanki rising behind the walls
  [[150, 26], [118, 22], [90, 20], [64, 18], [44, 16], [30, 14], [20, 14]].reduce((y, [w, h]) => { box(w, h, w, -150, y, -R - 210, 0); return y + h; }, 0);
  // inner city blocks
  for (let i = 0; i < 70; i++) { const a = (rnd() - .5) * 1.0, r = R + 40 + rnd() * 260; box(20 + rnd() * 40, 12 + rnd() * 30, 20 + rnd() * 40, Math.sin(a) * r, 0, -Math.cos(a) * r, -a); }
  const geo = mergeGeometries(gs);
  const pa = geo.attributes.position, col = new Float32Array(pa.count * 3);
  for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), x = pa.getX(i), z = pa.getZ(i); const az = Math.pow(Math.max(0, -z / Math.hypot(x, z)), 6); const k = (1 - THREE.MathUtils.smoothstep(y, 0, 22)) * az; col.set([.004 + .15 * k, .003 + .064 * k, .002 + .022 * k], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
}

export function createWorld(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x040302, .0027); scene.background = new THREE.Color(0x030202);
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .5, 6000);
  camera.position.set(0, 4, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 60, 0); controls.enableDamping = true; controls.dampingFactor = .06;
  controls.maxPolarAngle = Math.PI * .7; controls.minPolarAngle = .05; controls.minDistance = 25; controls.maxDistance = 650; controls.update();

  const skyMat = new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTime: { value: 0 }, uSun: { value: SUN_DIR }, uStorm: { value: 1 }, uGlowDir: { value: BABYLON_DIR }, uGlow: { value: 1 } } });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 128, 96), skyMat); sky.renderOrder = -10; scene.add(sky);

  // environment for the metals: dark void, a warm fire card low behind, a soft key card front-left
  const pmrem = new THREE.PMREMGenerator(renderer); const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 64, 32), skyMat));
  const card = (w, h, col, p) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col })); m.position.set(...p); m.lookAt(0, 0, 0); envScene.add(m); };
  card(50, 25, new THREE.Color(1.0, .78, .55), [-40, 60, 50]); card(120, 10, new THREE.Color(.9, .38, .12), [0, 4, -90]); card(30, 12, new THREE.Color(.8, .4, .15), [70, 5, 40]);
  const envMap = pmrem.fromScene(envScene, .02).texture;

  // lights: one warm key spotlight; everything else recedes; braziers and a city glow add fire light
  const hemi = new THREE.HemisphereLight(0x3a3440, 0x0a0706, .18); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0x8070a0, .18); sun.position.copy(SUN_DIR).multiplyScalar(300); scene.add(sun);
  const key = new THREE.SpotLight(0xffd8aa, 10, 0, THREE.MathUtils.degToRad(17), .6, 0); key.position.set(-95, 240, 175); key.target.position.set(0, 52, 0); scene.add(key.target);
  key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -.00012; key.shadow.normalBias = .04; key.shadow.radius = 6; key.shadow.camera.near = 80; key.shadow.camera.far = 600; scene.add(key);
  // v11h: exploded-view head light: a soft warm spot from high in front, faded in only while the sections are apart
  const topKey = new THREE.SpotLight(0xffe2b8, 0, 0, THREE.MathUtils.degToRad(13), .85, 0); topKey.position.set(-40, 330, 150); topKey.target.position.set(0, 150, 6); scene.add(topKey, topKey.target);
  const rim = new THREE.DirectionalLight(0xff8a40, .9); rim.position.set(120, 40, -200); scene.add(rim);           // city fire rim from behind
  const rim2 = new THREE.DirectionalLight(0x6c6a90, .35); rim2.position.set(-150, 40, -100); scene.add(rim2);
  const impact = new THREE.PointLight(0xffd090, 0, 300, 1.5); impact.position.set(0, 10, 15); scene.add(impact);

  // ground: dark earth that sinks into the fog
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2350, 96), new THREE.MeshStandardMaterial({ ...groundMaps(), roughness: 1, color: 0x15100c }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.02; ground.receiveShadow = true; scene.add(ground);
  // no horizon: far ground melts into the same warm haze the sky has behind Babylon, so ground and sky never meet in a line
  const glowU = { uGlowI: { value: 1 } };
  ground.material.onBeforeCompile = sh => {
    sh.uniforms.uGlowI = glowU.uGlowI;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uGlowI;').replace('#include <dithering_fragment>', `#include <dithering_fragment>
      float gr = length(vWP.xz); float az = max(dot(vWP.xz / max(gr, 1.), vec2(0., -1.)), 0.);
      float haze = smoothstep(420., 1100., gr);
      gl_FragColor.rgb += vec3(.20,.085,.03) * .8 * pow(az, 6.) * haze * haze * uGlowI + vec3(.05,.022,.01) * pow(az, 2.) * haze * .6 * uGlowI;`);
  };

  // carved platform under the colossus: flagstones on a low stepped plinth, edges broken into fragments
  const pv = pavingMaps(); const pavMat = new THREE.MeshStandardMaterial({ ...pv, roughness: .9, color: 0x5e5048, envMap, envMapIntensity: .15 });
  const plat = new THREE.Group(); scene.add(plat);
  // v6: a low ziggurat: three steps up on all sides, the image stands on the top terrace
  const stepMat = new THREE.MeshStandardMaterial({ ...pavingMaps(), roughness: .95, color: 0x3a2e25, envMap, envMapIntensity: .1 });
  [stepMat.map, stepMat.normalMap, stepMat.roughnessMap].forEach(t => { if (t) { t.repeat.set(5, 3.4); } });
  const TIERS = [[176, 116, 0], [160, 104, .8], [144, 92, 1.6]]; // width, depth, base y; each step .8 high
  TIERS.forEach(([w, dd, y], i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, .8, dd), i === 2 ? pavMat : stepMat); m.position.set(0, y + .4, -22); m.receiveShadow = true; m.castShadow = i > 0; plat.add(m);
    // dark rebate under each step lip
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w + .4, .12, dd + .4), new THREE.MeshBasicMaterial({ color: 0x050302 })); lip.position.set(0, y + .06, -22); plat.add(lip); });
  [pv.map, pv.normalMap, pv.roughnessMap].forEach(t => t.repeat.set(3, 2));
  const PLAT_TOP = 2.4;
  // fragments where the paving breaks up into the dark
  const frag = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), pavMat, 140); const d = new THREE.Object3D();
  for (let i = 0; i < 140; i++) {
    const side = rnd(); let x, z; if (side < .4) { x = (rnd() > .5 ? 1 : -1) * (82 + rnd() * 40 * rnd()); z = -70 + rnd() * 96; } else if (side < .75) { x = (rnd() - .5) * 200; z = -72 - rnd() * 40 * rnd(); } else { x = (rnd() > .5 ? 1 : -1) * (40 + rnd() * 120); z = 26 + rnd() * 4; }
    d.position.set(x, .2 + rnd() * .3, z); d.scale.set(3 + rnd() * 9, .5 + rnd() * .8, 2 + rnd() * 6); d.rotation.set((rnd() - .5) * .15, rnd() * 3, (rnd() - .5) * .15); d.updateMatrix(); frag.setMatrixAt(i, d.matrix);
  }
  frag.receiveShadow = frag.castShadow = true; plat.add(frag);
  // contact darkening under the statue
  const aoMat = new THREE.MeshBasicMaterial({ map: radialSprite('rgba(0,0,0,1)'), transparent: true, depthWrite: false, opacity: .9, color: 0x000000, polygonOffset: true, polygonOffsetFactor: -2 });
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), aoMat); ao.rotation.x = -Math.PI / 2; ao.position.set(0, PLAT_TOP + .05, 2); ao.scale.set(70, 46, 1); ao.renderOrder = 1; scene.add(ao);
  const ao2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), aoMat.clone()); ao2.material.opacity = .5; ao2.rotation.x = -Math.PI / 2; ao2.position.set(0, PLAT_TOP + .04, 0); ao2.scale.set(170, 130, 1); ao2.renderOrder = 1; scene.add(ao2);
  // rubble crumbling off the feet
  const rub = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 1, envMap, envMapIntensity: .25 }), 160);
  for (let i = 0; i < 160; i++) { const a = rnd() * 6.283, r = 4 + rnd() * 22 * rnd(); const side = i % 2 ? 8 : -8; d.position.set(side + Math.cos(a) * r, PLAT_TOP + .1, 3 + Math.sin(a) * r); const s = .25 + rnd() * .9; d.scale.set(s, s * .6, s); d.rotation.set(rnd() * 3, rnd() * 3, 0); d.updateMatrix(); rub.setMatrixAt(i, d.matrix); rub.setColorAt(i, new THREE.Color().setHSL(.06, .15 + rnd() * .1, .07 + rnd() * .07)); }
  rub.castShadow = rub.receiveShadow = true; scene.add(rub);

  // braziers flanking the statue: fire light on the feet and paving, ritual smoke
  const fires = []; const brazierLights = [];
  const bowlGeo = mergeGeometries([new THREE.CylinderGeometry(2.6, 1.2, 1.6, 16).translate(0, 5.6, 0), new THREE.CylinderGeometry(.35, .5, 5, 8).translate(0, 2.5, 0), new THREE.CylinderGeometry(1.6, 2, .5, 12).translate(0, .25, 0)]);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x4a3020, metalness: .8, roughness: .45, envMap, envMapIntensity: .6 });
  for (const [x, z] of [[-66, 19], [66, 19], [-66, -63], [66, -63]]) {
    const b = new THREE.Mesh(bowlGeo, bronze); b.position.set(x, PLAT_TOP, z); b.castShadow = true; scene.add(b);
    const f = createFire({ scale: .9, flames: 70, smoke: 50, embers: 30, smokeColor: 0x241c17, wind: .3 }); f.position.set(x, PLAT_TOP + 6.2, z); f.userData.set(1); scene.add(f); fires.push(f);
    const L = new THREE.PointLight(0xff8a3a, 0, 85, 1.8); L.position.set(x, PLAT_TOP + 9.8, z); scene.add(L); brazierLights.push(L);
  }
  brazierLights[0].castShadow = false;

  // Babylon in the distance: silhouettes, a soft glow from behind, torches and slow ritual smoke
  const walls = babylonWalls(); scene.add(walls);
  const gc = document.createElement('canvas'); gc.width = 256; gc.height = 128; const gx = gc.getContext('2d'); const gimg = gx.createImageData(256, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) { const u = x / 255, v = 1 - y / 127; const hz = Math.pow(Math.sin(Math.PI * u), 2.2) * (.75 + .25 * Math.sin(u * 19) * Math.sin(u * 7)); const vt = Math.exp(-Math.pow((v - .32) / .2, 2)) * Math.min(1, v / .1); const a = hz * vt; const i = (y * 256 + x) * 4; gimg.data[i] = 255; gimg.data[i + 1] = 130; gimg.data[i + 2] = 50; gimg.data[i + 3] = a * 255; }
  gx.putImageData(gimg, 0, 0); const glowTex = new THREE.CanvasTexture(gc);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: new THREE.Color(.42, .24, .12) });
  const glowGeo = new THREE.CylinderGeometry(1060, 1060, 260, 64, 1, true, Math.PI - .8, 1.6); glowGeo.translate(0, 70, 0);
  const cityGlow = new THREE.Mesh(glowGeo, glowMat); cityGlow.material.side = THREE.DoubleSide; cityGlow.renderOrder = -8; scene.add(cityGlow);
  // torches: flickering point sprites at many distances plus a few on the walls
  const TN = 110, tpos = new Float32Array(TN * 3), tph = new Float32Array(TN), tsz = new Float32Array(TN);
  for (let i = 0; i < TN; i++) {
    let x, y, z;
    if (i < 46) { const a = -.5 + rnd(); const r = 974; x = Math.sin(a * 1.05) * r; z = -Math.cos(a * 1.05) * r; y = 34 + rnd() * 16; }            // on the walls
    else if (i < 70) { const a = (rnd() - .5) * 1.0, r = 1040 + rnd() * 200; x = Math.sin(a) * r; z = -Math.cos(a) * r; y = 20 + rnd() * 60; }   // inside the city
    else { const a = (rnd() - .5) * 1.05, r = 1000 + rnd() * 340; x = Math.sin(a) * r; z = -Math.cos(a) * r; y = 8 + rnd() * 70; } // deeper in the city, at many distances
    tpos.set([x, y, z], i * 3); tph[i] = rnd() * 100; tsz[i] = (i < 70 ? 9 : 5) * (.7 + rnd() * .6);
  }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('ph', new THREE.BufferAttribute(tph, 1)); tg.setAttribute('sz', new THREE.BufferAttribute(tsz, 1));
  const torchMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uMap: { value: flameSprite() }, uPx: { value: innerHeight }, uFade: { value: 1 } },
    vertexShader: `attribute float ph, sz; uniform float uTime, uPx; varying float vF; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); float f = .9 + .06*sin(uTime*.9+ph) + .03*sin(uTime*2.3+ph*3.); vF = f; gl_PointSize = clamp(sz*uPx/-mv.z*f*1.6, 1.6, 26.); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uFade; varying float vF; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(c.rgb*vec3(1.6,1.,.6)*vF*1.4, c.a*uFade); }` });
  const torches = new THREE.Points(tg, torchMat); torches.frustumCulled = false; scene.add(torches);
  // wisps of incense smoke over the city and drifting past the camps
  const wisps = createPlume({ kind: 'wisp', count: 60, size: 220, height: 180, spread: 60, rate: .012, color: 0x2a1a12, area: [1400, 260], wind: .4 });
  wisps.position.set(0, 20, -1050); wisps.material.uniforms.uInt.value = .55; scene.add(wisps);
  const nearWisps = createPlume({ kind: 'wisp', count: 18, size: 60, height: 70, spread: 18, rate: .02, color: 0x1e1814, area: [260, 160], wind: .5 });
  nearWisps.position.set(0, 2, -120); nearWisps.material.uniforms.uInt.value = .4; scene.add(nearWisps);

  // god rays: very faint fan behind the head
  const rays = new THREE.Group(); rays.position.set(0, 112, 0).addScaledVector(SUN_DIR, 260); const rt = rayTexture();
  for (let i = 0; i < 10; i++) {
    const L = 500 + rnd() * 700, W = 20 + rnd() * 70; const g = new THREE.PlaneGeometry(W, L); g.translate(0, L / 2, 0);
    const m = new THREE.MeshBasicMaterial({ map: rt, transparent: true, opacity: .004 + rnd() * .01, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, color: new THREE.Color(1.2, .85, .55) });
    const p = new THREE.Mesh(g, m); p.rotation.z = Math.PI + (rnd() - .5) * 2.9; p.userData = { base: m.opacity, ph: rnd() * 6, sp: .2 + rnd() * .5 }; rays.add(p);
  }
  rays.visible = false; // v9: the fan's converging apex read as a pinch in the sky
  scene.add(rays);

  // drifting particles: half glowing embers, half dark ash
  const mk = (col, blend, size, op, DN) => {
    const pos = new Float32Array(DN * 3); for (let i = 0; i < DN; i++) { pos[i * 3] = (rnd() - .5) * 320; pos[i * 3 + 1] = rnd() * 150; pos[i * 3 + 2] = -100 + rnd() * 200; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, map: radialSprite(col, 32), transparent: true, opacity: op, depthWrite: false, blending: blend, color: 0xffffff })); scene.add(p); return p;
  };
  const embers = mk('rgba(255,190,120,1)', THREE.AdditiveBlending, .5, .3, 150);
  const ash = mk('rgba(6,4,3,1)', THREE.NormalBlending, .8, .8, 230);

  // post
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .3, .6, .9); composer.addPass(bloom); composer.addPass(new OutputPass());
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });

  const world = { renderer, scene, camera, controls, composer, bloom, envMap, impact, skyMat, rays, hemi, key, topKey, rim, fires, brazierLights, torches, PLAT_TOP, plat, ground: null, groundAt: null, mood: { level: 1 } };
  world.update = function (t, dt) {
    skyMat.uniforms.uTime.value = t; torchMat.uniforms.uTime.value = t; torchMat.uniforms.uPx.value = innerHeight;
    const gy = world.groundAt ? world.groundAt(camera.position.x, camera.position.z) : 0;
    if (camera.position.y < gy + 1.6) camera.position.y = gy + 1.6; // never below the ground or the map relief
    rays.quaternion.copy(camera.quaternion);
    rays.children.forEach(p => { if (p.userData.base) p.material.opacity = p.userData.base * (.85 + .15 * Math.sin(t * p.userData.sp * .4 + p.userData.ph)); });
    fires.forEach(f => f.userData.tick(t)); wisps.userData.tick(t); nearWisps.userData.tick(t);
    brazierLights.forEach((L, i) => (L.intensity = world.mood.level * 125 * (.95 + .04 * Math.sin(t * 1.7 + i * 2) + .015 * Math.sin(t * 4.1 + i))));
    for (const [p, sp] of [[embers, 1], [ash, .6]]) { const a = p.geometry.attributes.position.array, DN = a.length / 3; for (let i = 0; i < DN; i++) { a[i * 3] += dt * (1.5 + (i % 7) * .45) * sp; a[i * 3 + 1] += (Math.sin(t * .5 + i) * .4 + (sp < 1 ? -.35 : .25)) * dt; if (a[i * 3] > 160) a[i * 3] = -160; if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 150; if (a[i * 3 + 1] > 150) a[i * 3 + 1] = 0; } p.geometry.attributes.position.needsUpdate = true; }
  };
  return world;
}
