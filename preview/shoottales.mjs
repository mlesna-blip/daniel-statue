// v12 Hunyuan tales: node shoottales.mjs [regex]  (server on :9013)
import puppeteer from 'puppeteer-core';
const W = ms => new Promise(r => setTimeout(r, ms)); const ONLY = process.argv[2]; const H = 'http://127.0.0.1:9013/';
const WIDE = `(()=>{const c=director.camera,t=director.controls.target;t.set(40,40,-300);c.position.set(60,130,380);director.controls.update()})()`;
const S = [['wide', WIDE], ['wide-low', `(()=>{const c=director.camera,t=director.controls.target;t.set(40,30,-400);c.position.set(0,60,120);director.controls.update()})()`], ['tale-furnace', `v10.openTale('furnace')`], ['tale-tree', `v10.openTale('tree')`], ['tale-den', `v10.openTale('den')`]].filter(s => !ONLY || new RegExp(ONLY).test(s[0]));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
for (const [name, act] of S) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() !== 'log' && errs.push(m.text().slice(0, 160)));
  await p.goto(H + '?static', { timeout: 180000 }); await p.evaluate(`localStorage.setItem('dan2-lang','en')`);
  await p.goto(H + '?static&lod=high&statue=v11o&state=assembled', { timeout: 180000 }); await p.waitForFunction('window.__ready === true', { timeout: 300000, polling: 1000 }); await W(3000);
  await p.evaluate('window.__loadTalesHQ()'); await W(12000); await p.evaluate(act); await W(7000);
  await p.screenshot({ path: `shots/tq-${name}.png` }); console.log('==', name, errs.join(' | ') || 'clean'); await p.close();
}
await b.close();
