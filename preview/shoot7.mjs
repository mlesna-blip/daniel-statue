// usage: node shoot7.mjs [port] [regex]  -> shots/v7-*.png
import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 8983, only = process.argv[3];
const W = ms => new Promise(r => setTimeout(r, ms));
const shots = [
  ['assembled', 'state=assembled'], ['exploded', 'state=exploded'], ['beast-bear', 'state=exploded&beast=bear'],
  ['codex-2300', 'state=assembled&codex=2300'], ['tablet', 'state=assembled&tablet', async p => { await p.evaluate(() => { v7.discover('platform'); v7.discover('codex'); }); await W(800); }],
  ['h-guide-daniel', 'mode=history&year=-539&guide=daniel'], ['h-beasts', 'mode=history&s=5&guide=nebuchadnezzar'], ['h-pull', 'mode=history&s=2&pull=1'],
  ['stone-impact', 'state=stone&t=3.12'], ['focus', 'state=focus&section=belly'],
];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
for (const [name, q, act] of shots) {
  if (only && !new RegExp(only).test(name)) continue;
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });
  p.on('requestfailed', r => errs.push('FAILED ' + r.url()));
  await p.goto(`http://localhost:${port}/?static&lod=low&${q}`, { timeout: 180000 });
  await p.waitForFunction('window.__ready === true', { timeout: 240000 }); await W(6000);
  if (act) await act(p);
  await p.screenshot({ path: `shots/v7-${name}.png` }); console.log('==', name, errs.length ? errs.join(' | ') : 'clean'); await p.close();
}
await b.close();
