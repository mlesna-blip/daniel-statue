// Ancient-inspired ambient score + event SFX, synthesised with WebAudio (no audio files, nothing to license).
// Muted by default; toggle() builds the graph on the first user click.
const ERA = {
  // root Hz, scale (semitones), tempo (bpm), voice
  head:  { root: 110.0, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 58, voice: 'lyre' },   // Babylon: Hijaz-like lyre
  chest: { root: 98.0,  scale: [0, 2, 3, 5, 7, 8, 10], bpm: 54, voice: 'horn' },   // Persia: long karnay horns
  belly: { root: 116.5, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 62, voice: 'aulos' },  // Greece: double reed, Dorian
  legs:  { root: 87.3,  scale: [0, 2, 3, 5, 7, 8, 10], bpm: 72, voice: 'brass' },  // Rome: cornu & march drums
  feet:  { root: 82.4,  scale: [0, 1, 3, 6, 7, 8, 11], bpm: 50, voice: 'broken' }, // the divided kingdoms
};
// v9: the synthesized score is off (recorded beds in src/v9.js replace it); event SFX stay.
const SCORE = false;
export function createDrone() {
  let ctx, master, bus, wet, pads = [], sub, on = false, era = 'head', timer = null, nextBeat = 0, beat = 0, nextPhrase = 0, noiseBuf, plucks = new Map();
  const R = (a, b) => a + Math.random() * (b - a);
  const hz = (st, oct = 0) => ERA[era].root * Math.pow(2, st / 12 + oct);
  function impulse(sec = 4.2) { const n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); } return b; }
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; master.connect(comp); comp.connect(ctx.destination);
    bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
    const rev = ctx.createConvolver(); rev.buffer = impulse(); wet = ctx.createGain(); wet.gain.value = .55; rev.connect(wet); wet.connect(master);
    bus.connect(rev); bus.rev = rev;
    const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // pad: three slow, dark voices (root, fifth, minor third / octave), each two detuned saws under a breathing low-pass
    const padF = ctx.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 520; padF.Q.value = .7;
    const padG = ctx.createGain(); padG.gain.value = SCORE ? .05 : 0; padF.connect(padG); padG.connect(bus);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .05; lg.gain.value = 220; lfo.connect(lg); lg.connect(padF.frequency); lfo.start();
    [[0, -1], [7, -1], [3, 0], [0, 0]].forEach(([st, oct], k) => { for (const det of [-7, 6]) { const o = ctx.createOscillator(); o.type = k === 3 ? 'triangle' : 'sawtooth'; o.detune.value = det; o.frequency.value = hz(st, oct); const g = ctx.createGain(); g.gain.value = k === 3 ? .5 : .33; o.connect(g); g.connect(padF); o.start(); pads.push({ o, st, oct }); } });
    sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = hz(0, -2); const sg = ctx.createGain(); sg.gain.value = SCORE ? .12 : 0; sub.connect(sg); sg.connect(bus); sub.start();
    // night wind + distant fire bed
    const w = ctx.createBufferSource(); w.buffer = noiseBuf; w.loop = true; const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 380; wf.Q.value = .5; const wg = ctx.createGain(); wg.gain.value = SCORE ? .018 : 0;
    const wl = ctx.createOscillator(), wlg = ctx.createGain(); wl.frequency.value = .08; wlg.gain.value = 180; wl.connect(wlg); wlg.connect(wf.frequency); wl.start(); w.connect(wf); wf.connect(wg); wg.connect(bus); w.start();
    nextBeat = ctx.currentTime + .3; nextPhrase = ctx.currentTime + 2;
    timer = setInterval(schedule, 120);
  }
  // ---------- instruments
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  function noise(t, dur, type, f, q, peak, a = .002, dest = bus) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = R(.8, 1.2); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); env(g, t, a, peak, dur); s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + a + dur + .05); }
  function drum(t, big = 1) { // frame drum "dum": pitched thump + skin
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110 * big, t); o.frequency.exponentialRampToValueAtTime(46, t + .25); env(g, t, .004, .32 * big, .5); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .7);
    noise(t, .12, 'bandpass', 240, 1.2, .08 * big);
  }
  function tek(t, v = 1) { noise(t, .05, 'bandpass', 2200, 2.5, .05 * v); }
  function pluckBuf(f) { // Karplus-Strong lyre string, cached per pitch
    const key = Math.round(f * 10); if (plucks.has(key)) return plucks.get(key);
    const sr = ctx.sampleRate, n = Math.floor(sr * 2.4), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), P = Math.max(2, Math.round(sr / f));
    const ring = new Float32Array(P); for (let i = 0; i < P; i++) ring[i] = Math.random() * 2 - 1; let idx = 0, prev = 0;
    for (let i = 0; i < n; i++) { const cur = ring[idx]; const nv = .497 * (cur + prev); prev = cur; ring[idx] = nv; d[i] = cur; idx = (idx + 1) % P; }
    plucks.set(key, b); return b;
  }
  function lyre(t, f, v = .22) { const s = ctx.createBufferSource(); s.buffer = pluckBuf(f); const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 2600; const g = ctx.createGain(); g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(bus); s.start(t); }
  function horn(t, f, dur, v = .1, bright = 900) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + dur * .35); g.gain.setTargetAtTime(0, t + dur * .7, dur * .15);
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 2; fl.frequency.setValueAtTime(200, t); fl.frequency.linearRampToValueAtTime(bright, t + dur * .4); fl.frequency.linearRampToValueAtTime(300, t + dur);
    for (const [type, det, m] of [['sawtooth', -5, 1], ['sawtooth', 6, 1], ['square', 0, .5]]) { const o = ctx.createOscillator(); o.type = type; o.detune.value = det; o.frequency.setValueAtTime(f * m * .97, t); o.frequency.linearRampToValueAtTime(f * m, t + .25); o.connect(fl); o.start(t); o.stop(t + dur * 1.4); }
    fl.connect(g); g.connect(bus);
  }
  function aulos(t, f, dur, v = .05) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .08); g.gain.setValueAtTime(v, t + dur * .8); g.gain.linearRampToValueAtTime(0, t + dur);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 3; bp.Q.value = 1.4;
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.value = f * .012; vib.connect(vg); vib.start(t); vib.stop(t + dur + .1);
    for (const det of [0, 9]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; o.detune.value = det; vg.connect(o.frequency); o.connect(bp); o.start(t); o.stop(t + dur + .1); }
    // the drone pipe
    const dr = ctx.createOscillator(); dr.type = 'square'; dr.frequency.value = hz(0, 1); const dg = ctx.createGain(); dg.gain.value = .25; dr.connect(dg); dg.connect(bp); dr.start(t); dr.stop(t + dur + .1);
    bp.connect(g); g.connect(bus);
  }
  // ---------- score
  function phrase(t) {
    const E = ERA[era], sc = E.scale, pick = (o = 1) => hz(sc[(Math.random() * sc.length) | 0], o);
    if (E.voice === 'lyre' || E.voice === 'broken') {
      let tt = t; let deg = (Math.random() * 4) | 0; const n = E.voice === 'broken' ? 3 : 5 + ((Math.random() * 4) | 0);
      for (let k = 0; k < n; k++) { deg = Math.max(0, Math.min(sc.length - 1, deg + ((Math.random() * 3) | 0) - 1)); lyre(tt, hz(sc[deg], 1), E.voice === 'broken' ? .14 : .2); if (Math.random() < .3) lyre(tt + .02, hz(sc[deg], 0), .12); tt += [.35, .5, .7, 1][(Math.random() * 4) | 0]; }
      if (E.voice === 'broken' && Math.random() < .6) horn(t + 1.2, hz(1, -1), 4, .05, 500);
      return tt - t + R(3, 6);
    }
    if (E.voice === 'horn') { const f = Math.random() < .6 ? hz(0, 0) : hz(7, -1); horn(t, f, R(4, 6), .09, 800); if (Math.random() < .5) horn(t + .6, f * 1.5, 4, .045, 700); if (Math.random() < .5) lyre(t + 3, pick(1), .12); return R(7, 10); }
    if (E.voice === 'aulos') { let tt = t, deg = 2; for (let k = 0; k < 4 + ((Math.random() * 3) | 0); k++) { deg = Math.max(0, Math.min(sc.length - 1, deg + ((Math.random() * 3) | 0) - 1)); const d = [.5, .75, 1.2][(Math.random() * 3) | 0]; aulos(tt, hz(sc[deg], 1), d); tt += d; } return tt - t + R(3, 5); }
    if (E.voice === 'brass') { horn(t, hz(0, 0), 2.2, .09, 1500); horn(t + 2.4, hz(7, 0), 1.2, .08, 1600); horn(t + 3.7, hz(0, 0), 3, .09, 1400); return R(8, 11); }
    return 6;
  }
  function schedule() {
    if (!on || !SCORE) return; const now = ctx.currentTime, E = ERA[era], spb = 60 / E.bpm;
    while (nextBeat < now + .4) {
      const b = beat % 8;
      if (E.voice === 'brass') { if (b % 2 === 0) drum(nextBeat, b === 0 ? 1.2 : .8); if (b % 2 === 1) tek(nextBeat, .7); }
      else { if (b === 0 || b === 5) drum(nextBeat, b === 0 ? 1 : .7); if (b === 3 || b === 7) tek(nextBeat, .6); if (b === 6 && Math.random() < .4) tek(nextBeat + spb * .5, .4); }
      if (Math.random() < .25) noise(nextBeat + Math.random() * spb, .03, 'highpass', 3000, .7, .02); // distant fire crackle
      nextBeat += spb; beat++;
    }
    if (nextPhrase < now + .4) nextPhrase += phrase(Math.max(nextPhrase, now + .05));
  }
  // ---------- event SFX
  function clash(t0, dur = 3) {
    for (let k = 0; k < 26; k++) { const t = t0 + Math.random() * dur; noise(t, .12, 'highpass', 2500, .8, .06); for (const f of [R(480, 620), R(1300, 1500), R(2100, 2500)]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; env(g, t, .001, .02, R(.2, .45)); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .6); } }
    noise(t0, dur + 1, 'bandpass', 650, .8, .09, .8);  // crowd roar / shouting
    noise(t0 + .3, dur, 'bandpass', 1100, 1.5, .03, .6);
  }
  function warDrums(t0, n = 9) { let t = t0; for (let k = 0; k < n; k++) { drum(t, 1.3); if (k % 2) drum(t + .12, .7); t += .55 - k * .025; } }
  function fireBurst(t0, dur = 5) { noise(t0, dur, 'lowpass', 500, .5, .05, 1.2); for (let k = 0; k < 40; k++) noise(t0 + Math.random() * dur, .02, 'highpass', 2500, .5, .04); }
  function gong(t, f = 55) { for (const [m, v, d] of [[1, .2, 5], [2.76, .05, 3], [5.4, .02, 2]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * m; env(g, t, .01, v, d); o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + .2); } }
  return {
    toggle() { if (!ctx) build(); on = !on; ctx.resume(); master.gain.setTargetAtTime(on ? .5 : 0, ctx.currentTime, .8); if (on) { nextBeat = ctx.currentTime + .2; nextPhrase = ctx.currentTime + 1.5; } return on; },
    mute() { if (ctx && on) { on = false; master.gain.setTargetAtTime(0, ctx.currentTime, .5); } },
    get on() { return on; },
    setEra(metal) {
      if (!ERA[metal] || metal === era) { era = ERA[metal] ? metal : era; return; }
      era = metal; if (!ctx) return; const t = ctx.currentTime;
      pads.forEach(({ o, st, oct }) => o.frequency.setTargetAtTime(hz(st, oct), t, 2.5)); sub.frequency.setTargetAtTime(hz(0, -2), t, 2.5);
      if (on) { gong(t + .05, hz(0, -1)); if (SCORE) horn(t + .4, hz(0, -1), 5, .07, 600); }
    },
    battle() { if (!ctx || !on) return; const t = ctx.currentTime + .05; warDrums(t); horn(t + .2, hz(0, -1), 3, .1, 1100); clash(t + 2.2, 3.5); fireBurst(t + 3.5, 6); },
    event() { if (!ctx || !on) return; gong(ctx.currentTime + .05, hz(7, -2)); },
  };
}
