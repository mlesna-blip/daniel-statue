import { createPresenter } from './presenter.js';
import * as THREE from 'three';
import { createWorld } from './scene.js';
import { makeMaterials } from './statue.js';
import { loadStatue } from './statueGLB.js';
import { createStone, createMountain, createShards, createDebrisFX } from './effects.js';
import { createCallouts } from './callouts.js';
import { createGlyphs } from './glyphs.js';
import { createV7 } from './v7.js';
import { createBeasts } from './beasts.js';
import { createV8 } from './v8.js';
import { createV9 } from './v9.js';
import { createV10 } from './v10.js';
import { createV11, resumeAfterSwap } from './v11.js';
import { pickLang, installI18n } from './i18n.js';
import { createLoader } from './loader.js';
let beasts = null;
let v7 = null;
import { Director } from './transitions.js';
import { createUI } from './ui.js';
import { STATUE_FX } from './statueGLB.js'; window.STATUE_FX = STATUE_FX;
import { createHistory } from './history/history.js';

const params = new URLSearchParams(location.search);
// v10: language first (UI strings, narration text and recordings all follow it)
const LANG = pickLang(params); window.__LANG = LANG; try { if (params.has('lang')) localStorage.setItem('dan2-lang', LANG); } catch (e) { }
window.__NARR = await fetch(`data/narr/${LANG}.json`).then(r => r.json()).catch(() => null);
if (LANG !== 'en') { const dict = await fetch(`data/i18n/${LANG}.json`).then(r => r.ok ? r.json() : null).catch(() => null); if (dict) installI18n(dict); }
const world = createWorld(document.getElementById('app'));
const mats = makeMaterials(world.envMap);
const loader = createLoader(); // v11o: clay-tablet loading screen (mini after a statue swap)
const statue = await loadStatue(world.envMap, mats, f => loader.set(f * .9)); statue.root.position.y = world.PLAT_TOP - 1.2; world.scene.add(statue.root);
const stone = createStone(world.envMap), mountain = createMountain(world.envMap); world.scene.add(stone, mountain);
const shards = createShards(statue, world.scene);
const ui = createUI();
const debris = createDebrisFX(world.scene), callouts = createCallouts((b) => v7 && v7.openBeast(b)), glyphs = createGlyphs(world.scene, params.has('glyphs')); window.glyphs = glyphs;
const director = new Director({ debris, camera: world.camera, controls: world.controls, statue, mats, shards, stone, mountain, world, ui });
director.static = params.has('static');
window.director = director; // handy in devtools

ui.on('assembled', () => director.assemble());
ui.on('exploded', () => director.explode());
ui.on('stone', () => director.playStone());
ui.on('reset', () => director.reset());
const history = await createHistory({ world, statue, director, params }); window.history3d = history;
v7 = await createV7({ world, director, history, callouts, glyphs, statue, params }); window.v7 = v7;
createV8({ world, director, history, v7, params });
const v9 = createV9({ director, history, v7, params }); window.v9 = v9;
const v10 = await createV10({ world, director, history, v7, statue, params }); window.v10 = v10;
const v11 = createV11({ statue, director, history }); window.v11 = v11;
const presenter = createPresenter({ director, history, statue, v7 }); window.presenter = presenter;
if (params.has('present')) presenter.open(), params.get('present') && presenter.go(+params.get('present') - 1, params.has('static'));
ui.on('history', () => { director.reset(true); director.ui.setScrub(0, false); history.enter(); });
ui.on('back', () => director.unfocus());
ui.on('toes', () => director.toggleToes());
ui.on('scrub', i => { if (director.state !== 'stone') director.highlight(i); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !history.active) { if (director.state === 'focus') director.unfocus(); else if (director.state === 'stone') director.reset(); else ui.hidePanel(); } });

// picking
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let hovered = null, downAt = null;
function pick(e) {
  ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, world.camera);
  for (const h of ray.intersectObject(statue.root, true)) { if (h.object.userData.noPick || !h.object.visible) continue; let o = h.object; while (o && !o.userData.pivot) o = o.parent; if (!o) continue; if (director.focused && o !== director.focused) return null; return o; }
  return null;
}
const canvas = world.renderer.domElement;
canvas.addEventListener('pointermove', e => {
  if (history.active) return;
  if (director.state === 'stone') return ui.hover(null);
  const s = pick(e); if (hovered && hovered !== s) hovered.userData.hover = 0; hovered = s;
  const bh = !s && beasts ? beasts.pick(e) : null; window.__hoverBeast = bh;
  if (s) { s.userData.hover = 1; canvas.style.cursor = 'pointer'; } else { canvas.style.cursor = bh ? 'pointer' : ''; }
});
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; director.userActive = true; });
addEventListener('pointerup', e => {
  setTimeout(() => (director.userActive = false), 2500);
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5 || e.target !== canvas) return; downAt = null;
  if (v7 && v7.click(e)) return;
  if (beasts) { const bh = beasts.pick(e); if (bh) { v7.openBeast(bh); v10.focusBeast(bh); return; } }
  if (v10.click(e)) return;
  if (history.active) return;
  if (director.state === 'stone') return; const s = pick(e);
  if (s && s !== director.focused) director.focus(s); else if (!s && director.focused) director.unfocus();
});
canvas.addEventListener('wheel', () => { director.userActive = true; clearTimeout(director._wt); director._wt = setTimeout(() => (director.userActive = false), 2500); });

// URL test states: ?state=assembled|exploded|focus|toes|stone &section=head &t=6 &static
const st = params.get('state') || params.get('view');
if (st === 'exploded') director.explode(true);
if (st === 'focus' || st === 'toes') { const sec = statue.sections[params.get('section') || (st === 'toes' ? 'feet' : 'head')]; director.focus(sec, true); if (st === 'toes') director.toggleToes(true, true); }
if (st === 'stone') director.playStone(params.has('t') ? +params.get('t') : null);

if (params.get('mode') === 'history') history.enter(params.has('static'));
resumeAfterSwap({ director, history });
// v11o: statue fades in as the loading screen lifts
{ const fadeMats = new Set(); Object.values(statue.sections).forEach(sec => sec.userData.mats.forEach(m => fadeMats.add(m))); if (statue.backer) statue.backer.userData.mats.forEach(m => fadeMats.add(m));
  if (!params.has('static')) fadeMats.forEach(m => { m.userData.op0 = m.opacity; m.transparent = true; m.opacity = 0; m.needsUpdate = true; });
  loader.done(); if (!params.has('static')) { const t0 = performance.now() + 250, D = 1300;
    const step = () => { const k = Math.min(1, Math.max(0, (performance.now() - t0) / D)), e = k * k * (3 - 2 * k); fadeMats.forEach(m => (m.opacity = (m.userData.op0 ?? 1) * e)); if (k < 1) requestAnimationFrame(step); else fadeMats.forEach(m => { m.transparent = false; m.needsUpdate = true; }); }; requestAnimationFrame(step); } }
const clock = new THREE.Clock(); let t = 0;
world.renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05); t += dt;
  world.controls.update(); director.update(t, dt); history.update(t, dt); world.update(t, dt); v7 && v7.update(t); v9.update(t, dt); v10.update(t, dt);
  glyphs.update(t, dt, world.camera, director.state !== 'stone');
  const show = {}, opts = {}; let active = null;
  if (!history.active && director.state === 'exploded') { director.list.forEach(sec => (show[sec.name] = { sec, desc: true })); opts.succ = statue.sections; active = hovered && hovered.name; }
  else if (!history.active && director.state === 'assembled') { if (hovered) { show[hovered.name] = { sec: hovered, desc: true }; active = hovered.name; } }
  else if (history.active) { active = history.metal; if (history.calloutSection && history.calloutAlpha > .01) show[history.calloutSection.name] = { sec: history.calloutSection, alpha: history.calloutAlpha }; }
  else if (director.state === 'focus' && director.focused) active = director.focused.name;
  if (window.__hoverBeast && !history.active) active = beasts.secOf(window.__hoverBeast);
  if (v7 && v7.beastOpenSec) active = v7.beastOpenSec;
  callouts.update(world.camera, show, dt, opts);
  beasts && beasts.update(t, dt, active);
  director.preRender(); world.composer.render(); director.postRender();
  if (params.has('debug')) world.renderer.info.reset();
  if (!window.__ready && t > .3) { window.__ready = true; setTimeout(async () => { beasts = await createBeasts({ world, statue, history }); window.beasts = beasts; window.__beastsReady = true; }, params.has('static') ? 0 : 600); }
});
