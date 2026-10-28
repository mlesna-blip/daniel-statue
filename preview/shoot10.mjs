import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 8994, lod = process.argv[3] || 'high';
const W = ms => new Promise(r => setTimeout(r, ms));
const orbit = a => async p => { await p.evaluate(a => { const c = director.camera, t = director.controls.target; const dx = c.position.x - t.x, dz = c.position.z - t.z, r = Math.hypot(dx, dz), a0 = Math.atan2(dx, dz); c.position.x = t.x + Math.sin(a0 + a) * r; c.position.z = t.z + Math.cos(a0 + a) * r; director.controls.update(); }, a); await W(2500); };
const ONLY = process.argv[4]; const shots0 = [
  ['assembled-front', 'state=assembled'], ['assembled-threequarter', 'state=assembled', orbit(Math.PI / 4)], ['assembled-back', 'state=assembled', orbit(Math.PI)],
  ['exploded', 'state=exploded'], ['history-silver', 'mode=history&s=2.2', async p => { await W(4000); }], ['history-bronze', 'mode=history&s=5.6'],
]; const shots = ONLY ? shots0.filter(s => new RegExp(ONLY).test(s[0])) : shots0;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
for (const [name, q, act] of shots) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });
  p.on('requestfailed', r => errs.push('FAILED ' + r.url()));
  await p.goto(`http://127.0.0.1:${port}/?static&lod=${lod}&${q}`, { timeout: 180000 });
  await p.waitForFunction('window.__ready === true', { timeout: 240000 }); await p.waitForFunction('window.__beastsLoaded === true', { timeout: 240000 }).catch(() => errs.push('beasts timeout')); await W(5000);
  if (act) await act(p);
  await p.screenshot({ path: `shots/v10s-${name}${lod === 'low' ? '-lod' : ''}.png` });
  console.log('==', name, errs.length ? errs.join(' | ') : 'clean'); await p.close();
}
await b.close();
