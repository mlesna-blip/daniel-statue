import * as THREE from 'three';

// GPU particle plumes: fire (additive), ember (additive sparks), smoke / ash (normal blend), wisp (huge slow ritual smoke).
// Everything animates in the vertex shader from per-particle seeds, so updating is just uTime + uInt.
const vert = `
attribute float seed; attribute vec3 rnd;
uniform float uTime, uInt, uSize, uH, uSpread, uRate, uKind, uPx, uWind;
varying float vLife, vA, vR;
void main(){
  float rate = uRate * (.65 + .7*rnd.x);
  float life = fract(uTime*rate + seed); vLife = life; vR = rnd.y;
  vec3 p = position;
  float ang = rnd.z*6.2831 + uTime*(.4+rnd.x)*.6;
  float spread = uSpread * (uKind > 2.5 ? (.4 + life*1.8) : (uKind > 1.5 ? (.6 + life*1.4) : (uKind > .5 ? (.3 + life*2.2) : (1. - life*.55))));
  p.x += cos(ang)*spread*(rnd.y*.8+.2) + sin(uTime*.9+seed*20.)*.15*life*uSpread + uWind*life*life*uH*.35;
  p.z += sin(ang)*spread*(rnd.y*.8+.2);
  p.y += life*uH*(uKind > .5 && uKind < 1.5 ? (1.2+rnd.x) : 1.);
  vec4 mv = modelViewMatrix * vec4(p,1.);
  float s = uSize;
  if (uKind < .5) s *= (1.-life*.7)*(.7+.6*rnd.y);          // fire
  else if (uKind < 1.5) s *= .18*(.6+rnd.y);               // ember
  else if (uKind < 2.5) s *= (.6 + life*2.2);              // smoke/ash
  else s *= (.8 + life*2.8);                               // wisp
  float a = uKind < .5 ? pow(1.-life,1.3)*smoothstep(0.,.08,life) : (uKind < 1.5 ? (1.-life)*step(.55, fract(rnd.x*7.+uTime*3.)) : sin(3.1416*life)*sin(3.1416*life));
  vA = a * uInt;
  gl_PointSize = max(0., s * uPx / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const frag = `
uniform float uKind; uniform vec3 uColor; varying float vLife, vA, vR;
void main(){
  vec2 c = gl_PointCoord*2.-1.; float r = dot(c,c); if (r > 1.) discard;
  float soft = uKind > 1.5 ? pow(1.-r, 1.6) : pow(1.-r, 2.2);
  vec3 col;
  if (uKind < .5) col = .42*mix(vec3(2.4,1.4,.6), mix(vec3(2.2,.75,.18), vec3(.45,.08,.02), smoothstep(.35,1.,vLife)), smoothstep(.0,.4,vLife));
  else if (uKind < 1.5) col = vec3(2.,.9,.3);
  else col = uColor * (1. - vLife*.5);
  gl_FragColor = vec4(col, soft * vA * (uKind > 1.5 ? .4 : (uKind < .5 ? .16 : 1.)));
}`;
const KIND = { fire: 0, ember: 1, smoke: 2, wisp: 3 };
export function createPlume({ kind = 'fire', count = 120, size = 1, height = 4, spread = .6, rate = .6, color = 0x2a2420, opacity = 1, wind = 0, area = null }) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count), rnd = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    if (area) { pos[i * 3] = (Math.random() - .5) * area[0]; pos[i * 3 + 2] = (Math.random() - .5) * area[1]; }
    seed[i] = Math.random(); rnd[i * 3] = Math.random(); rnd[i * 3 + 1] = Math.random(); rnd[i * 3 + 2] = Math.random();
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 3));
  const additive = kind === 'fire' || kind === 'ember';
  const m = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uTime: { value: 0 }, uInt: { value: opacity }, uSize: { value: size }, uH: { value: height }, uSpread: { value: spread }, uRate: { value: rate }, uKind: { value: KIND[kind] }, uPx: { value: innerHeight * .9 }, uColor: { value: new THREE.Color(color) }, uWind: { value: wind } } });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = additive ? 5 : 4;
  pts.userData.tick = t => { m.uniforms.uTime.value = t; m.uniforms.uPx.value = innerHeight * .9; };
  return pts;
}
// A fire = flames + smoke + embers, with one shared intensity.
export function createFire(opts = {}) {
  const s = opts.scale || 1; const grp = new THREE.Group();
  const sp = opts.spread || 1;
  const fire = createPlume({ kind: 'fire', count: opts.flames || 90, size: 1.5 * s, height: 2.6 * s, spread: .55 * s * sp, rate: 1.1, area: sp > 1 ? [s * sp * .9, s * sp * .7] : null });
  const smoke = createPlume({ kind: 'smoke', count: opts.smoke || 60, size: 2.6 * s, height: 9 * s, spread: .9 * s * sp, rate: .16, color: opts.smokeColor || 0x1c1714, wind: opts.wind ?? .6 });
  const ember = createPlume({ kind: 'ember', count: opts.embers || 50, size: 1.2 * s, height: 6 * s, spread: 1.2 * s, rate: .35 });
  smoke.position.y = 1.2 * s; grp.add(smoke, fire, ember);
  grp.userData.parts = [fire, smoke, ember];
  grp.userData.set = v => { fire.material.uniforms.uInt.value = v; ember.material.uniforms.uInt.value = Math.min(1, v * 1.3); smoke.material.uniforms.uInt.value = Math.min(.85, v * .9); grp.visible = v > .003; };
  grp.userData.tick = t => grp.userData.parts.forEach(p => p.userData.tick(t));
  return grp;
}
