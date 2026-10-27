// v8: small UI glue. Beast line icons sit above each empire name on the history timeline; the current
// empire's icon and name grow and glow while playback is inside it.
import { SEC_BEAST } from './callouts.js';
export function createV8({ world, director, history, v7, params }) {
  const bands = document.querySelectorAll('#hist .h-timeline .band');
  bands.forEach(b => {
    const sp = b.querySelector('span'); const name = sp.textContent; const bid = SEC_BEAST[b.dataset.m];
    sp.innerHTML = `${bid ? `<button class="band-ic" data-beast="${bid}" title="Open the beast of Daniel 7"><img src="data/beasts/line/${bid}.png" alt=""></button>` : '<i class="band-ic none"></i>'}<em></em>`;
    sp.querySelector('em').textContent = name;
  });
  document.addEventListener('click', e => { const m = e.target.closest('.band-ic[data-beast]'); if (m) { e.stopPropagation(); v7.openBeast(m.dataset.beast); } });
  // the clay-tablet buttons sit beside whichever timeline is showing
  const tools = document.createElement('div'); tools.id = 'tools'; document.body.appendChild(tools);
  ['codex-btn', 'dtab-btn'].forEach(id => { const el = document.getElementById(id); if (el) tools.appendChild(el); });
  const sh = document.getElementById('share'); if (sh) tools.appendChild(sh);
}
