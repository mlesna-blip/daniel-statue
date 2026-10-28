// usage: node shoot.mjs [port]   (needs puppeteer-core: npm i puppeteer-core; serves must be running)
import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 8941;
const shots = [['assembled','state=assembled'],['exploded','state=exploded'],['focus-head','state=focus&section=head'],['focus-feet','state=focus&section=feet'],['stone-mid-shatter','state=stone&t=5.2']];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=1440,900'] });
for (const [name, q] of shots) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs = [];
  p.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.type()+': '+m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto(`http://localhost:${port}/?static&${q}`, { timeout: 180000 });
  await p.waitForFunction('window.__ready === true', { timeout: 240000 }); await new Promise(r => setTimeout(r, 4000));
  await p.screenshot({ path: `shots/${name}.png` }); console.log('==', name, errs.length ? errs.join(' | ') : 'no console errors'); await p.close();
}
await b.close();
