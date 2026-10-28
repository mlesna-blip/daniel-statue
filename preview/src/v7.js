import * as THREE from 'three';
import { makeTex } from './glyphs.js?v=20261028v15b';
// v7: prophecy beasts + clay tablet, number codex, guides, discovery tablet, share links + snapshot.
const $ = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SPOTS = [
  ['platform', 'Ziggurat step', 'A wedge cut into the corner of the top terrace.'],
  ['map', 'Ur of the Chaldees', 'Pressed into the clay where Abraham set out (Gen 11:31).'],
  ['timeline', 'The end of the line', 'Beyond AD 476, where the timeline runs out.'],
  ['codex', 'Codex margin', 'A scribe’s mark in the codex.'],
  ['tablet', 'Beast tablet', 'Scratched into the corner of a beast tablet.'],
  ['crown', 'Above the head', 'Hidden above the golden head when the image is taken apart.'],
  ['furnace', 'The furnace', 'Pressed into a brick of the fiery furnace (Dan 3).'],
  ['tree', 'The great tree', 'Cut into the stump that was left in the earth (Dan 4).'],
  ['wall', 'The plaster wall', 'Beside the writing in Belshazzar’s hall (Dan 5).'],
  ['den', 'The lions’ den', 'Scratched on the stone that sealed the den (Dan 6).'],
];
function dingirTex(col = 'rgba(255,205,140,1)') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = col; x.shadowColor = 'rgba(255,150,60,1)'; x.shadowBlur = 14;
  for (let k = 0; k < 4; k++) { x.save(); x.translate(64, 64); x.rotate(k * Math.PI / 4); x.beginPath(); x.moveTo(-14, -50); x.lineTo(14, -50); x.lineTo(2, -38); x.lineTo(1.4, 46); x.lineTo(-1.4, 46); x.lineTo(-2, -38); x.closePath(); x.fill(); x.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const DINGIR_SVG = `<svg viewBox="-50 -50 100 100" class="dg"><g>${[0, 45, 90, 135].map(a => `<path transform="rotate(${a})" d="M-12 -46 L12 -46 L2 -34 L1.4 44 L-1.4 44 L-2 -34Z"/>`).join('')}</g></svg>`;

export async function createV7({ world, director, history, callouts, glyphs, statue, params }) {
  const D = await fetch('data/v7.json').then(r => r.json());
  const canvas = world.renderer.domElement;

  // ---------- discovery tablet
  const KEY = 'dan2-tablet-v1'; let found = new Set(); try { found = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { }
  const dBtn = $(`<button id="dtab-btn" class="clay-btn" title="The hidden tablet">${DINGIR_SVG}<b>Tablet</b><span></span></button>`); document.body.appendChild(dBtn);
  const dPan = $(`<aside id="dtab"><div class="dt-h">The Hidden Tablet</div><div class="dt-sub">Ten wedge-signs are hidden around the vision. Find them all.</div><div class="dt-grid">${SPOTS.map(([id, n, d]) => `<div class="dt-slot" data-id="${id}">${DINGIR_SVG}<b>${esc(n)}</b><i>${esc(d)}</i></div>`).join('')}</div><div class="dt-done">“The God of heaven shall set up a kingdom, which shall never be destroyed.” · Daniel 2:44</div><button class="ghost dt-x">Close</button></aside>`); document.body.appendChild(dPan);
  function renderTablet() { dBtn.querySelector('span').innerHTML = `<em>${found.size}</em> / ${SPOTS.length}`; dPan.querySelectorAll('.dt-slot').forEach(s => s.classList.toggle('on', found.has(s.dataset.id))); dPan.classList.toggle('complete', found.size === SPOTS.length); }
  function discover(id) { if (found.has(id)) return false; found.add(id); try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch (e) { } renderTablet(); dBtn.classList.remove('pulse'); void dBtn.offsetWidth; dBtn.classList.add('pulse'); toast(`Wedge-sign found: ${SPOTS.find(s => s[0] === id)[1]} · ${found.size}/${SPOTS.length}`); return true; }
  dBtn.onclick = e => { e.stopPropagation(); dPan.classList.toggle('on'); };
  dPan.querySelector('.dt-x').onclick = () => dPan.classList.remove('on');
  document.addEventListener('pointerdown', e => {
    if (!dPan.classList.contains('on')) return;
    if (e.target.closest('#dtab, #dtab-btn')) return;
    dPan.classList.remove('on');
  }, true);
  renderTablet();
  const toastEl = $(`<div id="v7toast"></div>`); document.body.appendChild(toastEl);
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('on'), 2600); }
  // 3D hidden signs: platform corner, Ur on the map, above the head (exploded only)
  const sTex = dingirTex(); const spr = {};
  const mkSign = (id, pos, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .5, fog: false })); s.position.copy(pos); s.scale.setScalar(size); s.userData.sign = id; world.scene.add(s); spr[id] = s; return s; };
  mkSign('platform', new THREE.Vector3(-69, world.PLAT_TOP + .9, 22.5), 1.6);
  mkSign('map', history.map.ll(46.1, 30.96, 1.2), 1.5);
  mkSign('crown', new THREE.Vector3(9, 162, -4), 3.2);
  // DOM hidden signs: end of the timeline, inside the codex, on the beast tablet
  const tlSign = $(`<button class="hsign tl-sign" data-sign="timeline" title="">${DINGIR_SVG}</button>`); document.querySelector('#hist .h-timeline').appendChild(tlSign);
  document.addEventListener('click', e => { const h = e.target.closest('.hsign'); if (h && discover(h.dataset.sign)) h.classList.add('got'); });

  // ---------- beast tablet (a clay tablet in 3D CSS, tied to its statue section by a glowing line)
  const bt = $(`<aside id="btab"><div class="bt-tab"><img class="bt-img" alt=""><div class="bt-in"><div class="bt-ref"></div><h3 class="bt-name"></h3><div class="bt-verse"></div><p class="bt-text"></p><div class="bt-more"></div></div>
    <button class="hsign bt-sign" data-sign="tablet">${DINGIR_SVG}</button><button class="ghost bt-x">Close <kbd>Esc</kbd></button></div></aside>`); document.body.appendChild(bt);
  const btLink = $(`<svg id="btlink"><defs><filter id="btGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#btGlow)"><polyline class="bl"/><circle class="bn1" r="5.5"/><circle class="bn2" r="4"/></g></svg>`); document.body.appendChild(btLink);
  let btSec = null;
  function openBeast(id) {
    const b = D.beasts[id]; if (!b) return; btSec = statue.sections[b.sec];
    bt.querySelector('.bt-img').src = `data/beasts/relief_${b.relief}.jpg`; bt.querySelector('.bt-ref').textContent = b.ref; bt.querySelector('.bt-name').textContent = b.name;
    bt.querySelector('.bt-verse').textContent = b.verse; bt.querySelector('.bt-text').textContent = b.text;
    bt.querySelector('.bt-more').innerHTML = Object.entries(D.beasts).filter(([k, x]) => x.sec === b.sec && k !== id).map(([k, x]) => `<button data-beast="${k}"><img src="data/beasts/line/${k}.png" alt="">${esc(x.name)}</button>`).join('');
    bt.querySelector('.bt-sign').classList.toggle('got', found.has('tablet'));
    bt.classList.remove('on'); void bt.offsetWidth; bt.classList.add('on'); bt.dataset.sec = b.sec; if (history.active) history.pause && history.pause();
    setTimeout(() => updateLink(), 50);
  }
  function closeBeast() { bt.classList.remove('on'); btSec = null; }
  document.addEventListener('pointerdown', e => { if (!bt.classList.contains('on')) return; if (e.target.closest('#btab, [data-b], [data-beast], .tl-beast, .band-ic')) return; closeBeast(); }, true);
  bt.addEventListener('click', e => { const m = e.target.closest('[data-beast]'); if (m) openBeast(m.dataset.beast); if (e.target.closest('.bt-x')) closeBeast(); });
  document.addEventListener('click', e => { const m = e.target.closest('.tl-beast'); if (m) openBeast(m.dataset.beast); });
  const P = new THREE.Vector3();
  function updateLink() {
    if (!btSec) return; const r = bt.querySelector('.bt-tab').getBoundingClientRect(); btSec.getWorldPosition(P); P.project(world.camera);
    const ax = (P.x * .5 + .5) * innerWidth, ay = (-P.y * .5 + .5) * innerHeight, bx = r.left + 6, by = r.top + r.height * .35;
    btLink.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    btLink.querySelector('.bl').setAttribute('points', `${ax},${ay} ${ax + (bx - ax) * .45},${ay} ${ax + (bx - ax) * .6},${by} ${bx},${by}`);
    const n1 = btLink.querySelector('.bn1'), n2 = btLink.querySelector('.bn2'); n1.setAttribute('cx', ax); n1.setAttribute('cy', ay); n2.setAttribute('cx', bx); n2.setAttribute('cy', by);
  }
  // beast seals on the history timeline at each empire change
  { const evs = history.map.events; const firstOf = {}; evs.forEach((e, i) => { if (!(e.metal in firstOf)) firstOf[e.metal] = i; });
    const list = { head: ['lion'], chest: ['bear', 'ram'], belly: ['leopard', 'goat'], legs: ['fourth'] }; const box = $(`<div class="tl-beasts"></div>`);
    for (const m in list) { const pos = firstOf[m] / (evs.length - 1) * 100; list[m].forEach((b, k) => box.appendChild($(`<button class="tl-beast" data-beast="${b}" style="left:calc(${pos}% + ${k * 34}px)" title="${esc(D.beasts[b].name)}"><img src="data/beasts/icon_${b}.jpg" alt=""></button>`))); }
    /* v8: beast icons live on the empire bands instead (see v8.js) */ }

  // ---------- number codex
  const CK = 'dan2-codex-v1'; let caught = new Set(); try { caught = new Set(JSON.parse(localStorage.getItem(CK) || '[]')); } catch (e) { }
  const cx = $(`<div id="codex"><div class="cx-tab"><div class="cx-ill"></div><div class="cx-body"><div class="cx-eyebrow">Number Codex</div><h2 class="cx-title"></h2><div class="cx-refs"></div><div class="cx-lead"></div>
    <div class="cx-h">Readings</div><ul class="cx-others"></ul>
    <div class="cx-nav"></div></div><button class="hsign cx-sign" data-sign="codex">${DINGIR_SVG}</button><button class="ghost cx-x">Close <kbd>Esc</kbd></button></div></div>`); document.body.appendChild(cx);
  const cxBtn = $(`<button id="codex-btn" class="clay-btn" title="Number codex: catch the drifting numbers"><i>𒐕</i><b>Codex</b><span></span></button>`); document.body.appendChild(cxBtn);
  const texCache = {};
  function openCodex(n) {
    n = String(n); const c = D.codex[n]; if (!c) return; caught.add(n); try { localStorage.setItem(CK, JSON.stringify([...caught])); } catch (e) { } renderCodexBtn();
    const ill = cx.querySelector('.cx-ill'); ill.innerHTML = ''; const t = texCache[n] || (texCache[n] = makeTex([[+n]], n)); const im = t.image; im.className = 'cx-num'; ill.appendChild(im);
    cx.querySelector('.cx-title').textContent = c.title; cx.querySelector('.cx-refs').textContent = c.refs; cx.querySelector('.cx-lead').textContent = c.lead; 
    cx.querySelector('.cx-others').innerHTML = [[c.sdaLabel || 'Historicist', c.sda], ...c.others].map(([h, t]) => `<li><b>${esc(h)}:</b> ${esc(t)}</li>`).join('');
    cx.querySelector('.cx-nav').innerHTML = Object.keys(D.codex).map(k => `<button data-n="${k}" class="${caught.has(k) ? 'got' : ''} ${k === n ? 'cur' : ''}">${caught.has(k) ? k : '·'}</button>`).join('');
    cx.querySelector('.cx-sign').classList.toggle('got', found.has('codex'));
    cx.classList.add('on'); wasPlaying = history.active && history.st.playing; if (wasPlaying) history.pause(); paused = true;
  }
  let wasPlaying = false, paused = false;
  function closeCodex() { cx.classList.remove('on'); paused = false; }
  cx.addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (b && caught.has(b.dataset.n)) openCodex(b.dataset.n); if (e.target.closest('.cx-x') || e.target === cx) closeCodex(); });
  function renderCodexBtn() { cxBtn.querySelector('span').innerHTML = `<em>${caught.size}</em> / 7`; }
  cxBtn.onclick = e => { e.stopPropagation(); if (cx.classList.contains('on')) closeCodex(); else openCodex([...caught][0] || '7'); }; renderCodexBtn();
  // tap outside closes codex
  document.addEventListener('pointerdown', e => {
    if (!cx.classList.contains('on')) return;
    if (e.target.closest('#codex .cx-tab, #codex-btn')) return;
    closeCodex();
  }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape') { closeCodex(); closeBeast(); dPan.classList.remove('on'); } });

  // ---------- narration (v10): one dropdown chooses who speaks: off, the three guides, the Bible (KJV) or Kids.
  // Lines, KJV passages and recordings exist per language (data/narr/<lang>.json, data/voices/manifest10.json).
  const LANG = window.__LANG || 'en'; const NR = window.__NARR || null;
  if (NR) { for (const g in NR.guides) { D.guides[g] = D.guides[g] || { name: g, hint: '' }; D.guides[g].lines = NR.guides[g]; } D.guides.bible = { name: NR.bibleName || 'King James Bible', hint: 'Scripture read aloud', lines: NR.bible.events.map(x => x.text) }; D.guides.kids = Object.assign(D.guides.kids || {}, { name: NR.kidsName || 'Kids', hint: 'For young listeners' }); for (const g in NR.names || {}) if (D.guides[g]) D.guides[g].name = NR.names[g]; }
  const ORDER = ['historian', 'daniel', 'nebuchadnezzar', 'bible', 'kids'].filter(g => D.guides[g]);
  const GK = 'dan2-narr10'; let guide = localStorage.getItem('dan2-guide') || 'historian', choice = localStorage.getItem(GK) || (localStorage.getItem('dan2-narr') === 'off' ? 'off' : guide);
  if (params.get('guide') in D.guides) choice = params.get('guide'); if (choice !== 'off' && !D.guides[choice]) choice = 'historian'; if (choice !== 'off') guide = choice;
  let narrate = choice !== 'off'; const synth = window.speechSynthesis;
  let VO = null; fetch('data/voices/manifest10.json').then(r => r.ok ? r.json() : null).then(j => (VO = j && (j[LANG] || j.en))).catch(() => {}); let voEl = null, pending = 0;
  function voFile(key) { const g = VO && VO[guide]; const f = g && g[String(key)]; return f ? 'data/voices/' + f : null; }
  function stop() { synth && synth.cancel(); if (voEl) { voEl.pause(); voEl = null; window.__vo = null; } pending = 0; }
  // key: event index, 't-<tale>' or 'v-<view>'; who: force a narrator (views always read the KJV)
  function speak(text, key = Math.round(history.st.s), who) {
    if (!narrate) return;
    // Per-event: never restart the same event index (History restart guard). Guide changes clear spokenAt.
    if (typeof key === 'number' && history.spokenAt === key) {
      try { console.debug('[narr] skip-repeat', key); } catch (e) {}
      return;
    }
    stop(); const g0 = guide; if (who) guide = who; const f = voFile(key); guide = g0; if (typeof key === 'number') history.spokenAt = key;
    try { console.info('[narr] Audio.play', { key, who: who || guide, file: !!f }); window.__narrPlays = (window.__narrPlays || []).concat([{ t: performance.now(), key, file: f || null }]); } catch (e) {}
    if (f) { const el = voEl = new Audio(f); window.__vo = el; pending = performance.now(); el.volume = 1; el.muted = !!(window.__v9 && !window.__v9.on); el.play().then(() => (pending = 0)).catch(() => { pending = 0; if (voEl === el) voEl = null; }); el.onended = () => { if (voEl === el) { voEl = null; window.__vo = null; } }; el.onerror = () => { pending = 0; if (voEl === el) voEl = null; }; return; }
    if (synth && text && !(window.__v9 && !window.__v9.on)) { const u = new SpeechSynthesisUtterance(text); u.lang = { en: 'en-US', ru: 'ru-RU', es: 'es-ES' }[LANG]; synth.speak(u); }
  }
  const busy = () => (pending && performance.now() - pending < 4000) || !!(voEl && !voEl.paused && !voEl.ended) || !!(synth && synth.speaking);
  history.narrBusy = busy; history.narrOn = () => narrate;
  history.guideLine = idx => { const g = D.guides[guide]; if (!g || !g.lines[idx]) return null; return { text: g.lines[idx], who: guide === 'bible' ? (NR ? NR.bible.events[idx].ref : 'KJV') : g.name }; };
  history.onEvent = idx => { const l = history.guideLine(idx); if (l) speak(l.text, idx); };
  const NAMES = () => Object.fromEntries([['off', NR && NR.offName || 'Off'], ...ORDER.map(g => [g, D.guides[g].name])]);
  const listeners = [];
  function setChoice(c, silent) {
    choice = c; narrate = c !== 'off'; if (narrate) guide = c; try { localStorage.setItem(GK, c); if (narrate) localStorage.setItem('dan2-guide', c); } catch (e) { }
    if (!narrate) stop();
    // Reset spokenAt so a guide change can re-read the current event once (via refreshCard → showEvent), not twice
    if (history.active) history.spokenAt = null;
    history.refreshCard && history.refreshCard(); listeners.forEach(f => f(c));
    // Do NOT speak here — refreshCard → showEvent owns the single restart after camera settle
  }
  if (!synth && !window.fetch) narrate = false;
  const narr = { get choice() { return choice; }, get guide() { return guide; }, get on() { return narrate; }, order: ORDER, names: NAMES, set: setChoice, onChange: f => listeners.push(f), speak, stop, busy, voFile };
  // ---------- share link + cinematic snapshot
  const sh = $(`<div id="share"><button class="more" title="More" aria-label="More"><svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg></button><div class="sh-pop"><button data-v7="link" title="Copy a link to this view"><svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg><span>Copy link</span></button><button data-v7="snap" title="Save a cinematic snapshot"><svg viewBox="0 0 24 24"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/></svg><span>Snapshot</span></button></div></div>`);
  sh.querySelector('.more').onclick = e => { e.stopPropagation(); sh.classList.toggle('open'); }; document.addEventListener('pointerdown', e => { if (!e.target.closest('#share')) sh.classList.remove('open'); }); document.body.appendChild(sh);
  function link() {
    const u = new URL(location.href.split('?')[0]); const p = u.searchParams;
    if (history.active) { const e = history.map.events[Math.round(history.st.s)]; p.set('mode', 'history'); p.set('year', e.year); if (history.st.free) p.set('free', ''); p.set('guide', choice); }
    else if (director.state === 'focus' && director.focused) { p.set('state', 'focus'); p.set('section', director.focused.name); }
    else if (director.state === 'exploded') p.set('state', 'exploded');
    else if (director.state === 'stone') p.set('state', 'stone');
    if (btSec && bt.classList.contains('on')) p.set('beast', bt.dataset.id || '');
    return u.toString().replace(/=(&|$)/g, '$1');
  }
  async function copyLink() { const l = link(); try { await navigator.clipboard.writeText(l); toast('Link copied: ' + l.replace(/^https?:\/\/[^/]+/, '')); } catch (e) { prompt('Copy this link', l); } }
  function snapshot() {
    director.preRender(); world.composer.render(); director.postRender();
    const src = canvas, W = 1920, H = Math.round(W * src.height / src.width); const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.drawImage(src, 0, 0, W, H);
    const v = x.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .9); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.65)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
    const bar = Math.round(H * .085); x.fillStyle = '#000'; x.fillRect(0, 0, W, bar); x.fillRect(0, H - bar, W, bar);
    x.fillStyle = '#e8c27a'; x.font = '600 34px Cinzel, serif'; x.textAlign = 'left'; x.fillText('THE GREAT IMAGE', 56, H - bar / 2 + 12);
    x.font = 'italic 26px "Cormorant Garamond", serif'; x.fillStyle = 'rgba(232,210,170,.8)';
    let cap = 'Daniel 2:31–45'; if (history.active) { const e = history.map.events[Math.round(history.st.s)]; cap = `${e.date} · ${e.title}`; } else if (director.focused) cap = `${director.focused.userData.part} · ${director.focused.userData.kingdom}`;
    x.textAlign = 'right'; x.fillText(cap, W - 56, H - bar / 2 + 10);
    const a = document.createElement('a'); a.download = `great-image-${Date.now()}.png`; a.href = c.toDataURL('image/png'); a.click(); toast('Snapshot saved');
  }
  sh.addEventListener('click', e => { const b = e.target.closest('[data-v7]'); if (!b) return; sh.classList.remove('open'); if (b.dataset.v7 === 'link') copyLink(); else snapshot(); });

  // ---------- picking (called by main before its own click handling); returns true when consumed
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function click(e) {
    ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, world.camera);
    const n = glyphs.hit(ray); if (n) { openCodex(n); return true; }
    for (const id in spr) { const s = spr[id]; if (!s.visible || found.has(id)) continue; if (ray.ray.distanceToPoint(s.position) < s.scale.x * 1.4) { discover(id); return true; } }
    return false;
  }
  if (params.has('beast')) setTimeout(() => openBeast(params.get('beast')), 800);
  if (params.has('codex')) setTimeout(() => openCodex(params.get('codex')), 800);
  if (params.has('tablet')) dPan.classList.add('on');
  const _ob = openBeast; 

  return {
    narr, discover, SPOTS, renderTablet, openBeast: id => { bt.dataset.id = id; _ob(id); }, get beastOpenSec() { return bt.classList.contains('on') ? bt.dataset.sec : null; }, closeBeast, openCodex, click, get paused() { return paused; },
    update(t) {
      spr.platform.visible = !history.active && !found.has('platform'); spr.map.visible = history.active && !found.has('map'); spr.crown.visible = !history.active && director.state === 'exploded' && !found.has('crown');
      for (const id in spr) spr[id].material.opacity = .28 + .2 * Math.sin(t * 1.3 + id.length);
      tlSign.classList.toggle('got', found.has('timeline'));
      
    },
  };
}
