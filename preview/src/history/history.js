import * as THREE from 'three';
import { gsap } from 'gsap';
import { createMap } from './map.js';
import { createDrone } from './audio.js';

// Per-era mood: fog tint, ambient tint, key-light temperature. Everything stays dark and fire-lit.
const MOOD = {
  head:  { fog: 0x050302, hemi: 0x4a3a28, key: 0xffd09a, amb: [1, .7, .35] },
  chest: { fog: 0x030304, hemi: 0x3a4050, key: 0xe6e4f0, amb: [.6, .7, 1] },
  belly: { fog: 0x050302, hemi: 0x45382a, key: 0xffc488, amb: [.9, .55, .3] },
  legs:  { fog: 0x030304, hemi: 0x33383f, key: 0xd4d6e0, amb: [.5, .58, .7] },
  feet:  { fog: 0x040302, hemi: 0x3e322c, key: 0xe8b898, amb: [.8, .45, .3] },
};
const NORMAL_FOG = 0x040302;
const INTRO_CAM = { pos: new THREE.Vector3(0, 5, 215), target: new THREE.Vector3(0, 64, 0) };
const PART = { head: 'Head of Gold', chest: 'Chest & Arms of Silver', belly: 'Belly & Thighs of Bronze', legs: 'Legs of Iron', feet: 'Feet of Iron & Clay' };
const CONF = { high: 'Well attested', medium: 'Attested, date debated', debated: 'Debated' };

export async function createHistory({ world, statue, director, params }) {
  const map = await createMap(world, { lite: statue.lite });
  const evidence = await fetch('data/evidence.json').then(r => r.json()).catch(() => ({}));
  const { events } = map; const N = events.length;
  const { hemi, key } = world;
  const base = { hemiC: hemi.color.clone(), hemiI: hemi.intensity, keyC: key.color.clone(), keyI: key.intensity, keyA: key.angle, keyP: key.penumbra, keyTY: key.target.position.y };
  const HS = 1; // statue scale in history mode

  // ---- UI
  const $ = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const yearPos = i => i / (N - 1) * 100;
  const root = $(`<div id="hist">
    <header class="title"><div class="eyebrow">The Dream Interpreted · Daniel 2</div><h1>The Kingdoms of Men</h1><div class="sub">605 BC – AD 476</div></header>
    <nav class="h-modes"><button data-a="free">Free look</button><button data-a="exit" class="ghost">Back to the image</button></nav>
    <div class="h-ctrl"><button data-a="play" class="pp" title="Play (Space)" aria-label="Play"><svg viewBox="0 0 40 40"><circle class="ring" cx="20" cy="20" r="18.5"/><path class="i-play" d="M16 12.5 L28 20 L16 27.5Z"/><g class="i-pause"><rect x="14" y="12.5" width="4" height="15" rx="1"/><rect x="22" y="12.5" width="4" height="15" rx="1"/></g></svg></button><button data-a="sound" class="snd" title="Sound" aria-label="Sound"><svg viewBox="0 0 24 24"><path class="spk" d="M4 9h4l5-4v14l-5-4H4z"/><path class="wv" d="M16 8.5c1.6 1.9 1.6 5.1 0 7M18.6 6c2.9 3.4 2.9 8.6 0 12"/><path class="x" d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg></button><div class="pp-state">Paused</div></div>
    <article class="card"><div class="c-relief"><img alt=""></div><div class="c-in"><div class="c-era"></div><div class="c-date"></div><h2 class="c-title"></h2><div class="rule"></div><p class="c-body"></p><div class="c-verse"></div>
      <div class="c-actions"><button data-a="evidence" class="ev-btn">Evidence <span class="conf"></span></button></div></div></article>
    <aside class="evidence"><button data-a="evclose" class="ghost ev-x">Close <kbd>Esc</kbd></button><div class="e-eyebrow">Historical evidence</div><h3 class="e-title"></h3><div class="e-conf"></div><p class="e-sum"></p>
      <div class="e-h">Sources</div><ul class="e-src"></ul><div class="e-h">Accuracy & differing views</div><ul class="e-views"></ul></aside>
    <div class="labels"></div>
    <div class="h-year"><span class="y"></span><span class="t"></span></div>
    <footer class="h-timeline"><div class="track"><div class="fill"></div><div class="head"></div>${events.map((e, i) => `<button class="mark m-${e.metal}" data-i="${i}" style="left:${yearPos(i)}%"><span class="dot"></span><span class="lbl">${e.date.replace(' BC', '').replace('AD ', 'AD')}</span></button>`).join('')}</div>
      <input type="range" min="0" max="${N - 1}" step="0.001" value="0" aria-label="History timeline"></footer>
    </div>`);
  document.body.appendChild(root);
  const sheetBtn = document.createElement('button'); sheetBtn.id = 'ev-sheet-btn'; sheetBtn.className = 'clay-btn'; sheetBtn.innerHTML = '<b>Event</b>'; sheetBtn.title = 'Open event card';
  const strip = document.createElement('div'); strip.className = 'ev-strip'; strip.id = 'ev-strip';
  document.body.appendChild(sheetBtn); document.body.appendChild(strip);

  const cardEl = root.querySelector('.card');
  if (cardEl && !cardEl.querySelector('.c-x')) {
    const cx = document.createElement('button'); cx.className = 'c-x'; cx.type = 'button'; cx.textContent = '✕ Close';
    cardEl.appendChild(cx);
    const closeCard = () => { cardEl.classList.remove('on', 'sheet-on'); if (sheetBtn) sheetBtn.classList.remove('on'); };
    cx.addEventListener('click', e => { e.stopPropagation(); closeCard(); });
    document.addEventListener('pointerdown', e => {
      if (!cardEl.classList.contains('on') && !cardEl.classList.contains('sheet-on')) return;
      if (e.target.closest('.card, #ev-sheet-btn, .ev-btn, .h-timeline, .h-ctrl')) return;
      closeCard();
    });
  }
  sheetBtn.addEventListener('click', () => { const c = q('.card'); c.classList.add('sheet-on'); c.classList.add('on'); });
  // swipe/close: tap outside or Esc already handled; add a close on second tap of strip area
  root.addEventListener('click', e => { if (e.target.classList.contains('card') || e.target.closest('.card .c-in')) return; if (matchMedia('(max-width:600px)').matches) q('.card').classList.remove('sheet-on'); });
 const q = s => root.querySelector(s);
  { const NAMES = { head: 'Babylon', chest: 'Medo-Persia', belly: 'Greece', legs: 'Rome', feet: 'Divided' }; const spans = [];
    events.forEach((e, i) => { const l = spans[spans.length - 1]; if (l && l.m === e.metal) l.b = i; else spans.push({ m: e.metal, a: i, b: i }); });
    const bands = document.createElement('div'); bands.className = 'bands';
    spans.forEach((sp, k) => { const a = k ? (yearPos(sp.a) + yearPos(sp.a - 1)) / 2 : -1.5, b = k < spans.length - 1 ? (yearPos(sp.b) + yearPos(sp.b + 1)) / 2 : 101.5;
      const d = document.createElement('div'); d.className = 'band b-' + sp.m; d.dataset.m = sp.m; d.style.left = a + '%'; d.style.width = (b - a) + '%'; d.innerHTML = '<span></span>'; d.querySelector('span').textContent = NAMES[sp.m]; bands.appendChild(d); });
    q('.h-timeline').prepend(bands); }
  const labels = {}; for (const id in map.pois) { const el = document.createElement('div'); el.className = 'poi-l ' + map.pois[id].type + (map.pois[id].major ? ' major' : ''); el.textContent = map.pois[id].name; q('.labels').appendChild(el); labels[id] = el; }

  const yIdx = params.has('year') ? events.reduce((bi, e, i) => Math.abs(e.year - +params.get('year')) < Math.abs(events[bi].year - +params.get('year')) ? i : bi, 0) : null;
  const st = { s: params.has('s') ? +params.get('s') : (yIdx ?? 0), free: false, intro: 1, playing: false, active: false, pull: params.has('pull') ? +params.get('pull') : 0 };
  const range = q('input[type=range]');
  const setS = (v, fromUser) => { st.s = Math.max(0, Math.min(N - 1, v)); range.value = st.s; const p = yearPos(st.s) + '%'; q('.fill').style.width = p; q('.head').style.left = p; if (fromUser) { pause(); setFree(false); } };
  range.addEventListener('input', () => setS(+range.value, true));
  root.addEventListener('click', e => {
    const m = e.target.closest('.mark'); if (m) { pause(); setFree(false); gsap.to(st, { s: +m.dataset.i, duration: 2.4, ease: 'power2.inOut', onUpdate: () => setS(st.s) }); return; }
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'play') st.playing ? pause() : play();
    if (a === 'free') setFree(!st.free);
    if (a === 'sound') { const on = drone.toggle(); b.classList.toggle('on', on); b.title = on ? 'Sound on' : 'Sound off'; if (on) drone.setEra(events[Math.round(st.s)].metal); }
    if (a === 'evidence') openEvidence(curEv);
    if (a === 'evclose') closeEvidence();
    if (a === 'exit') exit();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && st.active) closeEvidence(); if (e.code === 'Space' && st.active && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); st.playing ? pause() : play(); } });
  let playTl = null, holdT = null;
  // v10: playback is event-driven. It glides to the next event, then holds there until the narration for that event has
  // finished (never cutting a voice off), then continues on its own. No extra presses needed.
  function play() {
    setFree(false); closeEvidence(); st.playing = true; root.classList.add('playing'); q('[data-a=play]').classList.add('on'); q('.pp-state').textContent = 'Playing'; q('[data-a=play]').title = 'Pause (Space)';
    if (st.s >= N - 1.001) { st.s = 0; setS(0); }
    const from = Math.floor(st.s + 1e-3);
    if (st.s - from > .001) playTl = gsap.to(st, { s: from + 1, duration: 6 * (1 - (st.s - from)), ease: 'none', onUpdate: () => setS(st.s), onComplete: () => dwell(true) });
    else dwell(!api.spokenAt || api.spokenAt !== Math.round(st.s));
  }
  function dwell(speakNow) {
    if (!st.playing) return; const idx = Math.round(st.s), t0 = performance.now(); let quietSince = 0;
    if (speakNow && api.onEvent) setTimeout(() => st.playing && Math.round(st.s) === idx && api.onEvent(idx), api.lastBattleAt && performance.now() - api.lastBattleAt < 2500 ? 1400 : 250);
    const chk = () => {
      if (!st.playing) return; const now = performance.now(), busy = api.narrBusy ? api.narrBusy() : false;
      if (busy) quietSince = 0; else if (!quietSince) quietSince = now;
      const minHold = api.narrOn && api.narrOn() ? 1800 : 3500;
      if (now - t0 > minHold && quietSince && now - quietSince > 900) next(); else holdT = setTimeout(chk, 150);
    };
    clearTimeout(holdT); holdT = setTimeout(chk, 400);
  }
  function next() {
    if (!st.playing) return; const i = Math.round(st.s); if (i >= N - 1) return pause();
    playTl = gsap.to(st, { s: i + 1, duration: 7.5, ease: 'sine.inOut', onUpdate: () => setS(st.s), onComplete: () => dwell(true) });
  }
  function pause() { st.playing = false; clearTimeout(holdT); root.classList.remove('playing'); if (playTl) playTl.kill(); playTl = null; const b = q('[data-a=play]'); b.classList.remove('on'); b.title = 'Play (Space)'; q('.pp-state').textContent = 'Paused'; }
  // free look: same dark mood, a slightly wider pool of light and a cooler, dimmer key so the switch is felt but nothing "lights up"
  function setFree(on) {
    st.free = on; world.controls.enabled = on; q('[data-a=free]').classList.toggle('on', on); root.classList.toggle('free', on);
    if (on) { pause(); world.controls.minDistance = 15; world.controls.maxDistance = 700; world.controls.maxPolarAngle = Math.PI * .49; }
    gsap.to(map.uniforms.uFree, { value: on ? 1 : 0, duration: 1.2 });
  }

  // ---- evidence panel
  const ev = q('.evidence');
  function openEvidence(idx) {
    const e = events[idx], x = evidence[String(e.year)]; if (!x) return;
    q('.e-title').textContent = `${e.date} · ${e.title}`; q('.e-conf').textContent = CONF[x.confidence] || x.confidence; q('.e-conf').dataset.c = x.confidence; q('.e-sum').textContent = x.summary;
    q('.e-src').innerHTML = ''; x.sources.forEach(s => { const li = document.createElement('li'); li.innerHTML = '<b></b><span></span>'; li.querySelector('b').textContent = s.name; li.querySelector('span').textContent = s.note; q('.e-src').appendChild(li); });
    q('.e-views').innerHTML = ''; (x.views || []).forEach(v => { const li = document.createElement('li'); li.textContent = v; q('.e-views').appendChild(li); });
    ev.classList.add('on'); pause();
  }
  function closeEvidence() { ev.classList.remove('on'); }

  const drone = createDrone();
  map.onBattle = (site, B) => { drone.battle(); api.lastBattleAt = performance.now(); api.onBattleSfx && api.onBattleSfx(site, B); };

  // ---- directed camera (lower pitch than v4 to sell the scale)
  const goalP = new THREE.Vector3(), goalT = new THREE.Vector3(), tmp = new THREE.Vector3();
  function directed(s) {
    const i = Math.min(N - 2, Math.floor(s)), f = s - i; const a = events[i].cam, b = events[i + 1].cam;
    const k = THREE.MathUtils.smootherstep(f, .0, 1);
    const far = THREE.MathUtils.lerp(a.dist, b.dist, k) * .92 + Math.sin(k * Math.PI) * Math.min(80, Math.hypot(a.lon - b.lon, a.lat - b.lat) * 4);
    const lon = THREE.MathUtils.lerp(a.lon, b.lon, k), lat = THREE.MathUtils.lerp(a.lat, b.lat, k);
    const pitch = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.pitch, b.pitch, k) * .8), yaw = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.yaw, b.yaw, k));
    const T = map.local(lon, lat).add(map.group.position); T.y = 3;
    goalT.copy(T); goalP.set(T.x + Math.sin(yaw) * Math.cos(pitch) * far, T.y + Math.sin(pitch) * far, T.z + Math.cos(yaw) * Math.cos(pitch) * far);
    return far;
  }

  let curEv = -1, activeSec = null; const card = q('.card');
  const hex = h => { const c = new THREE.Color(h); return { r: c.r, g: c.g, b: c.b }; };
  function showEvent(idx) {
    if (idx === curEv) return; const prevMetal = curEv >= 0 ? events[curEv].metal : null; curEv = idx; const e = events[idx];
    card.classList.remove('on'); card.classList.add('swap'); if (ev.classList.contains('on')) openEvidence(idx);
    setTimeout(() => {
      q('.c-era').textContent = `${e.era} · ${PART[e.metal]}`;
      q('.c-date').textContent = e.date; try { const st = document.getElementById('ev-strip'); if (st) st.textContent = (e.date || '') + ' · ' + (e.title || ''); } catch (er) {}; q('.c-title').textContent = e.title; const gl = api.guideLine && api.guideLine(idx); q('.c-body').textContent = gl ? gl.text : e.text; q('.c-body').dataset.who = gl ? gl.who : ''; q('.c-verse').textContent = e.verse;
      const img = q('.c-relief img'); img.src = `data/reliefs/relief_${String(idx).padStart(2, '0')}.jpg`; img.alt = `Relief: ${e.title}`;
      const x = evidence[String(e.year)]; q('.ev-btn').style.display = x ? '' : 'none'; q('.conf').textContent = x ? '· ' + (CONF[x.confidence] || '') : '';
      card.dataset.metal = e.metal; api.onCardFill && api.onCardFill(idx, card, e); void card.offsetWidth; card.classList.add('on');
      q('.h-year .y').textContent = e.date; q('.h-year .t').textContent = e.title; root.dataset.metal = e.metal;
    }, st.active ? 350 : 0);
    root.querySelectorAll('.mark').forEach((m, k) => { m.classList.toggle('on', k <= idx); m.classList.toggle('cur', k === idx); });
    // statue: the kingdom on the map glows, the other sections sink into shadow
    director.list.forEach(sec => gsap.to(sec.userData, { hl: sec.name === e.metal ? 1.4 : 0, dim: sec.name === e.metal ? 0 : 1, duration: 1.4, overwrite: 'auto' }));
    const m = MOOD[e.metal]; gsap.to(world.scene.fog.color, { ...hex(m.fog), duration: 2.5 });
    gsap.to(hemi.color, { ...hex(m.hemi), duration: 2.5 }); gsap.to(key.color, { ...hex(m.key), duration: 2.5 });
    gsap.to(map.uniforms.uAmb.value, { x: m.amb[0], y: m.amb[1], z: m.amb[2], duration: 2.5 });
    drone.setEra(e.metal); if (prevMetal === e.metal) drone.event(); if (api.onEvent && st.active && !st.playing) setTimeout(() => !st.playing && Math.round(st.s) === idx && api.onEvent(idx), 400);
    root.querySelectorAll('.band').forEach(b => b.classList.toggle('cur', b.dataset.m === e.metal));
    // v6: tight spotlight on the active section
    const sec = statue.sections[e.metal]; activeSec = sec;
    const cy = (sec.userData.home.y) * statue.root.scale.y + statue.root.position.y;
    gsap.to(key.target.position, { y: cy, duration: 2 }); gsap.to(key, { angle: THREE.MathUtils.degToRad(e.metal === 'legs' ? 9 : 7.5), penumbra: 1, duration: 2 });
    if (prevMetal !== e.metal) st.coT = performance.now();
    if (prevMetal && prevMetal !== e.metal && st.active && st.intro >= 1 && !st.free && !params.has('pull')) {
      gsap.killTweensOf(st, 'pull'); gsap.timeline().to(st, { pull: 1, duration: 1.8, ease: 'power2.inOut' }).to(st, { pull: 0, duration: 2.4, ease: 'power2.inOut' }, '+=1.6');
    }
  }

  function hideCaps(hide) { try { const st = window.__statue || statue; if (!st) return; st.root && st.root.traverse(o => { if (o.isMesh && /^cap_/.test(o.name || '')) { o.visible = !hide ? true : false; if (hide && o.material) { const m = o.material; if (m.color) m.color.setHex(0x140e0a); if ('emissive' in m) m.emissive.setHex(0x000000); if (m.userData && m.userData.capU && m.userData.capU.uGlow) m.userData.capU.uGlow.value.setRGB(0,0,0); m.envMapIntensity = 0; m.needsUpdate = true; } } }); } catch (e) {} }
  function enter(instant) { if (world.topKey) { gsap.killTweensOf(world.topKey); world.topKey.intensity = 0; }
    st.active = true; document.body.classList.add('history'); director.historyMode = true; director.ui.hidePanel(); root.classList.add('on'); hideCaps(true);
    curEv = -1; setFree(params.has('free') && instant); setS(st.s);
    gsap.to(hemi, { intensity: .16, duration: 1.5 }); gsap.to(key, { intensity: 7.5, duration: 1.5 });
    if (instant) statue.root.scale.setScalar(HS); else gsap.to(statue.root.scale, { x: HS, y: HS, z: HS, duration: 2.5, ease: 'power2.inOut' });
    if (!instant && !params.has('intro')) { st.intro = 0; world.camera.position.copy(INTRO_CAM.pos); world.controls.target.copy(INTRO_CAM.target); gsap.to(st, { intro: 1, duration: 6.5, ease: 'power2.inOut', delay: .8 }); }
    else if (params.has('intro')) { st.intro = +params.get('intro'); }
    else st.intro = 1;
    if (!params.has('nop') && !(params.has('static') && !params.has('autoplay'))) { gsap.delayedCall(st.intro >= 1 ? .6 : 7.4, () => { if (st.active && !st.playing && !st.free && !window.__presenter) play(); }); }
    if (st.free && params.has('free')) { world.camera.position.set(-150, 70, 330); world.controls.target.set(0, 10, 120); }
    else if (st.intro >= 1) { directed(st.s); world.camera.position.copy(goalP); world.controls.target.copy(goalT); }
  }
  function exit() {
    pause(); closeEvidence(); gsap.killTweensOf(st); st.active = false; st.intro = 1; document.body.classList.remove('history'); director.historyMode = false; root.classList.remove('on'); hideCaps(false); setFree(false); world.controls.enabled = true;
    director.list.forEach(sec => gsap.to(sec.userData, { hl: 0, dim: 0, duration: .8, overwrite: 'auto' })); director.assemble(); drone.mute();
    
    gsap.to(world.scene.fog.color, { ...hex(NORMAL_FOG), duration: 1.5 }); gsap.to(hemi.color, { ...hex(base.hemiC.getHex()), duration: 1.5 }); gsap.to(key.color, { ...hex(base.keyC.getHex()), duration: 1.5 });
    gsap.to(hemi, { intensity: base.hemiI, duration: 1.5 }); gsap.to(key, { intensity: base.keyI, angle: base.keyA, penumbra: base.keyP, duration: 1.5 }); gsap.to(key.target.position, { y: base.keyTY, duration: 1.5 });
    gsap.to(statue.root.scale, { x: 1, y: 1, z: 1, duration: 1.5 }); activeSec = null;
    director.ui.root.querySelectorAll('.modes button').forEach(b => b.classList.toggle('on', b.dataset.act === 'assembled'));
  }

  const P = new THREE.Vector3(), WIDE_P = new THREE.Vector3(), WIDE_T = new THREE.Vector3(); const bab = map.ll(44.42, 32.54);
  function update(t, dt) {
    // the map always lies at the statue's feet; outside history mode it rests dim, lit around Babylon
    map.quiet = !st.active; const r = map.update(st.s, t);
    if (!st.active) { map.uniforms.uFocus.value.set(bab.x, bab.z); map.uniforms.uFocusR.value = 60; map.uniforms.uDim.value = .16; return; }
    showEvent(Math.round(st.s));
    const far = directed(st.s);
    map.uniforms.uFocus.value.set(goalT.x, goalT.z);
    map.uniforms.uFocusR.value = far * (st.free ? .95 : .75); map.uniforms.uDim.value = st.free ? .2 : .14;
    if (!st.free) {
      if (st.intro < 1) { const k = st.intro; P.lerpVectors(INTRO_CAM.pos, goalP, k); P.y += Math.sin(k * Math.PI) * 30; tmp.lerpVectors(INTRO_CAM.target, goalT, k); world.camera.position.copy(P); world.controls.target.copy(tmp); }
      else {
        if (st.pull > 0) { const k = st.pull; const sy = activeSec ? activeSec.userData.home.y * statue.root.scale.y + statue.root.position.y : 36; WIDE_T.set(goalT.x * .5, sy * .55 + 4, goalT.z * .5); tmp.copy(goalP).sub(goalT).setY(0).normalize(); const span = Math.hypot(goalT.x, goalT.z); const D = Math.min(far * 1.05, 70 + span * .55 + sy * .6); WIDE_P.copy(WIDE_T).addScaledVector(tmp, D); WIDE_P.y = WIDE_T.y + D * .22; goalP.lerp(WIDE_P, k); goalT.lerp(WIDE_T, k); }
        const a = 1 - Math.exp(-dt * (st.pull > 0 ? 3 : 2.2)); world.camera.position.lerp(goalP, a); world.controls.target.lerp(goalT, a);
        if (params.has('pull')) { world.camera.position.copy(goalP); world.controls.target.copy(goalT); }
      }
    }
    // engraved labels: nearby places softly, active places clearly
    const w = innerWidth, h = innerHeight;
    for (const id in map.pois) {
      const o = map.pois[id], el = labels[id]; P.copy(o.world); P.y += 2.6; const dist = P.distanceTo(world.camera.position); P.project(world.camera);
      const near = dist < (st.free ? 170 : 120), vis = P.z < 1 && Math.abs(P.x) < 1.05 && Math.abs(P.y) < 1.05 && (o.act > .2 || near || o.major && dist < 220);
      el.style.opacity = vis ? Math.min(1, .38 + o.act * .62) : 0; el.classList.toggle('act', o.act > .5);
      if (vis) el.style.transform = `translate(${(P.x * .5 + .5) * w}px, ${(-P.y * .5 + .5) * h}px) translate(-50%, -100%)`;
    }
  }
  function canvasClick() { }
  // v12 presenter: eased jump to one event, no autoplay
  function goTo(i, instant) { pause(); setFree(false); gsap.killTweensOf(st, 's'); if (instant) setS(i); else gsap.to(st, { s: i, duration: Math.min(4, 1.6 + Math.abs(st.s - i) * .35), ease: 'power2.inOut', onUpdate: () => setS(st.s) }); }
  const api = { goTo, drone, enter, exit, update, map, st, canvasClick, pause, play, refreshCard: () => { const c = curEv; curEv = -1; if (c >= 0) showEvent(c); }, get active() { return st.active; }, get calloutSection() { return st.active ? activeSec : null; }, get calloutAlpha() { if (st.free || st.intro < 1) return 0; if (params.has('co')) return 1; const u = (performance.now() - (st.coT || -1e9)) / 1000; return u < .6 ? 0 : u < 1.4 ? (u - .6) / .8 : u < 4.6 ? 1 : Math.max(0, 1 - (u - 4.6) / 1.2); }, get metal() { return st.active && curEv >= 0 ? events[curEv].metal : null; }, events };
  return api;
}
