// v12: presenter mode. A curated sequence (statue → metals → kingdoms → stone) stepped by keys or a clicker.
import { gsap } from 'gsap';
const T = s => (window.__tr ? window.__tr(s) : s);
function fmtYear(y) { if (y == null || y === '') return ''; const n = +y; if (!Number.isFinite(n)) return String(y); return n < 0 ? `${-n} BC` : n > 0 ? `AD ${n}` : 'AD 1'; }
const SEC = {
  head: ['Daniel 2:32, 38', '“This image’s head was of fine gold.”', 'Babylon — “Thou art this head of gold.” Nebuchadnezzar’s empire, the first and richest.'],
  chest: ['Daniel 2:32, 39', '“…his breast and his arms of silver.”', 'Medo-Persia — “another kingdom inferior to thee,” two arms for two peoples.'],
  belly: ['Daniel 2:32, 39', '“…his belly and his thighs of brass.”', 'Greece — a third kingdom of brass “which shall bear rule over all the earth.”'],
  legs: ['Daniel 2:33, 40', '“His legs of iron.”', 'Rome — “strong as iron,” it breaks and subdues all things.'],
  feet: ['Daniel 2:33, 41–43', '“His feet part of iron and part of clay.”', 'A divided kingdom — “they shall not cleave one to another,” partly strong, partly broken.'],
};
const KING = [ // [event index, kingdom, key line]
  [0, 'Babylon', '605 BC — Nebuchadnezzar wins at Carchemish and rules the known world.'],
  [2, 'Medo-Persia', '539 BC — Cyrus takes Babylon, the very night of Belshazzar’s feast.'],
  [5, 'Greece', '331 BC — Alexander conquers Persia at Gaugamela, in a few short years.'],
  [7, 'Rome', '168 BC — at Pydna the legions break Macedon; Rome rules by iron.'],
  [12, 'The Divided Kingdoms', 'AD 476 — the West falls apart into kingdoms that never fully join again.'],
];
export function createPresenter({ director, history, statue, v7 }) {
  const narr = v7 && v7.narr, events = history.map.events;
  const steps = [{ k: 'assembled', ref: 'Daniel 2:31', verse: '“Thou, O king, sawest, and behold a great image… whose brightness was excellent.”', line: 'The great image of Nebuchadnezzar’s dream.', title: 'The Great Image' }];
  for (const k of ['head', 'chest', 'belly', 'legs', 'feet']) steps.push({ k, sec: k, ref: SEC[k][0], verse: SEC[k][1], line: SEC[k][2], title: { head: 'Head of Gold', chest: 'Breast & Arms of Silver', belly: 'Belly & Thighs of Brass', legs: 'Legs of Iron', feet: 'Feet of Iron & Clay' }[k] });
  for (const [i, name, line] of KING) { const e = events[i]; const m = /^(.*?)\s+—\s+(.*)$/.exec(e.verse || ''); steps.push({ k: 'ev' + i, ev: i, title: name, ref: m ? m[1] : '', verse: m ? m[2] : (e.verse || ''), line }); }
  steps.push({ k: 'stone', stone: true, ref: 'Daniel 2:34–35', verse: '“…a stone was cut out without hands, which smote the image upon his feet… and became a great mountain, and filled the whole earth.”', line: 'A kingdom that shall never be destroyed.', title: 'The Stone' });

  const EXTRA = {
    assembled: 'Daniel stands before the king and declares both the dream and its meaning — God revealing what shall be hereafter.',
    head: '“The God of heaven hath given thee a kingdom, power, and strength, and glory.” (Dan 2:37)',
    chest: 'Cyrus fulfills Isaiah’s naming of him long before; the silver kingdom takes the gold.',
    belly: 'Alexander’s rush matches the brass that “bears rule over all the earth,” then his empire splits.',
    legs: 'Iron Rome crushes; yet the legs already hint at an east–west parting.',
    feet: 'Iron and clay mixed — strong and brittle together. “They shall mingle themselves with the seed of men.”',
    stone: '“A stone… cut out without hands” smites the image; the God of heaven sets up a kingdom that shall never be destroyed. (Dan 2:34, 44)',
  };
  steps.forEach(st => {
    if (st.sec && EXTRA[st.sec]) st.extra = EXTRA[st.sec];
    else if (st.stone) st.extra = EXTRA.stone;
    else if (st.k === 'assembled') st.extra = EXTRA.assembled;
    if (st.ev !== undefined && events[st.ev]) st.year = fmtYear(events[st.ev].year) || events[st.ev].date || '';
    if (st.sec === 'head') st.year = st.year || '605 – 539 BC';
    if (st.sec === 'chest') st.year = st.year || '539 – 331 BC';
    if (st.sec === 'belly') st.year = st.year || '331 – 168 BC';
    if (st.sec === 'legs') st.year = st.year || '168 BC – AD 476';
    if (st.sec === 'feet') st.year = st.year || 'AD 476 –';
  });

  const el = document.createElement('div'); el.id = 'presenter';
  el.innerHTML = `<div class="pr-black"></div>
    <div class="pr-years" aria-hidden="true"></div>
    <div class="pr-progress"><i></i></div>
    <div class="pr-stage">
      <button class="pr-prev" type="button" aria-label="Previous">‹</button>
      <div class="pr-text">
        <div class="pr-ref"></div>
        <div class="pr-title"></div>
        <div class="pr-verse"></div>
        <div class="pr-line"></div>
        <div class="pr-extra"></div>
        <div class="pr-card" hidden></div>
      </div>
      <button class="pr-next" type="button" aria-label="Next">›</button>
    </div>
    <div class="pr-bar"><span class="pr-n"></span><button class="pr-narr" title="Narration (N)"></button><button class="pr-x" title="Exit (Esc)">Esc · Exit</button></div>
    <div class="pr-hint">← → to step · Esc to exit</div>`;
  document.body.appendChild(el);
  const btn = document.createElement('button'); btn.id = 'presenter-btn'; btn.className = 'clayc'; btn.title = 'Presenter mode (P)'; btn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/></svg>`;
  document.body.appendChild(btn);
  const q = s => el.querySelector(s);
  let on = false, i = 0, auto = true, prevChoice = null, speakT = null, speakTok = 0; // auto mirrors narr.choice !== 'off'
  function clearSpot() {
    if (!statue || !statue.sections) return;
    director.list.forEach(sec => gsap.to(sec.userData, { hl: 0, dim: 0, duration: .9, overwrite: 'auto' }));
    try { const key = director.world && director.world.key; if (key) gsap.to(key, { angle: key.userData._baseA || key.angle, duration: 1.2 }); } catch (e) {}
  }
  function spotSection(id, instant) {
    const sec = statue.sections[id]; if (!sec) return;
    director.list.forEach(s => gsap.to(s.userData, { hl: s.name === id ? 1.55 : 0, dim: s.name === id ? 0 : 1, duration: instant ? 0 : 1.2, overwrite: 'auto' }));
    // Ease camera toward the section without exploding it
    try {
      const home = sec.userData.home; const cy = home.y * (statue.root.scale.y || 1) + statue.root.position.y;
      const cam = director.camera, ctrl = director.controls;
      if (cam && ctrl) {
        const goalT = { x: 0, y: cy * .55 + 8, z: 0 };
        const dist = 110 + cy * .35;
        const goalP = { x: cam.position.x * .15, y: cy * .55 + 18, z: dist };
        gsap.to(ctrl.target, { x: goalT.x, y: goalT.y, z: goalT.z, duration: instant ? 0 : 1.4, ease: 'power2.inOut' });
        gsap.to(cam.position, { x: goalP.x, y: goalP.y, z: goalP.z, duration: instant ? 0 : 1.4, ease: 'power2.inOut' });
      }
    } catch (e) {}
  }
  // Narration picker covers every slide (statue sections via bible views, events via current guide, stone via bible)
  function speakSlide(s) {
    if (!narr || !narr.on) return;
    const NR = window.__NARR;
    if (s.ev !== undefined) {
      const g = narr.guide || 'bible';
      const lines = NR && NR.guides && NR.guides[g];
      const text = lines && lines[s.ev];
      if (text) narr.speak(text, s.ev, g === 'bible' ? 'bible' : undefined);
      else if (NR && NR.bible && NR.bible.events[s.ev]) narr.speak(NR.bible.events[s.ev].text, s.ev, 'bible');
      return;
    }
    const key = s.stone ? 'stone' : s.sec || 'assembled';
    const x = NR && NR.bible && NR.bible.views[key];
    if (x) narr.speak(x.text, 'v-' + key, 'bible');
  }

  // v15: full guide picker (Historian / Daniel / Neb / KJV / Kids / Off) — not Auto/Off
  const SHORT = { historian: 'Historian', daniel: 'Daniel', nebuchadnezzar: 'Neb', bible: 'KJV', kids: 'Kids', off: 'Off' };
  function guideOrder() {
    const o = (narr && narr.order) ? narr.order.slice() : ['historian', 'daniel', 'nebuchadnezzar', 'bible', 'kids'];
    return o.concat(['off']);
  }
  function labelFor(c) {
    try { const n = narr && narr.names && narr.names(); if (n && n[c]) return n[c]; } catch (e) {}
    return SHORT[c] || c;
  }
  try {
    const saved = localStorage.getItem('dan2-pres-narr');
    if (saved === 'off') auto = false;
    else if (saved && saved !== 'auto' && saved !== 'on') { /* legacy guide id */ }
  } catch (e) {}
  const setNarr = () => {
    if (!narr) { q('.pr-narr').textContent = 'Narration'; return; }
    const c = narr.choice || 'off';
    auto = c !== 'off';
    q('.pr-narr').textContent = 'Narrator · ' + labelFor(c);
    q('.pr-narr').classList.toggle('on', auto);
    q('.pr-narr').title = 'Narrator: ' + labelFor(c) + ' (N to cycle)';
  };
  function cycleNarr() {
    if (!narr) return;
    const ord = guideOrder();
    const cur = narr.choice || 'off';
    let gi = ord.indexOf(cur); if (gi < 0) gi = 0;
    const next = ord[(gi + 1) % ord.length];
    narr.set(next, true);
    auto = next !== 'off';
    try { localStorage.setItem('dan2-pres-narr', next); } catch (e) {}
    setNarr();
    if (auto) speakSlide(steps[i]); else narr.stop();
  };
  function go(n, instant) {
    i = Math.max(0, Math.min(steps.length - 1, n)); const s = steps[i];
    narr && narr.stop();
    if (s.ev !== undefined) {
      if (!history.active) { if (director.state === 'stone') director.reset(true); director.reset(true); history.enter(!!instant); }
      history.pause(); history.goTo(s.ev, instant);
    } else {
      if (history.active) history.exit();
      if (s.stone) { director.playStone(window.__presStoneT ?? null); clearSpot(); }
      else {
        if (director.state === 'stone') director.reset(true);
        if (director.state === 'exploded') director.assemble();
        if (director.focused) director.unfocus(true);
        if (director.state !== 'assembled' && director.state !== 'focus') director.assemble(instant);
        // Presenter-only: move a spotlight section-to-section down the assembled statue (no slice-out)
        if (s.sec) spotSection(s.sec, instant); else clearSpot();
      }
      // Speak once after camera settles; cancel any prior pending
      clearTimeout(speakT); speakT = null;
      const tok = ++speakTok; const hold = s;
      speakT = setTimeout(() => { if (!on || steps[i] !== hold || speakTok !== tok) return; speakSlide(hold); }, instant ? 80 : 1400);
    }
    const t = q('.pr-text'); t.classList.remove('in'); void t.offsetWidth;
    q('.pr-ref').textContent = T(s.ref); q('.pr-title').textContent = T(s.title); q('.pr-verse').textContent = T(s.verse); q('.pr-line').textContent = T(s.line);
    const extra = q('.pr-extra'); const card = q('.pr-card');
    if (s.extra) { extra.textContent = T(s.extra); extra.hidden = false; } else { extra.textContent = ''; extra.hidden = true; }
    if (s.ev !== undefined && events[s.ev]) {
      const ev = events[s.ev]; card.hidden = false;
      card.innerHTML = `<div class="pr-cy">${fmtYear(ev.year) || ev.date || ''}</div><div class="pr-ct">${T(ev.title || ev.name || '')}</div><div class="pr-cb">${T((ev.blurb || ev.body || ev.text || '').toString().slice(0, 220))}</div>`;
    } else { card.hidden = true; card.innerHTML = ''; }
    const years = q('.pr-years');
    if (s.year) { years.textContent = s.year; years.classList.add('on'); } else { years.textContent = ''; years.classList.remove('on'); }
    const pct = steps.length <= 1 ? 1 : i / (steps.length - 1);
    q('.pr-progress i').style.width = (pct * 100).toFixed(1) + '%';
    q('.pr-prev').disabled = i <= 0; q('.pr-next').disabled = i >= steps.length - 1;
    t.classList.add('in'); q('.pr-n').textContent = `${i + 1} / ${steps.length}`;
  }
  function open() { if (on) return; on = true; window.__presenter = true; prevChoice = narr ? narr.choice : null; document.body.classList.add('presenting'); el.classList.add('on'); setNarr(); go(0); }
  function close() { if (!on) return; on = false; window.__presenter = false; el.classList.remove('on', 'black'); document.body.classList.remove('presenting'); narr && narr.stop(); clearTimeout(speakT); clearSpot();
    if (narr && prevChoice && narr.choice !== prevChoice) narr.set(prevChoice, true); if (history.active) history.exit(); if (director.state === 'stone') director.reset(); else if (director.focused) director.unfocus(); }
  btn.addEventListener('click', () => (on ? close() : open()));
  q('.pr-x').addEventListener('click', close);
  q('.pr-prev').addEventListener('click', () => { if (i <= 0) return; el.classList.remove('black'); go(i - 1); });
  q('.pr-next').addEventListener('click', () => { if (i >= steps.length - 1) return; el.classList.remove('black'); go(i + 1); });
  q('.pr-narr').addEventListener('click', () => cycleNarr());
  addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
    if (!on) { if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); open(); } return; }
    const k = e.key; let used = true;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') { if (i >= steps.length - 1) return; el.classList.remove('black'); go(i + 1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { if (i <= 0) return; el.classList.remove('black'); go(i - 1); }
    else if (k === 'Home') go(0); else if (k === 'End') go(steps.length - 1);
    else if (k === 'b' || k === 'B' || k === '.') el.classList.toggle('black');
    else if (k === 'n' || k === 'N') q('.pr-narr').click();
    else if (k === 'Escape' || k === 'p' || k === 'P') close();
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  return { open, close, go, steps, get on() { return on; }, get i() { return i; } };
}
