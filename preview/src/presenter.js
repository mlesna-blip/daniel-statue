// v12: presenter mode. A curated sequence (statue → metals → kingdoms → stone) stepped by keys or a clicker.
import { gsap } from 'gsap';
const T = s => (window.__tr ? window.__tr(s) : s);
const SEC = {
  head: ['Daniel 2:32', '“This image’s head was of fine gold.”', 'Babylon — “Thou art this head of gold.”'],
  chest: ['Daniel 2:32', '“…his breast and his arms of silver.”', 'Medo-Persia — a second kingdom, inferior to the first.'],
  belly: ['Daniel 2:32', '“…his belly and his thighs of brass.”', 'Greece — a third kingdom that bears rule over all the earth.'],
  legs: ['Daniel 2:33', '“His legs of iron.”', 'Rome — strong as iron, breaking all in pieces.'],
  feet: ['Daniel 2:33', '“His feet part of iron and part of clay.”', 'A divided kingdom — partly strong, partly broken.'],
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

  const el = document.createElement('div'); el.id = 'presenter';
  el.innerHTML = `<div class="pr-black"></div><div class="pr-text clayf"><div class="pr-ref"></div><div class="pr-title"></div><div class="pr-verse"></div><div class="pr-line"></div></div>
    <button class="pr-prev" title="Previous (←)" aria-label="Previous">‹</button><button class="pr-next" title="Next (→)" aria-label="Next">›</button>
    <div class="pr-hint">← → or click</div>
    <div class="pr-bar"><span class="pr-n"></span><button class="pr-narr" title="Narration (N)"></button><button class="pr-x" title="Exit (Esc)">Esc · Exit</button></div>`;
  document.body.appendChild(el);
  const btn = document.createElement('button'); btn.id = 'presenter-btn'; btn.className = 'clayc'; btn.title = 'Presenter mode (P)'; btn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/></svg>`;
  document.body.appendChild(btn);
  const q = s => el.querySelector(s);
  let on = false, i = 0, auto = true, prevChoice = null;
  try { auto = localStorage.getItem('dan2-pres-narr') !== 'off'; } catch (e) { }
  const setNarr = () => { q('.pr-narr').textContent = auto ? 'Narration · Auto' : 'Narration · Off'; q('.pr-narr').classList.toggle('on', auto); if (!narr) return;
    if (!auto) { if (narr.choice !== 'off') narr.set('off', true); } else if (narr.choice === 'off') narr.set(prevChoice && prevChoice !== 'off' ? prevChoice : (narr.guide || 'bible'), true); };
  function speakStatic(s) { if (!auto || !narr || !narr.on) return; const NR = window.__NARR; const key = s.stone ? 'stone' : s.sec || 'assembled'; const x = NR && NR.bible && NR.bible.views[key]; if (x) narr.speak(x.text, 'v-' + key, 'bible'); }
  function go(n, instant) {
    i = Math.max(0, Math.min(steps.length - 1, n)); const s = steps[i];
    narr && narr.stop();
    if (s.ev !== undefined) {
      if (!history.active) { if (director.state === 'stone') director.reset(true); director.reset(true); history.enter(!!instant); }
      history.pause(); history.goTo(s.ev, instant);
    } else {
      if (history.active) history.exit();
      if (s.stone) director.playStone(window.__presStoneT ?? null);
      else { if (director.state === 'stone') director.reset(true); if (director.state === 'exploded') director.assemble(); if (s.sec) director.focus(statue.sections[s.sec], instant); else if (director.focused) director.unfocus(instant); else director.assemble(instant); }
      gsap.delayedCall(instant ? 0 : 1.2, () => on && steps[i] === s && speakStatic(s));
    }
    const t = q('.pr-text'); t.classList.remove('in'); void t.offsetWidth;
    q('.pr-ref').textContent = T(s.ref); q('.pr-title').textContent = T(s.title); q('.pr-verse').textContent = T(s.verse); q('.pr-line').textContent = T(s.line);
    t.classList.add('in'); q('.pr-n').textContent = `${i + 1} / ${steps.length}`;
  }
  function open() { if (on) return; on = true; window.__presenter = true; prevChoice = narr ? narr.choice : null; document.body.classList.add('presenting'); el.classList.add('on'); setNarr(); go(0); }
  function close() { if (!on) return; on = false; window.__presenter = false; el.classList.remove('on', 'black'); document.body.classList.remove('presenting'); narr && narr.stop();
    if (narr && prevChoice && narr.choice !== prevChoice) narr.set(prevChoice, true); if (history.active) history.exit(); if (director.state === 'stone') director.reset(); else if (director.focused) director.unfocus(); }
  btn.addEventListener('click', () => (on ? close() : open()));
  q('.pr-x').addEventListener('click', close);
  q('.pr-prev').addEventListener('click', () => { el.classList.remove('black'); go(i - 1); });
  q('.pr-next').addEventListener('click', () => { el.classList.remove('black'); go(i + 1); });
  q('.pr-narr').addEventListener('click', () => { auto = !auto; try { localStorage.setItem('dan2-pres-narr', auto ? 'auto' : 'off'); } catch (e) { } setNarr(); if (auto) speakStatic(steps[i]); });
  addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
    if (!on) { if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); open(); } return; }
    const k = e.key; let used = true;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') { el.classList.remove('black'); go(i + 1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { el.classList.remove('black'); go(i - 1); }
    else if (k === 'Home') go(0); else if (k === 'End') go(steps.length - 1);
    else if (k === 'b' || k === 'B' || k === '.') el.classList.toggle('black');
    else if (k === 'n' || k === 'N') q('.pr-narr').click();
    else if (k === 'Escape' || k === 'p' || k === 'P') close();
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  return { open, close, go, steps, get on() { return on; }, get i() { return i; } };
}
