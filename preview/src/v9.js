// v9: recorded ambience (one bed per mode, crossfaded), rare horn stings, history corner controls
// (play/pause, sound, narrate), raised beasts in History, credits, first-visit orbit hint.
const BEDS = {
  assembled: [{ f: 'bed_164272', g: .32 }],                          // Abandoned Fields, ~-10 dB
  exploded: [{ f: 'bed_855641', g: .5 }],                            // Haunted Temple
  history: [{ f: 'bed_639585', g: .22, duck: true }, { f: 'bed_855641', g: .08, duck: true }], // story bed (~-28 LUFS) over the temple drone
};
const SK = 'dan2-sound';
export function createV9({ director, history, v7, params }) {
  const $ = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  let ctx = null, master, sfxBus, rev, buffers = {}, voices = {}, soundOn = localStorage.getItem(SK) !== 'off', started = false, nextSting = 0, lastMetal = null;
  window.__v9 = { get on() { return soundOn; }, get started() { return started; } };
  function impulse(sec = 3.2) { const n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); } return b; }
  async function load(f) { if (buffers[f]) return buffers[f]; buffers[f] = fetch(`data/audio/${f}.mp3`).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a)); return buffers[f]; }
  function start() {
    if (started) return; started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = soundOn ? 1 : 0; master.connect(ctx.destination);
    rev = ctx.createConvolver(); rev.buffer = impulse(); const wet = ctx.createGain(); wet.gain.value = .6; rev.connect(wet); wet.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master); sfxBus.connect(rev);
    ['bed_164272', 'bed_855641', 'bed_639585', 'horn_704440'].forEach(load);
    nextSting = ctx.currentTime + 45 + Math.random() * 75;
    syncDrone();
  }
  // one looping voice per file; gain follows the target of the current mode
  async function voice(f) {
    if (voices[f]) return voices[f]; const v = voices[f] = { g: ctx.createGain(), tgt: 0, src: null }; v.g.gain.value = 0; v.g.connect(master);
    const buf = await load(f); const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(v.g); s.start(ctx.currentTime + .05, Math.random() * buf.duration * .3); v.src = s; return v;
  }
  function mode() { if (history.active) return 'history'; const s = director.state; return s === 'exploded' || (s === 'focus' && director.base === 'exploded') ? 'exploded' : s === 'stone' ? 'stone' : 'assembled'; }
  function sting(gain = .1) {
    if (!ctx || !soundOn) return; load('horn_704440').then(buf => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = .9 + Math.random() * .16; const g = ctx.createGain(); g.gain.value = gain * (.7 + Math.random() * .5);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; const dry = ctx.createGain(); dry.gain.value = .45;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; s.connect(lp); lp.connect(g); if (pan) { pan.pan.value = Math.random() * 1.2 - .6; g.connect(pan); pan.connect(dry); } else g.connect(dry); dry.connect(master); g.connect(rev); s.start();
    });
  }
  function syncDrone() { const d = history.drone; if (!d) return; const want = soundOn && started && history.active; if (want && !d.on) d.toggle(); else if (!want && d.on) d.mute(); }
  function setSound(on) {
    soundOn = on; try { localStorage.setItem(SK, on ? 'on' : 'off'); } catch (e) { }
    if (!started && on) start(); if (ctx) { ctx.resume(); master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .04); }
    // v14: sound off mutes narration AND music/ambience — verify every path
    if (window.__vo) { window.__vo.muted = !on; if (!on) { try { window.__vo.pause(); } catch (e) {} } }
    if (!on && window.speechSynthesis) speechSynthesis.cancel();
    document.querySelectorAll('audio').forEach(a => { a.muted = !on; if (!on) { try { a.pause(); } catch (e) {} } });
    // also zero any WebAudio bed voices immediately
    if (ctx && !on) { for (const f in voices) { try { voices[f].g.gain.setTargetAtTime(0, ctx.currentTime, .02); voices[f].tgt = 0; } catch (e) {} } }
    syncDrone(); document.querySelectorAll('.snd, #snd-g').forEach(b => { b.classList.toggle('on', on); b.title = on ? 'Sound on' : 'Sound off'; });
  }
  // first gesture starts audio (browser autoplay rules); sound is on unless the visitor turned it off
  const kick = () => { if (soundOn) { start(); ctx.resume(); } removeEventListener('pointerdown', kick, true); removeEventListener('keydown', kick, true); };
  addEventListener('pointerdown', kick, true); addEventListener('keydown', kick, true);

  // ---------- history corner controls: play/pause, sound, narrate
  const hist = document.getElementById('hist'); const ctrl = hist.querySelector('.h-ctrl'); hist.appendChild(ctrl); ctrl.classList.add('v9');
  const snd = ctrl.querySelector('[data-a=sound]'); snd.removeAttribute('data-a'); snd.classList.toggle('on', soundOn);
  snd.addEventListener('click', e => { e.stopPropagation(); setSound(!soundOn); });
  const nBtn = document.querySelector('[data-v7=narrate]');
  const NARR = '<svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/><path class="x" d="M4 4l16 16"/></svg>';
  let narrOn = localStorage.getItem('dan2-narr') !== 'off';
  if (nBtn) {
    const orig = nBtn.onclick; nBtn.classList.add('narr'); nBtn.innerHTML = NARR; nBtn.title = 'Narration'; ctrl.appendChild(nBtn);
    const isOn = () => nBtn.classList.contains('on');
    nBtn.onclick = e => { orig.call(nBtn, e); nBtn.innerHTML = NARR; narrOn = isOn(); nBtn.title = narrOn ? 'Narration on' : 'Narration off'; try { localStorage.setItem('dan2-narr', narrOn ? 'on' : 'off'); } catch (er) { } };
    nBtn.classList.toggle('pre', narrOn);
    window.__v9narr = () => { if (narrOn && !isOn()) { orig.call(nBtn); nBtn.innerHTML = NARR; nBtn.classList.remove('pre'); } };
  }
  // v11 fb: the Playing/Paused label is shown again under the button

  // ---------- credits in the ⋯ menu
  const pop = document.querySelector('#share .sh-pop');
  if (pop) {
    const cb = $(`<button data-v9="credits" title="Audio credits"><svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg><span>Credits</span></button>`); pop.appendChild(cb);
    const sg = $(`<button id="snd-g" title="Sound"><svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="wv" d="M16 8.5c1.6 1.9 1.6 5.1 0 7"/></svg><span>Sound</span></button>`); pop.appendChild(sg); sg.classList.toggle('on', soundOn);
    sg.onclick = e => { e.stopPropagation(); setSound(!soundOn); };
    const cr = $(`<div id="credits"><div class="cr-in"><div class="cr-h">Audio credits</div><ul>
      <li>“The story you're about to hear… (music)” by <a href="https://freesound.org/people/xkeril/sounds/639585/" target="_blank" rel="noopener">xkeril</a>, a remix of sounds by leonseptavaux and Owstu. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>; looped and level-adjusted.</li>
      <li>“Haunted Temple Atmosphere – Horror Catacomb” by <a href="https://freesound.org/people/TommasoMotteran/sounds/855641/" target="_blank" rel="noopener">TommasoMotteran</a>. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>; looped and level-adjusted.</li>
      <li>“Dark Ambience – Abandoned Fields” by <a href="https://freesound.org/people/Dredile/sounds/164272/" target="_blank" rel="noopener">Dredile</a> (CC0, with thanks).</li>
      <li>“Viking Horn in D” by <a href="https://freesound.org/people/roemergruft/sounds/704440/" target="_blank" rel="noopener">roemergruft</a> (CC0, with thanks).</li>
      <li>Battle sounds mixed from “20 Sword Sound Effects (Attacks and Clashes)” by <a href="https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes" target="_blank" rel="noopener">StarNinjas</a> and “Crowd Shouting/Speaking Ambience” (<a href="https://opengameart.org/content/crowd-shoutingspeaking-ambience" target="_blank" rel="noopener">OpenGameArt</a>), CC0, with thanks.</li>
      <li>Guide voices generated with OpenAI text-to-speech; Russian and Spanish narration machine-translated, then voiced.</li>
      <li>Scripture: King James Version; Reina-Valera 1909; Russian Synodal translation (all public domain).</li>
      <li>Artifact photographs from Wikimedia Commons; author and licence are credited under each source.</li></ul><button class="ghost cr-x">Close <kbd>Esc</kbd></button></div></div>`);
    document.body.appendChild(cr);
    cb.onclick = e => { e.stopPropagation(); cr.classList.add('on'); document.getElementById('share').classList.remove('open'); };
    cr.addEventListener('click', e => { if (e.target === cr || e.target.closest('.cr-x')) cr.classList.remove('on'); });
    addEventListener('keydown', e => { if (e.key === 'Escape') cr.classList.remove('on'); });
  }

  // ---------- orbit hint: first visit only, briefly, top-right under the nav
  const hint = document.querySelector('#ui .hint');
  if (hint) { let seen = false; try { seen = localStorage.getItem('dan2-hint') === '1'; localStorage.setItem('dan2-hint', '1'); } catch (e) { }
    hint.classList.add('v9'); if (seen || params.has('static')) hint.remove(); else setTimeout(() => hint.classList.add('gone'), 7000); }

  let lastMode = null;
  return {
    sting, setSound,
    update(t, dt) {
      const m = mode();
      if (history.active && m !== lastMode) window.__v9narr && window.__v9narr();
      lastMode = m;
      // v14: History rise/seat is owned by beasts.js (world-bbox snap). Do not lift model.y here — it floated beasts.
      const B = window.beasts;
      if (!ctx) return;
      syncDrone();
      const vo = window.__vo, speaking = (vo && !vo.paused && !vo.ended) || (window.speechSynthesis && speechSynthesis.speaking);
      const want = {}; (BEDS[m] || []).forEach(b => (want[b.f] = (want[b.f] || 0) + b.g * (b.duck && speaking ? .2 : 1)));
      for (const f of new Set([...Object.keys(voices), ...Object.keys(want)])) {
        const g = want[f] || 0; if (!voices[f] && !g) continue; const p = voices[f] ? Promise.resolve(voices[f]) : voice(f);
        p.then(v => { if (v.tgt !== g) { v.tgt = g; v.g.gain.setTargetAtTime(g, ctx.currentTime, 1.4); } });
      }
      // handover horn + rare random horn
      const metal = history.active ? history.metal : null;
      if (metal && lastMetal && metal !== lastMetal) sting(.13); lastMetal = metal;
      if (ctx.currentTime > nextSting) { nextSting = ctx.currentTime + 45 + Math.random() * 75; if (m !== 'stone') sting(.08); }
    },
  };
}
