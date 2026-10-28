// Minimal overlay UI. All styling lives in style.css.
const MARKS = ['Babylon', 'Medo-Persia', 'Greece', 'Rome', 'Divided', 'The Stone'];
export function createUI() {
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const root = $(`<div id="ui">
    <header class="title"><div class="eyebrow">The Dream of Nebuchadnezzar</div><h1>The Great Image</h1><div class="sub">Daniel 2 : 31 – 45</div></header>
    <nav class="modes"><button data-act="assembled" class="on">Assembled</button><button data-act="exploded">Exploded</button><button data-act="stone">The Stone</button><button data-act="history">History</button><button data-act="reset" class="ghost">Reset</button></nav>
    <aside class="panel"><div class="p-part"></div><h2 class="p-kingdom"></h2><div class="p-era"></div><div class="rule"></div><blockquote class="p-quote"></blockquote><div class="p-ref"></div><p class="p-desc"></p>
      <div class="p-actions"><button class="toes" data-act="toes">Separate the ten toes</button><button class="play" data-act="stone">Let the stone fall</button><button class="back ghost" data-act="back">Return <kbd>Esc</kbd></button></div></aside>
    <div class="hover"></div>
    <div class="caption"><div class="c-text"></div><div class="c-ref"></div></div>
    <footer class="timeline"><div class="track"><div class="fill"></div>${MARKS.map((m, i) => `<button class="mark" data-i="${i}" style="left:${i * 20}%"><span class="dot"></span><span class="lbl">${m}</span></button>`).join('')}</div>
      <input type="range" min="0" max="5" step="0.001" value="0" aria-label="Timeline from Babylon to the Stone"></footer>
    <div class="hint">Drag to orbit · Scroll to zoom · Click a section</div>
    <div class="flash"></div></div>`);
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s), handlers = {};
  const emit = (n, ...a) => handlers[n] && handlers[n](...a);
  root.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) emit(b.dataset.act); const m = e.target.closest('.mark'); if (m) { setScrub(+m.dataset.i); emit('scrub', +m.dataset.i); } });
  const range = q('input[type=range]');
  range.addEventListener('input', () => { const v = +range.value; q('.fill').style.width = v * 20 + '%'; emit('scrub', Math.round(v)); });
  range.addEventListener('change', () => setScrub(Math.round(+range.value)));
  function setScrub(i, silent) { range.value = i; q('.fill').style.width = i * 20 + '%'; root.querySelectorAll('.mark').forEach((m, k) => m.classList.toggle('on', k <= i)); }
  const ui = {
    root, on: (n, f) => (handlers[n] = f),
    setMode(mode) { root.dataset.mode = mode; root.querySelectorAll('.modes button').forEach(b => b.classList.toggle('on', b.dataset.act === mode || (mode === 'focus' && false))); },
    showPanel(d, opts = {}) {
      q('.p-part').textContent = `${d.part} · ${d.metal}`; q('.p-kingdom').textContent = d.kingdom; q('.p-era').textContent = d.era;
      q('.p-quote').textContent = d.quote; q('.p-ref').textContent = d.ref; q('.p-desc').textContent = d.desc;
      const p = q('.panel'); p.classList.add('open'); p.classList.toggle('focus', !!opts.focus); p.classList.toggle('has-toes', !!opts.toes); p.classList.toggle('is-stone', !!opts.stone);
    },
    hidePanel() { q('.panel').classList.remove('open'); },
    setToes(open) { q('.toes').textContent = open ? 'Rejoin the toes' : 'Separate the ten toes'; if (open) { q('.p-quote').textContent = '“And as the toes of the feet were part of iron, and part of clay, so the kingdom shall be partly strong, and partly broken.”'; q('.p-ref').textContent = 'Daniel 2:42'; } },
    hover(text, x, y) { const h = q('.hover'); if (!text) { h.classList.remove('on'); return; } h.textContent = text; h.style.transform = `translate(${x + 16}px, ${y + 12}px)`; h.classList.add('on'); },
    setCaption(text, ref = '') { const c = q('.caption'); if (c.dataset.t === text) return; c.dataset.t = text; c.classList.remove('on'); if (!text) return; requestAnimationFrame(() => { q('.c-text').textContent = text; q('.c-ref').textContent = ref; c.classList.add('on'); }); },
    setFlash(v) { q('.flash').style.opacity = v * .4; },
    setScrub,
  };
  return ui;
}
