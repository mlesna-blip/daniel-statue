// usage: node shoot6.mjs [port] [filter]  -> shots/v6-*.png, reports console errors + failed/404 requests
import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 8971, only = process.argv[3];
const W = ms => new Promise(r => setTimeout(r, ms));
const shots = [
  ['statue', 'state=assembled&glyphs'], ['exploded', 'state=exploded'], ['focus-chest', 'state=focus&section=chest'], ['focus-head', 'state=focus&section=head'],
  ['h539-paused', 'mode=history&s=2'], ['h539-pull', 'mode=history&s=2.0&pull=1'], ['h331-battle', 'mode=history&s=4.9'], ['h168', 'mode=history&s=7'], ['h476', 'mode=history&s=12'],
  ['h-playing', 'mode=history&s=0', async p => { await p.mouse.click(720, 300); await W(2500); }],
  ['stone-windup', 'state=stone&t=2.2'], ['stone-impact', 'state=stone&t=3.12'], ['stone-break', 'state=stone&t=4.2'], ['stone-chaff', 'state=stone&t=6.5'], ['stone-mountain', 'state=stone&t=12'], ['stone-end', 'state=stone&t=16'],
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
  await p.screenshot({ path: `shots/v6-${name}.png` }); console.log('==', name, errs.length ? errs.join(' | ') : 'clean'); await p.close();
}
await b.close();
