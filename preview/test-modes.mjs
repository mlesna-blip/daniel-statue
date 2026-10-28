// Clicks through every mode transition in both directions and checks state + console errors.
import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 8971;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs = [];
p.on('console', m => { if (['error'].includes(m.type())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
await p.goto(`http://localhost:${port}/?lod=low`, { timeout: 180000 }); await p.waitForFunction('window.__ready === true', { timeout: 240000 });
const W = ms => new Promise(r => setTimeout(r, ms));
const click = async sel => { await p.waitForSelector(sel, { visible: true, timeout: 5000 }); const el = await p.$(sel); const box = await el.boundingBox(); await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); };
const state = () => p.evaluate(() => `${window.history3d.active ? 'HISTORY' : window.director.state}`);
const steps = [
  ['#ui [data-act=exploded]', 'exploded'], ['#ui [data-act=assembled]', 'assembled'], ['#ui [data-act=stone]', 'stone'], ['#ui [data-act=exploded]', 'exploded'],
  ['#ui [data-act=stone]', 'stone'], ['#ui [data-act=reset]', 'assembled'], ['#ui [data-act=history]', 'HISTORY'], ['#hist [data-a=free]', 'HISTORY'], ['#hist [data-a=exit]', 'assembled'],
  ['#ui [data-act=exploded]', 'exploded'], ['#ui [data-act=history]', 'HISTORY'], ['#hist [data-a=play]', 'HISTORY'], ['#hist [data-a=exit]', 'assembled'], ['#ui [data-act=stone]', 'stone'],
  ['#ui [data-act=history]', 'HISTORY'], ['#hist .ev-btn', 'HISTORY'], ['#hist [data-a=evclose]', 'HISTORY'], ['#hist [data-a=exit]', 'assembled'], ['#ui [data-act=exploded]', 'exploded'], ['#ui [data-act=assembled]', 'assembled'],
];
let ok = true;
for (const [sel, want] of steps) {
  try { await click(sel); } catch (e) { console.log('FAIL click', sel, e.message); ok = false; continue; }
  await W(sel.includes('history') ? 2500 : 1800); const s = await state(); const pass = s === want; ok &&= pass; console.log(pass ? 'ok  ' : 'FAIL', sel.padEnd(28), '->', s, pass ? '' : `(wanted ${want})`);
}
await p.screenshot({ path: 'shots/v6-after-transitions.png' });
console.log(ok ? 'ALL TRANSITIONS OK' : 'SOME FAILED', '| console errors:', errs.length ? errs.join(' | ') : 'none');
await b.close();
