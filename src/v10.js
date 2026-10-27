import * as THREE from 'three';
import { gsap } from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { LANGS } from './i18n.js';
// v10: corner controls everywhere (sound, narration dropdown, language), Bible readings for each view, recorded battle
// sound ducked under narration, primary sources and staged event cards, Quiz, Tales of Daniel (furnace, tree, den and the
// writing on the wall), and the camera turning to a beast when it is clicked.
const $ = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = {
  narr: '<svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg>',
  lang: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17"/></svg>',
  caret: '<svg class="cr" viewBox="0 0 10 10"><path d="M2 6.5 5 3.5 8 6.5"/></svg>',
  quiz: '<svg viewBox="0 0 24 24" class="qi"><path d="M9 9.2a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.9v.6"/><circle cx="12" cy="17.6" r=".9"/></svg>',
  tales: '<svg viewBox="0 0 24 24" class="qi"><path d="M5 4h10l4 4v12H5z"/><path d="M8 10h8M8 13.5h8M8 17h5"/></svg>',
};
const TALE_POS = { furnace: [-330, 0, -480], den: [380, 0, -580], tree: [430, 0, -660] }; // v12: Hunyuan furnace/tree come back closer; low-poly den stays far // v11 fb: pushed far back so the low-poly only reads as silhouettes
const TALE_AT = { 1: ['furnace', 'tree'], 2: ['wall', 'den'] };

export async function createV10({ world, director, history, v7, statue, params }) {
  if (params.has('static')) gsap.ticker.lagSmoothing(0); // headless test renders: let tweens run in real time
  const NR = window.__NARR, LANG = window.__LANG || 'en', narr = v7.narr, T = s => (window.__tr ? window.__tr(s) : s);
  const [SRC, QZ] = await Promise.all([fetch('data/sources.json').then(r => r.json()), fetch('data/quiz.json').then(r => r.json())]);
  const hist = document.getElementById('hist'), hctrl = hist.querySelector('.h-ctrl');
  const pauseHist = () => history.active && history.st.playing && history.pause();

  // ---------------------------------------------------------------- dropdowns + corner controls
  function dropdown(cls, icon, items, cur, pick, title) {
    const el = $(`<div class="dd ${cls}"><button class="dd-b clayc" title="${esc(title)}" aria-haspopup="listbox">${icon}<span class="dd-v"></span>${ICON.caret}</button><ul class="dd-m clayf" role="listbox"></ul></div>`);
    const b = el.querySelector('.dd-b'), m = el.querySelector('.dd-m');
    const render = () => { const c = cur(), it = items(); el.querySelector('.dd-v').textContent = (it.find(x => x[0] === c) || it[0])[2] || (it.find(x => x[0] === c) || it[0])[1]; m.innerHTML = it.map(([k, n]) => `<li role="option" data-k="${esc(k)}" class="${k === c ? 'on' : ''}">${esc(n)}</li>`).join(''); el.classList.toggle('off', c === 'off'); };
    b.addEventListener('click', e => { e.stopPropagation(); document.querySelectorAll('.dd.open').forEach(d => d !== el && d.classList.remove('open')); el.classList.toggle('open'); });
    m.addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; e.stopPropagation(); el.classList.remove('open'); pick(li.dataset.k); render(); });
    render(); el.render = render; return el;
  }
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.dd')) document.querySelectorAll('.dd.open').forEach(d => d.classList.remove('open')); });
  addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.dd.open').forEach(d => d.classList.remove('open')); });
  const short = { historian: NR?.names?.historian, daniel: NR?.names?.daniel, nebuchadnezzar: NR?.names?.nebuchadnezzar, bible: { en: 'KJV Bible', ru: 'Библия', es: 'Biblia' }[LANG], kids: NR?.names?.kids, off: { en: 'Off', ru: 'Выкл.', es: 'Apagado' }[LANG] };
  const narrDD = dropdown('dd-narr', ICON.narr, () => { const n = narr.names(); return [['off', n.off, short.off], ...narr.order.map(g => [g, n[g], short[g]])]; }, () => narr.choice, k => { narr.set(k); if (!history.active && k !== 'off') readView(true); }, T('Narration'));
  narr.onChange(() => narrDD.render());
  const langDD = dropdown('dd-lang', ICON.lang, () => Object.entries(LANGS).map(([k, n]) => [k, n, k.toUpperCase()]), () => LANG, k => {
    if (k === LANG) return; try { localStorage.setItem('dan2-lang', k); } catch (e) { }
    const u = new URL(location.href); u.searchParams.set('lang', k); if (history.active) { u.searchParams.set('mode', 'history'); u.searchParams.set('s', Math.round(history.st.s)); } location.href = u.toString();
  }, 'Language');
  const snd = hctrl.querySelector('.snd');
  const vctrl = $(`<div id="vctrl"></div>`); document.body.appendChild(vctrl);
  function placeCtrls() { const host = history.active ? hctrl : vctrl; narrDD.style.display = history.active ? '' : 'none'; if (snd.parentNode !== host) { host.appendChild(snd); host.appendChild(narrDD); host.appendChild(langDD); } }
  placeCtrls(); document.documentElement.lang = LANG;

  // ---------------------------------------------------------------- Bible reading in Assembled / Exploded / focus / Stone
  let viewKey = null, viewArmed = false; addEventListener('pointerdown', () => (viewArmed = true), { once: true, capture: true });
  const curView = () => director.state === 'focus' && director.focused ? director.focused.name : director.state === 'stone' ? 'stone' : director.base === 'exploded' || director.state === 'exploded' ? 'exploded' : 'assembled';
  function readView(force) { const k = curView(), x = NR && NR.bible.views[k]; if (!x || !narr.on) return; narr.speak(x.text, 'v-' + k, 'bible'); showVerse(x); viewKey = k; }
  const verseEl = $(`<div id="vverse" class="clayf"><div class="vv-ref"></div><div class="vv-t"></div></div>`); document.body.appendChild(verseEl);
  function showVerse(x) { return; /* v11 fb: no Bible text overlay in assembled/exploded, voiceover only */ if (director.state === 'stone') return; verseEl.querySelector('.vv-ref').textContent = x.ref; verseEl.querySelector('.vv-t').textContent = x.text; verseEl.classList.add('on'); clearTimeout(showVerse._t); showVerse._t = setTimeout(() => verseEl.classList.remove('on'), 9000 + x.text.length * 45); }

  // ---------------------------------------------------------------- recorded battle, ducked under the voice
  const battles = []; let bk = 0;
  history.onBattleSfx = () => { if (!window.__v9 || !window.__v9.on) return; const a = new Audio(`data/audio/battle_${bk++ % 2}.mp3`); a.volume = 0; a.play().catch(() => { }); a.v = 0; battles.push(a); a.onended = () => battles.splice(battles.indexOf(a), 1); };

  // ---------------------------------------------------------------- sources + staged cards + tale glints
  const srcPan = $(`<aside id="srcpan" class="clayf"><button class="ghost sp-x">Close <kbd>Esc</kbd></button><div class="sp-eyebrow">Primary sources</div><h3 class="sp-title"></h3><div class="sp-list"></div></aside>`); document.body.appendChild(srcPan);
  function openSources(idx) {
    const ids = SRC.events[String(idx)] || []; const e = history.events[idx]; srcPan.querySelector('.sp-title').textContent = `${e.date} · ${e.title}`;
    srcPan.querySelector('.sp-list').innerHTML = ids.map(id => { const x = SRC.items[id]; return `<figure class="sp-it"><img src="${x.img}" alt="${esc(x.name)}" loading="lazy"><figcaption><b>${esc(x.name)}</b><i>${esc(x.where)}</i><blockquote>${esc(x.quote)}</blockquote><p>${esc(x.note)}</p><div class="sp-links"><a href="${x.museum}" target="_blank" rel="noopener">${esc(T('Museum page'))} ↗</a><a href="${x.file}" target="_blank" rel="noopener" class="cr">${esc(x.credit)}</a></div></figcaption></figure>`; }).join('');
    srcPan.classList.add('on'); pauseHist();
  }
  srcPan.addEventListener('click', e => { if (e.target.closest('.sp-x')) srcPan.classList.remove('on'); });
  history.onCardFill = (idx, card) => {
    const acts = card.querySelector('.c-actions'); acts.querySelectorAll('.src-btn, .tale-chip').forEach(n => n.remove());
    if (SRC.events[String(idx)]) { const b = $(`<button class="ev-btn src-btn">${esc(T('Sources'))} <span class="conf">· ${SRC.events[String(idx)].length}</span></button>`); b.onclick = ev => { ev.stopPropagation(); openSources(idx); }; acts.appendChild(b); }
    (TALE_AT[idx] || []).forEach(k => { const t = NR.tales[k]; const c = $(`<button class="tale-chip" title="${esc(T('A tale of this time'))}"><i>✦</i>${esc(t.title)}</button>`); c.onclick = ev => { ev.stopPropagation(); openTale(k, true); }; acts.appendChild(c); });
    card.classList.remove('swap');
  };
  if (srcPan) history.refreshCard && history.refreshCard();

  // ---------------------------------------------------------------- tools stack: Codex, Tablet, Quiz, Tales
  const tools = document.getElementById('tools');
  const qBtn = $(`<button id="quiz-btn" class="clay-btn" title="Test what you know">${ICON.quiz}<b>Quiz</b><span><em>–</em></span></button>`);
  const tBtn = $(`<button id="tales-btn" class="clay-btn" title="Tales of Daniel">${ICON.tales}<b>Tales</b><span><em>0</em> / 4</span></button>`);
  tools.appendChild(qBtn); tools.appendChild(tBtn); tools.classList.add('v10');
  const share = document.getElementById('share'); if (share) tools.prepend(share);

  // ---------------------------------------------------------------- quiz
  const QK = 'dan2-quiz'; let best = +(localStorage.getItem(QK) || 0);
  const qz = $(`<div id="quiz"><div class="qz-tab clayf"><div class="qz-top"><span class="qz-h">${esc(T('Interpret the dream'))}</span><span class="qz-n"></span></div><div class="qz-ill"><img alt=""></div><h3 class="qz-q"></h3><div class="qz-a"></div><div class="qz-fb"><b></b><span class="qz-why"></span><i class="qz-ref"></i></div><div class="qz-nav"><button class="qz-next">Next</button><button class="ghost qz-x">Close <kbd>Esc</kbd></button></div></div></div>`); document.body.appendChild(qz);
  let order = [], qi = 0, score = 0, answered = false;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function renderBest() { qBtn.querySelector('span').innerHTML = best ? `<em>${best}</em> / ${QZ.length}` : `<em>–</em>`; }
  function startQuiz() { order = shuffle(QZ.map((_, i) => i)); qi = 0; score = 0; showQ(); qz.classList.add('on'); pauseHist(); }
  function showQ() {
    const x = QZ[order[qi]]; answered = false; qz.classList.remove('done', 'answered');
    qz.querySelector('.qz-n').textContent = `${qi + 1} / ${QZ.length}`; qz.querySelector('.qz-ill img').src = x.img; qz.querySelector('.qz-q').textContent = x.q;
    qz.querySelector('.qz-a').innerHTML = shuffle(x.a.map((t, i) => [t, i])).map(([t, i]) => `<button data-i="${i}">${esc(t)}</button>`).join('');
    qz.querySelector('.qz-next').textContent = T(qi < QZ.length - 1 ? 'Next' : 'See result');
  }
  qz.addEventListener('click', e => {
    const b = e.target.closest('.qz-a button'); const x = QZ[order[qi]];
    if (b && !answered) { answered = true; const ok = b.dataset.i === '0'; if (ok) score++; b.classList.add(ok ? 'ok' : 'no'); qz.querySelector('.qz-a [data-i="0"]').classList.add('ok'); qz.classList.add('answered');
      qz.querySelector('.qz-fb b').textContent = T(ok ? 'Correct.' : 'Not quite.'); qz.querySelector('.qz-why').textContent = x.why; qz.querySelector('.qz-ref').textContent = x.ref; }
    if (e.target.closest('.qz-next')) { if (!answered && !qz.classList.contains('done')) return; if (qz.classList.contains('done')) return startQuiz(); if (qi < QZ.length - 1) { qi++; showQ(); } else finish(); }
    if (e.target.closest('.qz-x') || e.target === qz) qz.classList.remove('on');
  });
  function finish() {
    qz.classList.add('done'); qz.classList.remove('answered'); try { if (localStorage.getItem('dan2-unlock-classic') !== '1') { localStorage.setItem('dan2-unlock-classic', '1'); dispatchEvent(new CustomEvent('dan2-unlock', { detail: 'classic' })); } } catch (e) { } best = Math.max(best, score); try { localStorage.setItem(QK, best); } catch (e) { } renderBest();
    qz.querySelector('.qz-n').textContent = ''; qz.querySelector('.qz-ill img').src = 'data/quiz/stone.webp'; qz.querySelector('.qz-q').textContent = `${score} / ${QZ.length}`;
    qz.querySelector('.qz-a').innerHTML = `<p class="qz-end">${esc(T('“The dream is certain, and the interpretation thereof sure.” Daniel 2:45'))}</p>`; qz.querySelector('.qz-next').textContent = T('Play again');
  }
  qBtn.onclick = () => startQuiz(); renderBest();

  // ---------------------------------------------------------------- Tales of Daniel: low-poly places near the wall
  const TK = 'dan2-tales'; let seen = new Set(); try { seen = new Set(JSON.parse(localStorage.getItem(TK) || '[]')); } catch (e) { }
  const renderTales = () => (tBtn.querySelector('span').innerHTML = `<em>${seen.size}</em> / 4`); renderTales();
  const fogless = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,200,130,1)'); g.addColorStop(.35, 'rgba(255,130,50,.45)'); g.addColorStop(1, 'rgba(120,40,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const glow = (s, o = .5) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o, fog: false })); m.scale.setScalar(s); m.userData.o = o; return m; };
  const brick = fogless(0x2a1d15), dark = fogless(0x120c09), stoneM = fogless(0x2c2621), bark = fogless(0x22170f, { flatShading: true }), leaf = fogless(0x1d2016, { flatShading: true }), barkLit = fogless(0x3a2818, { flatShading: true, emissive: 0x1c120a, fog: false }), leafLit = fogless(0x33402a, { flatShading: true, emissive: 0x2c3a18, fog: false }), bandM = new THREE.MeshStandardMaterial({ color: 0x6b5035, metalness: .8, roughness: .5, envMap: world.envMap, envMapIntensity: .5 });
  const TALES = {};
  function mk(k, g, focusY, glows) { g.position.set(...TALE_POS[k]); world.scene.add(g); g.traverse(o => { if (o.isMesh) { o.userData.tale = k; o.castShadow = false; o.receiveShadow = true; } }); TALES[k] = { g, focusY, glows, h: 0 }; }
  { // the furnace (Dan 3): stepped brick kiln with a domed top and a glowing mouth
    const g = new THREE.Group(); const base = new THREE.Mesh(new THREE.BoxGeometry(40, 5, 34), brick); base.position.y = 2.5; g.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(15, 17, 22, 9), brick); body.position.y = 16; g.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(15, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), brick); dome.position.y = 27; g.add(dome);
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 10, 6), brick); ch.position.set(4, 44, -3); g.add(ch);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(9, 11), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: .55, fog: false })); mouth.position.set(0, 10.5, 16.6); g.add(mouth); mouth.userData.flick = 1;
    const arch = new THREE.Mesh(new THREE.CircleGeometry(4.5, 10, 0, Math.PI), mouth.material); arch.position.set(0, 16, 16.6); g.add(arch);
    const gl = glow(34, .32); gl.position.set(0, 12, 20); g.add(gl); const gl2 = glow(14, .25); gl2.position.set(4, 51, -3); g.add(gl2);
    g.rotation.y = .45; mk('furnace', g, 18, [gl, gl2, mouth]);
  }
  { // the great tree (Dan 4): broad canopy, the stump bound with a band of iron and brass
    const g = new THREE.Group(); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 6.5, 40, 7), bark); trunk.position.y = 20; g.add(trunk);
    for (const [x, y, z, r] of [[0, 52, 0, 22], [-15, 44, 5, 15], [15, 46, -4, 16], [3, 64, -2, 14], [-6, 40, -12, 12], [10, 38, 12, 11]]) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leaf); c.position.set(x, y, z); c.rotation.set(x, y, z); c.scale.y = .72; g.add(c); }
    for (const y of [7, 9.2]) { const b = new THREE.Mesh(new THREE.TorusGeometry(6.1, .55, 6, 14), bandM); b.rotation.x = Math.PI / 2; b.position.y = y; g.add(b); }
    for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.6, 1.8, 14, 5), bark); const a = i / 5 * 6.28; r.position.set(Math.cos(a) * 6, 1.2, Math.sin(a) * 6); r.rotation.set(Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3); g.add(r); }
    const gl = glow(30, .18); gl.position.set(0, 9, 4); g.add(gl); const gc = glow(120, .2); gc.position.set(0, 50, 6); g.add(gc); const gc2 = glow(60, .16); gc2.position.set(0, 66, 4); g.add(gc2);
    g.traverse(o => { if (o.isMesh && o.material === leaf) o.material = leafLit; else if (o.isMesh && o.material === bark) o.material = barkLit; }); const tl = new THREE.PointLight(0xffc27a, 2.4, 240, 0); tl.position.set(0, 30, 60); g.add(tl); mk('tree', g, 34, [gl, gc, gc2]);
  }
  { // the lions' den (Dan 6): a stone-lined pit, a sealing stone, two pairs of eyes in the dark
    const g = new THREE.Group(); const pit = new THREE.Mesh(new THREE.CircleGeometry(13, 14), dark); pit.rotation.x = -Math.PI / 2; pit.position.y = .3; g.add(pit);
    const ring = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stoneM, 22); const d = new THREE.Object3D();
    for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283; d.position.set(Math.cos(a) * 15, 2 + (i % 3) * .4, Math.sin(a) * 15); d.rotation.set(0, -a, 0); d.scale.set(3.5, 4 + (i % 4) * .6, 5); d.updateMatrix(); ring.setMatrixAt(i, d.matrix); } g.add(ring);
    const seal = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 6), stoneM); seal.position.set(14, 4.4, 8); seal.rotation.y = .6; g.add(seal);
    const eyes = [];
    for (const [x, z] of [[-4, 2], [5, -3]]) for (const dx of [-.9, .9]) { const e = glow(2.2, .55); e.position.set(x + dx, 3.2, z); g.add(e); eyes.push(e); }
    const gl = glow(36, .12); gl.position.set(0, 4, 0); g.add(gl); mk('den', g, 6, [gl, ...eyes]); TALES.den.eyes = eyes;
  }
  { // the writing on the wall (Dan 5): faint Aramaic letters glowing on the curtain wall
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d'); x.fillStyle = 'rgba(255,190,120,1)'; x.shadowColor = 'rgba(255,120,40,1)'; x.shadowBlur = 24; x.font = '700 120px "Noto Serif Hebrew", "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText('מנא מנא תקל ופרסין', 512, 132);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const a = -.2, R = 960, p = new THREE.Mesh(new THREE.PlaneGeometry(96, 24), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); p.position.set(Math.sin(a) * R, 21, -Math.cos(a) * R); p.lookAt(0, 21, 0);
    const g = new THREE.Group(); g.add(p); world.scene.add(g); p.userData.tale = 'wall'; const gl = glow(70, .12); gl.position.copy(p.position).multiplyScalar(.985); g.add(gl);
    TALES.wall = { g, focusY: 21, glows: [gl], plate: p, h: 0, center: p.position.clone() };
  }
  for (const k of ['furnace', 'tree', 'den']) { TALES[k].center = TALES[k].g.position.clone(); TALES[k].center.y = TALES[k].focusY; }
  const pickables = []; for (const k in TALES) TALES[k].g.traverse(o => { if (o.isMesh && o.userData.tale) pickables.push(o); });
  // v12: Hunyuan GLBs for the furnace and the tree, loaded lazily (tales opened / list opened / camera drawn near / Babylon era in History).
  // The low-poly versions stay as stand-ins until each model arrives. Fog is thinned on them and warm emissive keeps them glowing in the dark.
  const HQ = { furnace: { f: 'tale_furnace', h: 50, rot: .5, emi: 0xff8a3a, ei: .16, fogK: .45 }, tree: { f: 'tale_tree', h: 86, rot: -.4, emi: 0xffc27a, ei: .3, fogK: .35 } };
  const hqLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); let hqStarted = false;
  function loadHQ() {
    if (hqStarted || new URLSearchParams(location.search).has('lowtales')) return; hqStarted = true;
    for (const k in HQ) { const o = HQ[k];
      hqLoader.loadAsync(`models/tales/${o.f}.glb`).then(gl => {
        const m = gl.scene, box = new THREE.Box3().setFromObject(m), sz = box.getSize(new THREE.Vector3()), sc = o.h / sz.y; m.scale.setScalar(sc);
        box.setFromObject(m); const c = box.getCenter(new THREE.Vector3()); m.position.set(-c.x, -box.min.y, -c.z);
        const piv = new THREE.Group(); piv.add(m); piv.rotation.y = o.rot - TALES[k].g.rotation.y;
        m.traverse(x => { if (!x.isMesh) return; x.userData.tale = k; x.castShadow = false; x.receiveShadow = true; pickables.push(x);
          const mt = x.material; mt.envMapIntensity = .25; mt.emissive = new THREE.Color(o.emi); mt.emissiveMap = mt.map; mt.emissiveIntensity = o.ei;
          mt.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG\n float fdK = fogDensity * ${o.fogK.toFixed(2)}; float fogFactor = 1.0 - exp( - fdK * fdK * vFogDepth * vFogDepth ); gl_FragColor.rgb = mix( gl_FragColor.rgb, mix( fogColor, vec3( .11, .06, .03 ), .7 ), fogFactor * .92 );\n#endif`); }; // thinner, warmer haze
          mt.customProgramCacheKey = () => 'talehq' + o.fogK; mt.needsUpdate = true; });
        TALES[k].g.children.forEach(ch => { if (ch.isMesh && !ch.userData.flick) ch.visible = false; if (ch.userData.flick) ch.visible = false; });
        TALES[k].g.add(piv); TALES[k].hq = piv; TALES[k].focusY = k === 'tree' ? 40 : 22; TALES[k].center.y = TALES[k].focusY;
        if (k === 'tree') { const l = new THREE.PointLight(0xffc27a, 3, 220, 0); l.position.set(0, 50, 70); TALES[k].g.add(l); }
        if (k === 'furnace') { const l = new THREE.PointLight(0xff7a2a, 2.5, 120, 0); l.position.set(0, 14, 30); TALES[k].g.add(l); }
      }).catch(e => console.warn('tale hq', k, e));
    }
  }
  window.__loadTalesHQ = loadHQ;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickTale(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, world.camera); const h = ray.intersectObjects(pickables, false)[0]; return h ? h.object.userData.tale : null; }
  const tip = $(`<div id="taletip"></div>`); document.body.appendChild(tip);
  let hoverTale = null;
  world.renderer.domElement.addEventListener('pointermove', e => {
    if (history.active || director.state === 'stone') { hoverTale = null; tip.classList.remove('on'); return; }
    hoverTale = pickTale(e); if (hoverTale) { world.renderer.domElement.style.cursor = 'pointer'; tip.textContent = NR.tales[hoverTale].title; tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 10}px)`; tip.classList.add('on'); } else tip.classList.remove('on');
  });

  // overlay tablet
  const tale = $(`<aside id="tale" class="clayf"><img class="tl-img" alt=""><div class="tl-in"><div class="tl-ref"></div><h3 class="tl-title"></h3><blockquote class="tl-kjv"></blockquote><p class="tl-text"></p></div><button class="hsign tl-sign" title=""><svg viewBox="-50 -50 100 100" class="dg"><g>${[0, 45, 90, 135].map(a => `<path transform="rotate(${a})" d="M-12 -46 L12 -46 L2 -34 L1.4 44 L-1.4 44 L-2 -34Z"/>`).join('')}</g></svg></button><button class="ghost tl-x">Close <kbd>Esc</kbd></button></aside>`); document.body.appendChild(tale);
  const tlist = $(`<aside id="talelist" class="clayf"><div class="tls-h">Tales of Daniel</div>${['furnace', 'tree', 'wall', 'den'].map(k => `<button data-tale="${k}"><img src="data/tales/${k}.webp" alt=""><span><b>${esc(NR.tales[k].title)}</b><i>${esc(NR.bible.tales[k].ref)}</i></span></button>`).join('')}</aside>`); document.body.appendChild(tlist);
  tBtn.onclick = e => { e.stopPropagation(); tlist.classList.toggle('on'); };
  tlist.addEventListener('click', e => { const b = e.target.closest('[data-tale]'); if (b) { tlist.classList.remove('on'); openTale(b.dataset.tale); } });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('#talelist, #tales-btn')) tlist.classList.remove('on'); });
  let openK = null, camBack = null;
  function openTale(k, noCam) { loadHQ();
    const t = NR.tales[k], kj = NR.bible.tales[k]; openK = k; seen.add(k); try { localStorage.setItem(TK, JSON.stringify([...seen])); } catch (e) { } renderTales();
    const g = narr.guide, line = t[g === 'bible' ? 'historian' : g] || t.historian;
    tale.querySelector('.tl-img').src = `data/tales/${k}.webp`; tale.querySelector('.tl-ref').textContent = kj.ref; tale.querySelector('.tl-title').textContent = t.title; tale.querySelector('.tl-kjv').textContent = kj.text; tale.querySelector('.tl-text').textContent = line;
    tale.dataset.who = narr.names()[g === 'bible' ? 'historian' : g] || ''; const sg = tale.querySelector('.tl-sign'); sg.dataset.sign = k; sg.classList.toggle('got', false);
    tale.classList.remove('on'); void tale.offsetWidth; tale.classList.add('on'); pauseHist();
    if (narr.on) narr.speak(g === 'bible' ? kj.text : line, 't-' + k);
    if (!noCam && !history.active) focusTale(k);
  }
  function closeTale() { if (!openK) return; openK = null; tale.classList.remove('on'); narr.stop(); release(); }
  tale.addEventListener('click', e => { if (e.target.closest('.tl-x')) closeTale(); });
  document.addEventListener('pointerdown', e => { if (openK && !e.target.closest('#tale, #talelist, #tales-btn, .tale-chip, #vctrl, .h-ctrl') && e.target === world.renderer.domElement && !pickTale(e)) closeTale(); });
  // camera: turn to it from where we stand, with only a slight push in; the model sits left of centre, the tablet right
  const tmp = new THREE.Vector3();
  function hold(on) { director.hold = on; director.controls.autoRotate = false; }
  function saveCam() { if (!camBack) camBack = { p: world.camera.position.clone(), t: world.controls.target.clone() }; }
  function release() { hold(false); if (camBack && !history.active && director.state !== 'stone') { gsap.to(world.camera.position, { x: camBack.p.x, y: camBack.p.y, z: camBack.p.z, duration: 2.2, ease: 'power2.inOut' }); gsap.to(world.controls.target, { x: camBack.t.x, y: camBack.t.y, z: camBack.t.z, duration: 2.2, ease: 'power2.inOut' }); } camBack = null; }
  function focusTale(k) {
    const c = TALES[k].center; saveCam(); hold(true); gsap.killTweensOf(world.camera.position); gsap.killTweensOf(world.controls.target);
    // from a distance, a little closer than now, and swung sideways so the statue never stands between camera and tale
    const cam = world.camera.position.clone(), u = cam.clone().sub(c).setY(0), dist = u.length(); u.normalize();
    const lat = new THREE.Vector3(Math.sign(c.x) || 1, 0, 0), D = TALES[k].hq || HQ[k] ? 300 : 560; // v11: stay far back, the low-poly tales only ever read small in the distance
    const clear = P => { const d = c.clone().sub(P).setY(0), L = d.length(); d.normalize(); const t = Math.max(0, Math.min(L, -P.clone().setY(0).dot(d))); return P.clone().setY(0).addScaledVector(d, t).length(); };
    // v11: always look in from the front of the plain (where the visitor stands), far back, statue kept off the sight line
    let P = c.clone().addScaledVector(new THREE.Vector3(-c.x * .35, 0, -c.z).normalize(), D); if (clear(P) < 70) { for (let w = .25; w <= 3; w += .25) { P = c.clone().addScaledVector(u.clone().addScaledVector(lat, w).normalize(), D); if (clear(P) > 70) break; } }
    P.y = 46 + TALES[k].focusY * .5; const fw = c.clone().sub(P).setY(0).normalize(); const Tg = c.clone().addScaledVector(new THREE.Vector3(-fw.z, 0, fw.x), D * .2); Tg.y = c.y + 2; // tale sits left of the overlay
    gsap.to(world.camera.position, { x: P.x, y: P.y, z: P.z, duration: 2.6, ease: 'power2.inOut' }); gsap.to(world.controls.target, { x: Tg.x, y: Tg.y, z: Tg.z, duration: 2.6, ease: 'power2.inOut' });
  }

  // ---------------------------------------------------------------- beast focus (Assembled / Exploded)
  let beastOpen = false;
  function focusBeast(id) {
    const B = window.beasts; if (!B || history.active || director.state === 'stone') return; const it = B.items[id]; if (!it) return;
    saveCam(); hold(true); beastOpen = true; gsap.killTweensOf(world.camera.position); gsap.killTweensOf(world.controls.target);
    const c = it.holder.position.clone(); c.y += 8 + (it.lift || 0); const away = world.camera.position.clone().sub(c).setY(0).normalize();
    const D = it.len * 2.3, a0 = Math.atan2(away.x, away.z), o = { a: a0 };
    const at = a => tmp.set(c.x + Math.sin(a) * D, c.y + D * .32, c.z + Math.cos(a) * D);
    at(a0 - .25 * Math.sign(c.x || 1)); gsap.to(world.camera.position, { x: tmp.x, y: tmp.y, z: tmp.z, duration: 1.8, ease: 'power2.inOut' });
    gsap.to(world.controls.target, { x: c.x, y: c.y, z: c.z, duration: 1.8, ease: 'power2.inOut', onComplete: () => { o.a = a0 - .25 * Math.sign(c.x || 1); gsap.to(o, { a: o.a + .55 * Math.sign(c.x || 1), duration: 14, ease: 'sine.inOut', onUpdate: () => { if (!beastOpen) return; at(o.a); world.camera.position.copy(tmp); } }); } });
  }

  addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (qz.classList.contains('on')) qz.classList.remove('on'); else if (srcPan.classList.contains('on')) srcPan.classList.remove('on'); else if (openK) closeTale(); tlist.classList.remove('on'); });
  // ---------------------------------------------------------------- per-frame
  let lastMode = null, wasBeast = false;
  return {
    focusBeast, openTale, closeTale, pickTale,
    click(e) { if (history.active || director.state === 'stone') return false; const k = pickTale(e); if (k) { openTale(k); return true; } return false; },
    update(t, dt) {
      if (!hqStarted && (tlist.classList.contains('on') || (history.active && history.metal === 'head') || ['furnace', 'tree'].some(k => world.camera.position.distanceTo(TALES[k].center) < 520))) loadHQ();
      placeCtrls();
      const mode = history.active ? 'history' : curView();
      if (mode !== lastMode) {
        if (lastMode === 'history' || mode === 'history') { narr.stop(); verseEl.classList.remove('on'); }
        else if (viewArmed && narr.on && !openK) readView();
        if (director.state === 'stone') verseEl.classList.remove('on');
        lastMode = mode;
      }
      // beast flyout closed: give the camera back
      const bOpen = !!v7.beastOpenSec; if (wasBeast && !bOpen && beastOpen) { beastOpen = false; if (!openK) release(); } wasBeast = bOpen;
      // battle volume: present, but ducked whenever a voice is speaking
      const speaking = narr.busy(), on = window.__v9 && window.__v9.on;
      for (const a of battles) { const goal = !on ? 0 : speaking ? .16 : .62; a.v += (goal - a.v) * Math.min(1, dt * 3); a.volume = Math.max(0, Math.min(1, a.v)); }
      // tales: quiet, slow flicker; brighter on hover/open; a soft glint when History reaches their moment
      const cur = history.active ? Math.round(history.st.s) : -1, glintFor = TALE_AT[cur] || [];
      for (const k in TALES) { const x = TALES[k]; const want = (hoverTale === k || openK === k) ? 1 : glintFor.includes(k) ? .6 : 0; x.h += (want - x.h) * Math.min(1, dt * 3);
        const fl = .82 + .12 * Math.sin(t * 2.1 + k.length) + .06 * Math.sin(t * 5.3 + k.length * 2);
        x.glows.forEach(gm => { const m = gm.material; const base = gm.userData.o ?? .5; if (gm.isSprite) m.opacity = base * fl * (1 + x.h * 1.6); else m.opacity = .45 * fl * (1 + x.h * .6); });
        if (x.plate) x.plate.material.opacity = (.22 + .1 * Math.sin(t * .7)) * (1 + x.h * 1.8);
        if (x.eyes) { const blink = (Math.sin(t * .9) > .97 || Math.sin(t * 1.3 + 2) > .985) ? .1 : 1; x.eyes.forEach(e => (e.material.opacity = .5 * blink * (1 + x.h))); }
      }
    },
  };
}
