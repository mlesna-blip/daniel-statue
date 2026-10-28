// usage: node shoot8.mjs [port] [regex] -> shots/v8-*.png
import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 8990, only = process.argv[3];
const W = ms => new Promise(r => setTimeout(r, ms));
const hover = sec => async p => { await p.evaluate(s => { const o = director.statue.sections[s]; const v = o.getWorldPosition(new o.position.constructor()).project(director.camera); window.__hx = [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight]; }, sec); const [x, y] = await p.evaluate(() => window.__hx); await p.mouse.move(x, y); await W(2500); };
const shots = [
  ['assembled', 'state=assembled'], ['assembled-hover', 'state=assembled', hover('chest')], ['exploded', 'state=exploded', hover('head')],
  ['beast-flyout', 'state=exploded&beast=bear'], ['history-paused', 'mode=history&s=3'],
  ['history-playing', 'mode=history&s=5.6', async p => { await p.evaluate(() => document.querySelector('#hist [data-a=play]').click()); await W(3000); }],
  ['era-change', 'mode=history&s=2&pull=1&co'], ['sky', 'state=assembled', async p => { await p.evaluate(() => { director.camera.position.set(0, 4, 80); director.controls.target.set(0, 400, -40); director.controls.update(); }); await W(1500); }],
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
  await p.waitForFunction('window.__ready === true', { timeout: 240000 }); await p.waitForFunction('window.__beastsLoaded === true', { timeout: 240000 }).catch(() => errs.push('beasts timeout')); await W(5000);
  if (act) await act(p);
  await p.screenshot({ path: `shots/v8-${name}.png` }); if (name === 'history-paused') await p.screenshot({ path: 'shots/v8-timeline.png', clip: { x: 150, y: 680, width: 1290, height: 220 } });
  console.log('==', name, errs.length ? errs.join(' | ') : 'clean'); await p.close();
}
await b.close();
