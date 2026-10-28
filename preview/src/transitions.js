import * as THREE from 'three';
import { gsap } from 'gsap';
import { SECTIONS, STONE, CAPTIONS } from './data.js?v=20261028v15b';
import { STATUE_FX } from './statueGLB.js?v=20261028v15b';

// Camera presets (position, orbit target). Tune the framing here.
export const CAMS = {
  hero: { pos: [0, 4, 80], target: [0, 60, 0] },
  exploded: { pos: [0, 4, 150], target: [0, 80, 0] },
  stone: { pos: [34, 5, 160], target: [0, 54, 0] },
  mountain: { pos: [0, 40, 560], target: [0, 150, 0] },
};
// How far each section lifts/leans in the exploded view.
const EXPLODE = { feet: [0, 0], legs: [7, 1.5], belly: [17, 3], chest: [29, 4.5], head: [43, 6] };

/** Small state machine: assembled | exploded | focus | stone. Everything animates with GSAP. */
export class Director {
  constructor(ctx) {
    Object.assign(this, ctx); // camera, controls, statue, mats, shards, stone, mountain, world, ui
    this.state = 'assembled'; this.base = 'assembled'; this.focused = null; this.toesOpen = false; this.tl = null;
    this.fx = { shatter: 0, mountain: 0, flash: 0, shake: 0, punch: 0 };
    this.list = SECTIONS.map(s => this.statue.sections[s.id]);
  }
  tw(target, vars, instant) { if (instant) { const { ease, duration, delay, ...rest } = vars; gsap.killTweensOf(target); gsap.set(target, rest); return null; } return gsap.to(target, { duration: 1.4, ease: 'power3.inOut', overwrite: 'auto', ...vars }); }
  camTo(p, instant, duration = 1.8) { const [x, y, z] = p.pos, [tx, ty, tz] = p.target; this.tw(this.camera.position, { x, y, z, duration }, instant); this.tw(this.controls.target, { x: tx, y: ty, z: tz, duration }, instant); }
  homeOf(sec, mode = this.base) { const h = sec.userData.home.clone(); if (mode === 'exploded') { const [dy, dz] = EXPLODE[sec.name]; h.y += dy; h.z += dz; } return h; }
  setOpacity(sec, v, instant) {
    sec.userData.mats.forEach(m => {
      if (v < 1 && !m.transparent) { m.transparent = true; m.needsUpdate = true; }
      const done = () => { if (v >= 1 && m.transparent) { m.transparent = false; m.needsUpdate = true; } };
      if (instant) { m.opacity = v; done(); } else gsap.to(m, { opacity: v, duration: .9, overwrite: 'auto', onComplete: done });
    });
  }
  arrange(mode, instant) {
    this.base = mode; this.state = mode;
    this.list.forEach((sec, i) => { const p = this.homeOf(sec, mode); this.tw(sec.position, { x: p.x, y: p.y, z: p.z, duration: 1.6, delay: instant ? 0 : (mode === 'exploded' ? i * .06 : (4 - i) * .05) }, instant); this.tw(sec.rotation, { y: 0 }, instant); this.setOpacity(sec, 1, instant); });
    this.tw(this.mats.seam, { opacity: 0, duration: 1.2 }, instant);
    this.camTo(mode === 'exploded' ? CAMS.exploded : CAMS.hero, instant);
    const bk = this.statue.backer; if (bk) { bk.visible = true; this.tw(bk.position, { z: mode === 'exploded' ? -6 : 0, duration: 1.6 }, instant); }  // v11o: the ziggurat backer stays put, easing back a touch
    // v11h: in Exploded the head rises ~43 units out of the key's cone: aim the key higher, widen it a touch and fade in a top light
    const W = this.world; if (W && W.key && !this.historyMode) { const ex = mode === 'exploded';
      this.tw(W.key.target.position, { y: ex ? 82 : 52, duration: 1.6 }, instant); this.tw(W.key, { angle: THREE.MathUtils.degToRad(ex ? 21 : 17), duration: 1.6 }, instant);
      if (W.topKey) this.tw(W.topKey, { intensity: ex ? 3.2 : 0, duration: 1.6 }, instant); }
    this.ui.setMode(mode); this.ui.hidePanel();
  }
  assemble(instant) { if (this.state === 'stone') return this.reset(instant); if (this.focused) this.unfocus(true); this.arrange('assembled', instant); }
  explode(instant) { if (this.state === 'stone') this.reset(true); if (this.focused) this.unfocus(true); this.arrange('exploded', instant); }

  focus(sec, instant) {
    if (this.state === 'stone') return;
    if (this.focused && this.focused !== sec) this.unfocus(true);
    this.state = 'focus'; this.focused = sec; this.controls.autoRotate = false;
    const cam = this.camera, home = this.homeOf(sec), r = sec.userData.radius;
    if (!this._camBack) this._camBack = { pos: cam.position.toArray(), target: this.controls.target.toArray() };
    // v6: the piece only steps a little forward out of the image, staying inside the key light's cone
    const toCam = cam.position.clone().sub(home).setY(0); if (toCam.lengthSq() < 1) toCam.set(0, 0, 1); toCam.normalize();
    const C = home.clone().addScaledVector(toCam, Math.min(24, r * .8)); C.y = THREE.MathUtils.clamp(home.y + 2, 16, 98);
    this.tw(sec.position, { x: C.x, y: C.y, z: C.z, duration: 1.5 }, instant);
    const dist = r / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2)) * 1.15 + 10;
    const side = new THREE.Vector3(-toCam.z, 0, toCam.x);
    const camP = C.clone().addScaledVector(toCam, dist).addScaledVector(side, -r * .35); camP.y = Math.max(6, C.y - dist * .12);
    this.camTo({ pos: camP.toArray(), target: [C.x - side.x * r * .3, C.y, C.z - side.z * r * .3] }, instant, 1.6);
    this.list.forEach(o => this.setOpacity(o, o === sec ? 1 : .55, instant));
    this.tw(this.mats.seam, { opacity: 0, duration: .6 }, instant);
    if (location.search.includes('debug')) console.log('FOCUS', sec.name, JSON.stringify(C), sec.userData.radius, JSON.stringify(sec.userData.home));
    this.ui.showPanel(sec.userData, { focus: true, toes: sec.name === 'feet' && sec.userData.toes.length > 0 }); this.ui.setMode('focus');
  }
  unfocus(instant) {
    const sec = this.focused; if (!sec) return; if (this.toesOpen) this.toggleToes(false, instant);
    const p = this.homeOf(sec); const ry = Math.round(sec.rotation.y / (Math.PI * 2)) * Math.PI * 2;
    this.tw(sec.position, { x: p.x, y: p.y, z: p.z, duration: 1.3 }, instant); this.tw(sec.rotation, { y: ry, duration: 1.3 }, instant);
    this.list.forEach(o => this.setOpacity(o, 1, instant));
    this.tw(this.mats.seam, { opacity: 0 }, instant);
    if (this._camBack && !this.historyMode) this.camTo({ pos: this._camBack.pos, target: this._camBack.target }, instant, 1.4); this._camBack = null;
    this.focused = null; this.state = this.base; this.ui.hidePanel(); this.ui.setMode(this.base);
  }
  // Ten toes sub-explode: toes fan out, and their iron and clay segments pull apart ("they shall not cleave one to another").
  toggleToes(open = !this.toesOpen, instant) {
    const feet = this.statue.sections.feet; this.toesOpen = open;
    feet.userData.toes.forEach(t => {
      const i = t.userData.index, h = t.userData.home;
      const p = open ? { x: (i - 4.5) * 3.4, y: h.y + 1 + Math.sin(i / 9 * Math.PI) * 2, z: h.z + 4 } : { x: h.x, y: h.y, z: h.z };
      this.tw(t.position, { ...p, duration: 1.2, delay: instant ? 0 : i * .04 }, instant); this.tw(t.rotation, { y: open ? 0 : t.userData.homeRotY, x: open ? -.25 : 0, duration: 1.2 }, instant);
      t.children.forEach(s => this.tw(s.position, { z: s.userData.homeZ + (open ? s.userData.k * .9 : 0), duration: 1, delay: instant ? 0 : .3 }, instant));
    });
    this.ui.setToes(open);
  }
  highlight(idx) {
    this.list.forEach((sec, i) => gsap.to(sec.userData, { hl: i === idx ? 1 : 0, dim: idx < 5 && i !== idx ? .85 : 0, duration: .6, overwrite: 'auto' }));
    if (this.state === 'focus') return;
    this.ui.showPanel(idx < 5 ? this.list[idx].userData : STONE, { focus: false, stone: idx === 5 });
  }

  playStone(seek = null) {
    this.reset(true, true);
    this.state = 'stone'; this.ui.setMode('stone'); this.ui.hidePanel(); this.controls.enabled = false; this.controls.autoRotate = false;
    const { stone, fx, camera, controls } = this; const sky = this.world.skyMat.uniforms.uStorm;
    stone.visible = true; stone.position.set(-80, 340, 150); stone.rotation.set(0, 0, 0); stone.scale.setScalar(1);
    const tl = gsap.timeline({ paused: seek !== null, onComplete: () => this.ui.setCaption(CAPTIONS[4][1], CAPTIONS[4][2]) }); this.tl = tl;
    const [cx, cy, cz] = CAMS.stone.pos, [mx, my, mz] = CAMS.mountain.pos;
    tl.to(camera.position, { x: cx, y: cy, z: cz, duration: 2.2, ease: 'power2.inOut' }, 0).to(controls.target, { x: 0, y: CAMS.stone.target[1], z: 0, duration: 2.2, ease: 'power2.inOut' }, 0);
    // v6 blow: the stone hangs and gathers light (anticipation), then drops hard, hits, recoils a little
    tl.to(stone.position, { x: -46, y: 190, z: 92, duration: 1.0, ease: 'sine.out' }, .4).to(stone.rotation, { x: 1.2, z: .6, duration: 1.6, ease: 'none' }, .4);
    tl.to(stone.material, { emissiveIntensity: .12, duration: 1.4, ease: 'sine.in' }, .4);
    tl.to(stone.position, { x: 0, y: 7.4, z: 15, duration: 1.6, ease: 'power4.in' }, 1.4).to(stone.rotation, { x: 6, z: 3.4, duration: 1.6, ease: 'power2.in' }, 1.4);
    tl.to(stone.position, { y: 9.5, z: 19, duration: .35, ease: 'power2.out' }, 3).to(stone.position, { y: 7.4, z: 20, duration: .5, ease: 'bounce.out' }, 3.35);
    tl.to(stone.material, { emissiveIntensity: .02, duration: 2 }, 3);
    tl.to(fx, { flash: 1, duration: .05 }, 3).to(fx, { flash: 0, duration: .9, ease: 'power3.out' }, 3.05);
    tl.to(fx, { shake: 1.6, duration: .02 }, 2.99).to(fx, { shake: 0, duration: 1.2, ease: 'expo.out' }, 3.01);
    tl.to(fx, { punch: 1, duration: .06 }, 3).to(fx, { punch: 0, duration: .8, ease: 'power2.out' }, 3.06);
    tl.to(fx, { shatter: 7.6, duration: 7.6, ease: 'none' }, 3);
    tl.to(camera.position, { z: cz + 20, y: cy + 6, duration: 5, ease: 'sine.inOut' }, 3.2);
    tl.to(fx, { mountain: 1, duration: 7.5, ease: 'sine.inOut' }, 8.2);
    tl.to(camera.position, { x: mx, y: my, z: mz, duration: 6.5, ease: 'power2.inOut' }, 8.6).to(controls.target, { x: 0, y: CAMS.mountain.target[1], z: 0, duration: 6.5, ease: 'power2.inOut' }, 8.6);
    tl.to(sky, { value: .3, duration: 6 }, 9);
    if (seek !== null) { tl.seek(seek); this.update(0, 0); }
    return tl;
  }
  reset(instant, keepUI) {
    if (this.tl) { this.tl.kill(); this.tl = null; }
    Object.assign(this.fx, { shatter: 0, mountain: 0, flash: 0, shake: 0, punch: 0 }); this.world.skyMat.uniforms.uStorm.value = 1;
    this.stone.visible = false; this.mountain.visible = false; this.controls.enabled = true;
    if (this.focused) this.unfocus(true); if (this.toesOpen) this.toggleToes(false, true);
    this.list.forEach(s => { s.visible = true; s.userData.hl = 0; s.userData.dim = 0; }); if (this.statue.backer) this.statue.backer.visible = true;
    this.state = 'assembled';
    if (!keepUI) { this.arrange('assembled', instant); this.ui.setCaption(''); this.ui.setScrub(0, false); }
    else { this.base = 'assembled'; this.list.forEach(sec => { sec.position.copy(sec.userData.home); sec.rotation.y = 0; this.setOpacity(sec, 1, true); }); this.mats.seam.opacity = 0; }
  }
  update(t, dt) {
    const { fx } = this;
    if (this.focused) this.focused.rotation.y += dt * .28;
    // idle drift: slow back-and-forth orbit when nobody touches the camera
    this.controls.autoRotate = !this.hold && !this.historyMode && !this.userActive && (this.state === 'assembled' || this.state === 'exploded') && !this.static;
    this.controls.autoRotateSpeed = .45 * Math.sin(t * .13);
    // highlight + dim: the active kingdom glows, the others sink into shadow
    let act = null, dimMax = 0; this.list.forEach(sec => { const u = sec.userData; dimMax = Math.max(dimMax, u.dim || 0); if (u.hl > .05 && (!act || u.hl > act.userData.hl)) act = sec; });
    if (act && dimMax > .001) { const wp = act.getWorldPosition(new THREE.Vector3()), sc = act.parent.scale.y, hh = act.userData.size.y * .5 * sc; STATUE_FX.uLo.value = wp.y - hh; STATUE_FX.uHi.value = wp.y + hh; const bd = act.userData.band; if (bd) { const by = act.parent.getWorldPosition(new THREE.Vector3()).y; STATUE_FX.uLo.value = by + bd[0] * sc; STATUE_FX.uHi.value = by + bd[1] * sc; } STATUE_FX.uDim.value = dimMax; }
    else STATUE_FX.uDim.value = 0;
    // v10: the silver section's raised hand reaches the crown's height; clamp its band so it lights with the silver
    { const ch = this.statue.sections.chest, bd = ch && ch.userData.band; if (bd) { const by = ch.parent.getWorldPosition(this._v || (this._v = new THREE.Vector3())).y, sc = ch.parent.scale.y, top = by + bd[1] * sc - 9 * sc + (ch.position.y - ch.userData.home.y) * sc; ch.userData.mats.forEach(m => { if (m.userData.fxU) m.userData.fxU.uYMax.value = top; }); } }
    { const hw = document.body.classList.contains('history') ? 1 : 0; this._hs = (this._hs || 0) + (hw - (this._hs || 0)) * Math.min(1, dt * 2); } const hs = this._hs; // v11 fb: softer, broader highlights in history mode
    this.list.forEach(sec => { const u = sec.userData; u.hv = (u.hv || 0) + ((u.hover || 0) - (u.hv || 0)) * Math.min(1, dt * 6); const e = (u.hl * .32 + u.hv * .3) * (1 - .4 * hs), dm = 1; u.mats.forEach(m => {
      if (!m.userData.c0) { m.userData.c0 = m.color.clone(); m.userData.e0 = m.envMapIntensity; m.userData.r0 = m.roughness; }
      if ('emissiveIntensity' in m) m.emissiveIntensity = e; m.color.copy(m.userData.c0).multiplyScalar(dm); m.envMapIntensity = m.userData.e0 * (.25 + .75 * dm) * (1 - .45 * hs); if (m.userData.r0 !== undefined) m.roughness = m.userData.r0 + .2 * hs; }); });
    if (this.state === 'stone') {
      this.shards.update(fx.shatter);
      this.list.forEach(sec => { sec.visible = !(fx.shatter > this.shards.delays[sec.name] + .03); });
      if (this.statue.backer) this.statue.backer.visible = !(fx.shatter > this.shards.delays.legs + .03);
      const m = fx.mountain; this.mountain.visible = m > 0; this.mountain.scale.set(460 * m + .001, 260 * m + .001, 460 * m + .001); this.mountain.position.set(0, -2, 13);
      this.mountain.scale.set(460 * m + .001, 260 * THREE.MathUtils.smoothstep(m, 0, .85) + .001, 460 * m + .001);
      this.stone.visible = m < .05; this.stone.scale.setScalar(1 + m * 10); this.debris && this.debris.update(fx.shatter);
      this.world.impact.intensity = fx.flash * 900; this.world.bloom.strength = .55 + fx.flash * 1.6 + m * .2;
      this.ui.setFlash(fx.flash);
      const time = this.tl ? this.tl.time() : 0; let cap = null; for (const c of CAPTIONS) if (time >= c[0]) cap = c;
      this.ui.setCaption(cap ? cap[1] : '', cap ? cap[2] : ''); this.ui.setScrub(5, true);
    } else { this.shards.update(0); this.debris && this.debris.update(0); this.world.bloom.strength = .55; this.ui.setFlash(0); }
  }
  preRender() { this._shake = null; if (this.fx.shake > 0) { this._shake = new THREE.Vector3((Math.random() - .5), (Math.random() - .5) * 1.4, (Math.random() - .5) * .5).multiplyScalar(this.fx.shake * 2.2); this.camera.position.add(this._shake); } if (this.fx.punch > 0) { this._fov = this.camera.fov; this.camera.fov -= this.fx.punch * 4; this.camera.updateProjectionMatrix(); } }
  postRender() { if (this._shake) this.camera.position.sub(this._shake); if (this._fov) { this.camera.fov = this._fov; this._fov = null; this.camera.updateProjectionMatrix(); } }
}
