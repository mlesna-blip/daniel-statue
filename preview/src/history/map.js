import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createFire } from '../fire.js?v=20261028v15c';

// Map: real DEM relief (AWS Terrarium / SRTM+GEBCO), Natural Earth coasts & rivers,
// historical-basemaps territories as signed-distance fields that morph between keyframes.
// Rendered as a fired-clay relief with lapis-inlaid seas, fading into the dark at its edges (no frame).
export const MW = 300;                 // map width in world units (lon 10E..75E)
export const HS = 7.0;                 // vertical scale before peak compression (was 9; toned down)
export const HK = 1.25;                // peak compression: h' = HS*h/(1+HK*h) keeps relief readable but rounds the spikes
export const TOP = 2.0;                // y of sea level on the map
export const METAL = {                 // linear HDR-ish colours per statue metal
  gold: [1.0, .62, .2], silver: [.72, .82, 1.0], bronze: [.86, .42, .16], iron: [.42, .52, .66], clay: [.66, .3, .17], foe: [.85, .78, .7],
};
const SEC2METAL = { head: 'gold', chest: 'silver', belly: 'bronze', legs: 'iron', feet: 'clay' };
export { SEC2METAL };

const NOISE = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.07+vec2(1.7,9.2); a*=.5; } return v; }
// cellular: returns F2-F1 (small on cell edges -> cracks) and the cell's random id
vec2 cell(vec2 p){ vec2 i=floor(p), f=fract(p); float d1=8., d2=8., id=0.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(x,y); vec2 o=hash2(i+g); vec2 r=g+o-f; float d=dot(r,r); if(d<d1){ d2=d1; d1=d; id=hash(i+g); } else if(d<d2) d2=d; }
  return vec2(sqrt(d2)-sqrt(d1), id); }
`;
const vert = `
uniform sampler2D uH; uniform float uHS, uHK; uniform vec2 uTexel; varying vec2 vUv; varying vec3 vW; varying float vH, vEdge;
float hn(vec2 uv){ vec4 c = texture2D(uH, uv); return (c.r*255.*256. + c.g*255.)/65535. * 1.15 - .15; }
float hashv(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float nv(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hashv(i),hashv(i+vec2(1,0)),f.x), mix(hashv(i+vec2(0,1)),hashv(i+vec2(1,1)),f.x), f.y); }
void main(){
  vUv = uv; vec2 o = uTexel*1.6;
  float h = hn(uv)*.4 + (hn(uv+vec2(o.x,0.)) + hn(uv-vec2(o.x,0.)) + hn(uv+vec2(0.,o.y)) + hn(uv-vec2(0.,o.y)))*.15;   // soften peaks
  float hv = h > 0. ? uHS*h/(1.+uHK*h) : h*uHS*.6; vH = h;
  // crumbled, irregular fade at the map's edges: the relief sinks into the ground
  vec2 e2 = min(uv, 1.-uv) * vec2(1., 2.1);
  float ragged = (nv(uv*vec2(26.,13.))-.5)*.05 + (nv(uv*vec2(90.,45.))-.5)*.015;
  float e = smoothstep(.0, .085, min(e2.x, e2.y) + ragged); vEdge = e;
  vec3 p = position; p.y += hv; p.y = mix(-.3, p.y, smoothstep(0., .35, e));
  vec4 w = modelMatrix * vec4(p,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const frag = `
uniform sampler2D uN, uL, uTA, uTB; uniform float uMix, uTime, uClayA, uClayB, uReveal, uDim, uFree;
uniform vec3 uColA, uColB, uAmb; uniform vec2 uFocus; uniform float uFocusR; uniform vec2 uTexel;
uniform vec3 uFire; uniform float uFireI;
varying vec2 vUv; varying vec3 vW; varying float vH, vEdge;
${NOISE}
vec3 patchCol(vec3 col, float pid, float clay){ float h = hash(vec2(pid*7.13, 3.1)); return clay > .5 ? mix(vec3(.42,.52,.66), vec3(.66,.3,.17), step(.5, h)) : col; }
void main(){
  vec4 nn = texture2D(uN, vUv); vec2 nxz = (nn.rg*2.-1.)*.72; vec3 N = normalize(vec3(nxz.x, sqrt(max(1.-dot(nxz,nxz),.02)), nxz.y));
  float land = step(.5, nn.b);
  vec4 ln = texture2D(uL, vUv);
  vec2 q = vW.xz;
  // ---- fired clay surface detail: grain, kneaded mottling, cracks, pits; perturbs the normal
  float grain = fbm(q*3.1), mott = fbm(q*.21 + 4.), fine = noise(q*14.);
  vec2 ck = cell(q*.55 + vec2(fbm(q*.9)*1.3)); vec2 ck2 = cell(q*1.9 + 7.);
  float crack = (1.-smoothstep(.0, .045, ck.x)) * smoothstep(.35, .6, fbm(q*.12+2.)) + (1.-smoothstep(.0, .03, ck2.x))*.45*smoothstep(.45,.7,fbm(q*.3+9.));
  float pit = smoothstep(.93, .98, hash(floor(q*5.))) * smoothstep(.45, .1, length(fract(q*5.)-.5));
  vec2 g = vec2(fbm(q*3.1+vec2(.05,0.)) - grain, fbm(q*3.1+vec2(0.,.05)) - grain)*14.;
  N = normalize(N + vec3(g.x, 0., g.y)*.18*land + vec3((fine-.5)*.12, 0., (noise(q*14.+3.)-.5)*.12));
  // ---- lighting: low warm raking key from the north-west, faint cool fill, a pool of warm light where the story is
  vec3 L = normalize(vec3(-.55,.62,-.6)); float dif = max(dot(N,L),0.); float sh = pow(dif, 1.25);
  float d = distance(vW.xz, uFocus);
  float spot = smoothstep(uFocusR*1.6, uFocusR*.35, d);
  float foc = mix(uDim, 1.15, spot);
  vec3 clayA = vec3(.34,.235,.16), clayB = vec3(.20,.135,.09);
  vec3 alb = mix(clayB, clayA, smoothstep(.25,.75,mott)) * (.78 + .44*grain);
  alb *= 1. - crack*.75; alb *= 1. - pit*.6;
  // carved contour terraces on high ground, very faint
  float cont = 1. - smoothstep(.0, .07, abs(fract(vH*10.) - .5)*2. - .86);
  alb *= 1. - cont * .22 * smoothstep(.04, .15, vH);
  vec3 lightCol = vec3(1., .74, .5);
  vec3 col = land > .5 ? alb * (lightCol*(.03 + .62*sh) + vec3(.012,.014,.02)) : vec3(0.);
  // ---- seas: recessed lapis lazuli inlay, veined, with pyrite flecks
  if (land < .5) {
    float v = fbm(q*.35 + fbm(q*.8)*2.);
    vec3 lap = mix(vec3(.012,.03,.11), vec3(.04,.09,.27), smoothstep(.3,.8,v));
    lap += vec3(.18,.2,.25) * smoothstep(.62,.66,fbm(q*1.3+5.)) * .25;                    // calcite veins
    float fl = smoothstep(.985, 1., hash(floor(q*9.))) ;
    lap += vec3(1.,.75,.35) * fl * (.6 + .4*sin(uTime*2. + hash(floor(q*9.))*30.)) * .5;   // pyrite
    col = lap * (.22 + .55*sh) ;
    col += vec3(.05,.10,.22) * ln.g * .6;                                                  // coast lip
  }
  // carved coastline groove: dark line just inside the land
  col *= 1. - ln.g * land * .45;
  // rivers: inlaid lapis channels
  float riv = ln.r * land; col = mix(col, vec3(.05,.13,.42) * (.5 + .8*sh) + vec3(.6,.45,.2)*smoothstep(.985,1.,hash(floor(q*12.)))*.3, riv * .85);
  col *= foc;
  // ---- territories: SDF morph between keyframe A and B, molten-gold borders like the reference tablet
  vec4 a = texture2D(uTA, vUv), b = texture2D(uTB, vUv);
  float sdA = (a.r*255.-128.)*.5, sdB = (b.r*255.-128.)*.5;
  float sd = mix(sdA, sdB, uMix);
  float jitter = (noise(vUv*vec2(900.,420.) + uTime*.6) - .5) * .9;
  sd += jitter * smoothstep(0., 1., 1. - abs(uMix*2.-1.));
  sd += (fbm(q*1.7)-.5)*.9;                                                                 // ragged, hand-carved edge
  float inside = smoothstep(.6, -.6, sd);
  float pidA = a.b*255., pidB = b.b*255.;
  vec3 tcol = mix(patchCol(uColA, pidA, uClayA), patchCol(uColB, pidB, uClayB), uMix);
  float ib = mix(a.g, b.g, uMix) * 255. / 16.;
  float core = exp(-abs(sd)*1.5), halo = exp(-abs(sd)*.25);
  float flick = .8 + .2*noise(vUv*300. + uTime*1.5);
  float bfoc = mix(.45, 1., spot);
  col += tcol * alb * 1.1 * (.08 + .9*sh) * inside * land * foc;                        // metal leaf over the clay inside the empire
  col += tcol * crack * inside * land * .08 * flick * foc;                                  // light seeping through the cracks
  col += tcol * (core * 2.2 * flick + halo * .05) * max(land, .4) * bfoc;
  col += tcol * exp(-ib*1.4) * inside * .45 * bfoc;
  // fire glow on the terrain around a burning site
  float fd = distance(vW.xz, uFire.xz); col += vec3(1.,.42,.12) * uFireI * exp(-fd*fd*.02) * (.6 + .4*noise(vec2(uTime*6., 1.))) * (.4+.6*land);
  col += uAmb * .006 * land;
  col *= mix(1., .85, uFree);
  // fade into the surrounding darkness
  col *= smoothstep(.0, .9, vEdge) * uReveal;
  // v6: the clay dissolves into the dark outside the pool of light: radial mask warped by slow noise, no hard edge
  float R = uFocusR * mix(1.25, 2.0, uFree);
  float wob = (fbm(vW.xz*.03 + vec2(uTime*.01, 0.)) - .5) * R * .9 + (noise(vW.xz*.2) - .5) * R * .1;
  float alpha = 1. - smoothstep(R*.3, R, d + wob);
  // keep a soft tongue of map reaching back to the image's feet so the two stay connected
  float sb = distance(vW.xz, vec2(0., 30.)) + (fbm(vW.xz*.06) - .5) * 40.;
  alpha = max(alpha, (1. - smoothstep(20., 70., sb)) * .85);
  alpha *= smoothstep(.0, .5, vEdge);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function figureGeometry() {
  const body = new THREE.ConeGeometry(.13, .42, 5); body.translate(0, .21, 0);
  const head = new THREE.SphereGeometry(.075, 6, 4); head.translate(0, .48, 0);
  const spear = new THREE.BoxGeometry(.025, .75, .025); spear.translate(.12, .37, 0);
  const shield = new THREE.CylinderGeometry(.1, .1, .02, 8); shield.rotateZ(Math.PI / 2); shield.translate(-.12, .26, 0);
  return mergeGeometries([body, head, spear, shield]);
}
// Small carved clay models: stepped ziggurat, columned temple/palace, walled city with houses, battle cairn
function poiGeometry(type) {
  const g = [];
  const B = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y + h / 2, z); g.push(b); };
  B(1.9, .08, 1.9, 0, 0, 0); // carved plinth on the clay
  if (type === 'ziggurat') {
    [[1.5, .32], [1.12, .3], [.78, .28], [.46, .26], [.24, .2]].reduce((y, [w, h]) => (B(w, h, w, 0, y, 0), y + h), .08);
    B(.16, .9, .5, 0, .08, .88); // stair ramp
  } else if (type === 'temple' || type === 'palace') {
    B(1.3, .16, .9, 0, .08, 0);
    for (let i = 0; i < 6; i++) for (const z of [-.32, .32]) { const c = new THREE.CylinderGeometry(.04, .05, .5, 6); c.translate(-.55 + i * .22, .49, z); g.push(c); }
    B(1.36, .1, .94, 0, .74, 0);
    if (type === 'temple') { const p = new THREE.CylinderGeometry(0, .68, .26, 4, 1); p.rotateY(Math.PI / 4); p.scale(1, 1, .72); p.translate(0, .97, 0); g.push(p); }
    else { B(.5, .3, .5, 0, .84, 0); }
  } else if (type === 'battle') {
    for (const [x, z, s] of [[0, 0, .3], [.25, .1, .18], [-.2, .15, .2], [.05, -.25, .16]]) { const o = new THREE.DodecahedronGeometry(s, 0); o.translate(x, .08 + s * .7, z); g.push(o); }
    const st = new THREE.BoxGeometry(.06, .9, .06); st.translate(0, .5, 0); g.push(st); B(.34, .2, .02, .2, .75, 0); // standard
  } else {
    for (const [x, z, h] of [[0, 0, .5], [.32, .18, .34], [-.28, .22, .3], [.1, -.32, .4], [-.26, -.2, .28], [.35, -.2, .26]]) B(.26, h, .26, x, .08, z);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; B(.28, .28, .1, Math.cos(a) * .7, .08, Math.sin(a) * .7); }
  }
  return mergeGeometries(g.map(x => (x.index ? x.toNonIndexed() : x)));
}
function glowSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
async function loadImageData(url) {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, img.width, img.height);
}
const hsh = k => { const j = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return j - Math.floor(j); };

export async function createMap(world, opts = {}) {
  const [geo, pois, content] = await Promise.all(['data/geo.json', 'data/pois.json', 'data/events.json'].map(u => fetch(u).then(r => r.json())));
  const [L0, L1] = geo.lon, [B0, B1] = geo.lat, [HW, HH] = geo.hm; const MD = MW * HH / HW;
  const hd = await loadImageData('data/height.png');
  const tl = new THREE.TextureLoader();
  const load = (u, nearest) => new Promise(r => tl.load(u, t => { t.flipY = true; if (nearest) { t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; } else { t.anisotropy = 8; } r(t); }));
  const [tH, tN, tL] = await Promise.all([load('data/height.png', true), load('data/normal.png'), load('data/lines.png')]);
  const terrIds = Object.keys(geo.territories); const terr = {};
  await Promise.all(terrIds.map(async id => { terr[id] = await load(`data/terr_${id}.png`); }));

  const group = new THREE.Group(); group.name = 'historyMap';
  const local = (lon, lat) => new THREE.Vector3(((lon - L0) / (L1 - L0) - .5) * MW, 0, ((B1 - lat) / (B1 - B0) - .5) * MD);
  const raw = (x, y) => { x = Math.min(HW - 1, Math.max(0, x)); y = Math.min(HH - 1, Math.max(0, y)); const i = (y * HW + x) * 4; return (hd.data[i] * 256 + hd.data[i + 1]) / 65535 * 1.15 - .15; };
  const heightPx = (fx, fy) => { const x = Math.round(fx), y = Math.round(fy); const h = raw(x, y) * .4 + (raw(x + 2, y) + raw(x - 2, y) + raw(x, y + 2) + raw(x, y - 2)) * .15; return h > 0 ? HS * h / (1 + HK * h) : 0; };
  const heightAt = (lon, lat) => heightPx((lon - L0) / (L1 - L0) * HW, (B1 - lat) / (B1 - B0) * HH);
  const ll = (lon, lat, lift = 0) => { const p = local(lon, lat); p.y = TOP + heightAt(lon, lat) + lift; return p.add(group.position); };
  // the map lies at the colossus' feet: its north edge just in front of the statue, Babylon on the statue's axis
  const bab = local(44.42, 32.54); group.position.set(-bab.x, 0, 26 + MD / 2);
  // world-space ground height (map relief, platform), used to keep the camera above the surface
  const groundAt = (x, z) => {
    const u = (x - group.position.x) / MW + .5, v = (z - group.position.z) / MD + .5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return (Math.abs(x) < 89 && z > -80 && z < 36) ? 2.5 : 0;
    return TOP + heightPx(u * HW, v * HH);
  };
  world.groundAt = groundAt;

  const uniforms = {
    uH: { value: tH }, uN: { value: tN }, uL: { value: tL }, uTA: { value: terr.babylon }, uTB: { value: terr.babylon }, uHS: { value: HS }, uHK: { value: HK },
    uMix: { value: 0 }, uTime: { value: 0 }, uColA: { value: new THREE.Vector3(...METAL.gold) }, uColB: { value: new THREE.Vector3(...METAL.gold) }, uClayA: { value: 0 }, uClayB: { value: 0 },
    uAmb: { value: new THREE.Vector3(1, .7, .4) }, uFocus: { value: new THREE.Vector2() }, uFocusR: { value: 60 }, uDim: { value: .3 }, uReveal: { value: 1 }, uTexel: { value: new THREE.Vector2(1 / HW, 1 / HH) },
    uFree: { value: 0 }, uFire: { value: new THREE.Vector3() }, uFireI: { value: 0 },
  };
  const segX = opts.lite ? 511 : 1023, segZ = Math.round(segX * HH / HW);
  const pg = new THREE.PlaneGeometry(MW, MD, segX, segZ); pg.rotateX(-Math.PI / 2); pg.translate(0, TOP, 0);
  const terrain = new THREE.Mesh(pg, new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true }));
  terrain.frustumCulled = false; group.add(terrain);

  // POIs: carved clay models, a very soft pool of light under each, brighter when their event is on
  const sprite = glowSprite(); const poiObjs = {};
  const geoCache = {};
  const poolGeo = new THREE.PlaneGeometry(1, 1); poolGeo.rotateX(-Math.PI / 2);
  for (const p of pois) {
    const gg = geoCache[p.type] || (geoCache[p.type] = poiGeometry(p.type));
    const col = p.type === 'battle' ? new THREE.Color(1, .45, .2) : new THREE.Color(1, .72, .4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a6a50, roughness: .92, metalness: 0, emissive: col.clone(), emissiveIntensity: .03, flatShading: true });
    const m = new THREE.Mesh(gg, mat); const pos = ll(p.lon, p.lat).sub(group.position); m.position.copy(pos); m.scale.setScalar(p.major ? 1.7 : 1.2); m.rotation.y = hsh(p.lon) * .6 - .3; group.add(m);
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: sprite, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .05 }));
    pool.position.copy(pos).add(new THREE.Vector3(0, .25, 0)); pool.scale.setScalar(7); group.add(pool);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    halo.position.copy(pos).add(new THREE.Vector3(0, 1.4, 0)); halo.scale.setScalar(4); group.add(halo);
    poiObjs[p.id] = { ...p, mesh: m, halo, pool, mat, base: col, act: 0, world: pos.clone().add(group.position) };
  }

  // armies: instanced lit figures + light trails
  const MAXA = 1400; const fig = figureGeometry();
  const armyMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true });
  const army = new THREE.InstancedMesh(fig, armyMat, MAXA); army.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  army.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXA * 3), 3); army.frustumCulled = false; army.count = 0; group.add(army);
  const events = content.events;
  const routes = [];
  events.forEach((ev, ei) => {
    routes[ei] = (ev.routes || []).map((r, ri) => {
      const pts = []; for (let k = 0; k < r.path.length - 1; k++) { const [a0, a1] = r.path[k], [b0, b1] = r.path[k + 1]; const A = local(a0, a1), B = local(b0, b1); const n = Math.max(2, Math.ceil(A.distanceTo(B) / .6)); for (let j = 0; j < n; j++) { const t = j / n; const lon = a0 + (b0 - a0) * t, lat = a1 + (b1 - a1) * t; const p = local(lon, lat); p.y = TOP + heightAt(lon, lat) + .12; pts.push(p); } }
      const [el, ea] = r.path[r.path.length - 1]; const e = local(el, ea); e.y = TOP + heightAt(el, ea) + .12; pts.push(e);
      for (let it = 0; it < 3; it++) for (let k = 1; k < pts.length - 1; k++) pts[k].y = Math.max(pts[k].y, (pts[k - 1].y + pts[k + 1].y) / 2);
      const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1]));
      const curve = new THREE.CatmullRomCurve3(pts.map(p => p.clone().setY(p.y + .25)), false, 'centripetal');
      const tseg = Math.min(1200, pts.length * 2); const tube = new THREE.TubeGeometry(curve, tseg, .09, 5, false);
      const col = new THREE.Color(...METAL[r.side]);
      const trail = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.1), transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false }));
      trail.userData.full = tube.index.count; trail.userData.tseg = tseg; trail.geometry.setDrawRange(0, 0); trail.visible = false; trail.frustumCulled = false; group.add(trail);
      // per-soldier personality: lateral slot, lag, cluster, pace
      const N = r.n, soldiers = [];
      let clusterLag = 0; for (let k = 0; k < N; k++) {
        if (k % (14 + ((hsh(k + ri * 31) * 16) | 0)) === 0) clusterLag += .6 + hsh(k * 3.1 + ei) * 1.6;      // gaps between loose bands
        const row = k / 6;
        soldiers.push({ lag: row * (.3 + hsh(k * 1.7 + ei) * .25) + clusterLag + hsh(k * 5.3) * .5, lat: (hsh(k * 2.9 + ri) - .5) * (1.4 + hsh(k * .37) * 1.2), pace: .9 + hsh(k * 7.7) * .25, ph: hsh(k * 4.1) * 6.28, w: .6 + hsh(k * 9.1) * .9 });
      }
      return { ...r, pts, cum, len: cum[cum.length - 1], col, trail, soldiers };
    });
  });
  // battle fire, smoke and embers; a second smoulder for lingering destruction
  const battleFire = createFire({ scale: 1.9, spread: 2.2, flames: 70, smoke: 70, embers: 60, smokeColor: 0x3e3024, wind: .5 }); battleFire.userData.set(0); group.add(battleFire);
  const fireRing = []; for (let k = 0; k < 4; k++) { const f = createFire({ scale: 1.3 + hsh(k) * .6, flames: 40, smoke: 26, embers: 14, smokeColor: 0x34281f }); f.userData.set(0); f.userData.off = new THREE.Vector3(Math.cos(k * 1.7) * (3 + k * 1.1), 0, Math.sin(k * 1.7) * (2.6 + k * .9)); group.add(f); fireRing.push(f); }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: new THREE.Color(1, .6, .3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  flash.scale.setScalar(1); group.add(flash);
  const flashLight = new THREE.PointLight(0xff8a3a, 0, 60, 1.6); group.add(flashLight);
  // soft warm light over the map so the carved models read

  world.scene.add(group);

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function along(r, s, out) {
    s = Math.max(0, Math.min(r.len, s)); let lo = 0, hi = r.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.cum[m] < s) lo = m; else hi = m; }
    const a = r.pts[lo], b = r.pts[hi]; const t = (s - r.cum[lo]) / Math.max(1e-6, r.cum[hi] - r.cum[lo]); out.lerpVectors(a, b, t); return Math.atan2(b.x - a.x, b.z - a.z);
  }
  let cnt = 0;
  function drawRoute(r, prog, fade, t, clash) {
    const head = prog * r.len;
    const tr = r.trail; tr.visible = prog > 0 && fade > .01; tr.material.opacity = .32 * fade;
    const segs = Math.floor(Math.min(1, head / r.len) * tr.userData.tseg); tr.geometry.setDrawRange(0, segs * 5 * 6);
    r.soldiers.forEach((so, k) => {
      if (cnt >= MAXA) return;
      let s = head * so.pace - so.lag + Math.sin(t * .8 + so.ph) * .12; if (prog >= 1) s = Math.min(s, r.len - so.lag * .25); if (s < 0) return;
      const ang = along(r, s, P); const wob = Math.sin(t * .5 + so.ph + s * .7) * .25 * so.w;
      const lat = so.lat + wob;
      P.x += Math.cos(ang) * lat; P.z -= Math.sin(ang) * lat;
      if (clash > 0) { P.x += Math.sin(k * 3.1 + t * 3) * clash * .45 * so.w; P.z += Math.cos(k * 2.3 + t * 2.6) * clash * .45 * so.w; }
      P.y += Math.abs(Math.sin(t * 9 * so.pace + so.ph)) * .05 * (prog < 1 ? 1 : .3);
      Q.setFromAxisAngle(up, ang + (hsh(k) - .5) * .6); S.setScalar((fade < 1 ? Math.max(.001, fade) : 1) * (.85 + so.w * .2)); M.compose(P, Q, S); army.setMatrixAt(cnt, M);
      const fl = 1.4 + .5 * Math.sin(t * 6 + k); army.instanceColor.setXYZ(cnt, r.col.r * fl, r.col.g * fl, r.col.b * fl); cnt++;
    });
  }
  let lastBattle = null;
  const api = {
    group, events, pois: poiObjs, local, ll, heightAt, groundAt, uniforms, MD, onBattle: null, quiet: false,
    update(s, t) {
      uniforms.uTime.value = t;
      const N = events.length; s = Math.max(0, Math.min(N - 1, s)); const i = Math.min(N - 2, Math.floor(s)); const f = s - i;
      const A = events[i], B = events[i + 1];
      const mf = THREE.MathUtils.smoothstep(f, .3, .95);
      uniforms.uTA.value = terr[A.territory]; uniforms.uTB.value = terr[B.territory]; uniforms.uMix.value = A.territory === B.territory ? 0 : mf;
      const ma = geo.territories[A.territory].metal, mb = geo.territories[B.territory].metal;
      uniforms.uColA.value.set(...METAL[ma]); uniforms.uColB.value.set(...METAL[mb]); uniforms.uClayA.value = ma === 'clay' ? 1 : 0; uniforms.uClayB.value = mb === 'clay' ? 1 : 0;
      cnt = 0; routes.flat().forEach(r => (r.trail.visible = false));
      const march = THREE.MathUtils.smoothstep(f, .02, .88);
      routes[i + 1].forEach(r => drawRoute(r, march, 1, t, Math.max(0, (f - .8) / .2)));
      const linger = 1 - THREE.MathUtils.smoothstep(f, .05, .35);
      if (linger > 0) routes[i].forEach(r => drawRoute(r, 1, linger, t, 1));
      army.count = cnt; army.instanceMatrix.needsUpdate = true; army.instanceColor.needsUpdate = true;
      // battle: a flash on arrival, then fire, smoke and embers that burn on while the event is current
      let fl = 0, burn = 0, site = null;
      if (B.battle && f > .74) { site = B.battle; fl = THREE.MathUtils.smoothstep(f, .78, .88) * (1 - THREE.MathUtils.smoothstep(f, .92, 1.0)); burn = THREE.MathUtils.smoothstep(f, .76, .9); }
      else if (A.battle && f < .45) { site = A.battle; burn = 1 - THREE.MathUtils.smoothstep(f, .2, .45); }
      if (site && events[site === B.battle && f > .74 ? i + 1 : i].fire === false) burn *= .0;
      if (api.quiet) { fl = 0; burn = 0; site = null; }
      if (site && poiObjs[site]) {
        const p = poiObjs[site].mesh.position; flash.position.set(p.x, p.y + 1.5, p.z); flashLight.position.set(p.x, p.y + 3, p.z);
        battleFire.position.set(p.x, p.y + .2, p.z); fireRing.forEach(fr => { fr.position.copy(p).add(fr.userData.off); fr.position.y = TOP + groundAt(fr.position.x + group.position.x, fr.position.z + group.position.z) - TOP + .1; });
        uniforms.uFire.value.set(p.x + group.position.x, 0, p.z + group.position.z);
        if (fl > .2 && lastBattle !== site + i) { lastBattle = site + i; api.onBattle && api.onBattle(site, B); }
      } else if (f < .5 && f > .3) lastBattle = null;
      const pulse = fl * (.85 + .15 * Math.sin(t * 13));
      flash.material.opacity = Math.min(1, pulse * .5); flash.scale.setScalar(3 + pulse * 11);
      flashLight.intensity = pulse * 140 + burn * (38 + 6 * Math.sin(t * 3) + 4 * Math.sin(t * 7));
      battleFire.userData.set(burn); fireRing.forEach((fr, k) => fr.userData.set(burn * (k < 2 ? .8 : .5))); battleFire.userData.set(burn * .8);
      battleFire.userData.tick(t); fireRing.forEach(fr => fr.userData.tick(t));
      uniforms.uFireI.value = burn * .12 + pulse * .2;
      // POI activation: carved models stay dark clay, warming softly when their event is on
      const cur = events[Math.round(s)]; const active = new Set(cur.pois || []);
      for (const id in poiObjs) { const o = poiObjs[id]; o.act += ((active.has(id) ? 1 : 0) - o.act) * .06; o.mat.emissiveIntensity = .035 + o.act * (.16 + .03 * Math.sin(t * 2 + id.length)); o.pool.material.opacity = .035 + o.act * .22; o.pool.scale.setScalar(6 + o.act * 4); o.halo.material.opacity = o.act * .1; }
      return { i, f, cur };
    },
  };
  return api;
}
