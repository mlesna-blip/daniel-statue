// usage: node shoot-history.mjs [port]  (server must be running in this folder)
import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 8957;
const s = { bc605: 0, bc539: 2, bc331: 5, bc63: 8, ad476: 12 };
const shots = [['intro-statue', 'mode=history&intro=0'], ['intro-push', 'mode=history&intro=0.55'],
  ...Object.entries(s).map(([n, v]) => [`map-${n}`, `mode=history&s=${v}`]),
  ['map-539-arrival', 'mode=history&s=1.86'], ['map-331-march', 'mode=history&s=4.6'], ['freelook', 'mode=history&s=6&free'], ['v3-assembled', 'state=assembled']];
const only = process.argv[3];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
for (const [name, q] of shots) {
  if (only && !name.includes(only)) continue;
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto(`http://localhost:${port}/?static&lod=low&${q}`, { timeout: 180000 });
  await p.waitForFunction('window.__ready === true', { timeout: 240000 }); await new Promise(r => setTimeout(r, 7000));
  await p.screenshot({ path: `shots/${name}.png` }); console.log('==', name, errs.length ? errs.join(' | ') : 'no console errors'); await p.close();
}
await b.close();
