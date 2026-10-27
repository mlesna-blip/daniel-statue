// v10: light-weight translation layer. data/i18n/<lang>.json maps exact English strings to the translation.
// Every text node and title attribute in the page is translated as it appears (MutationObserver), so the existing
// modules keep writing English and the visitor reads Russian or Spanish. Composite strings are split on " · ".
export const LANGS = { en: 'English', ru: 'Русский', es: 'Español' };
export function pickLang(params) { let l = params.get('lang') || localStorage.getItem('dan2-lang') || 'en'; return l in LANGS ? l : 'en'; }
export function installI18n(dict) {
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const D = new Map(); for (const k in dict) D.set(norm(k), dict[k]);
  const tr = s => {
    const n = norm(s); if (!n) return null; if (D.has(n)) return D.get(n);
    if (n.includes(' · ')) { const parts = n.split(' · '); let hit = false; const out = parts.map(p => { if (D.has(p)) { hit = true; return D.get(p); } return p; }); if (hit) return out.join(' · '); }
    const m = n.match(/^(.*?)(\s*[:：]\s*)(.+)$/); if (m && D.has(m[1])) return D.get(m[1]) + m[2] + (D.get(m[3]) || m[3]);
    return null;
  };
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/;
  function node(n) {
    if (n.nodeType === 3) { if (n.parentNode && SKIP.test(n.parentNode.nodeName)) return; const t = tr(n.nodeValue); if (t != null && t !== norm(n.nodeValue)) { const lead = n.nodeValue.match(/^\s*/)[0], tail = n.nodeValue.match(/\s*$/)[0]; n.nodeValue = lead + t + tail; } return; }
    if (n.nodeType !== 1) return;
    for (const a of ['title', 'aria-label', 'alt', 'placeholder']) { const v = n.getAttribute && n.getAttribute(a); if (v) { const t = tr(v); if (t != null && t !== v) n.setAttribute(a, t); } }
    for (const c of n.childNodes) node(c);
  }
  node(document.body);
  new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') node(m.target); else if (m.type === 'attributes') node(m.target); else m.addedNodes.forEach(node); } })
    .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'alt', 'placeholder'] });
  window.__tr = s => tr(s) ?? s;
}
