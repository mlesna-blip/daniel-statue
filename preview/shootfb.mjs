// v11o statue checks: node shoot11d.mjs [regex]   (server on :9011 from this folder)
import puppeteer from 'puppeteer-core';
const W = ms => new Promise(r => setTimeout(r, ms)); const ONLY = process.argv[2];
const orbit = a => `(()=>{const c=director.camera,t=director.controls.target;const dx=c.position.x-t.x,dz=c.position.z-t.z,r=Math.hypot(dx,dz),a0=Math.atan2(dx,dz);c.position.x=t.x+Math.sin(a0+${a})*r;c.position.z=t.z+Math.cos(a0+${a})*r;director.controls.update();})()`;
const S = [
  ['assembled', 'state=assembled&statue=v11o'],
  ['buttons', 'state=assembled&statue=v11o', null, `document.querySelector('#tools')&&0`],
  ['tales-wide', 'state=assembled&statue=v11o', null, `(()=>{const c=director.camera,t=director.controls.target;t.set(60,40,-300);c.position.set(80,140,420);director.controls.update()})()`],
  ['tales-default-far', 'state=assembled&statue=v11o', null, `(()=>{const c=director.camera,t=director.controls.target;const d=c.position.clone().sub(t).multiplyScalar(2.2);c.position.copy(t).add(d);director.controls.update()})()`],
  ['tale-tree', 'state=assembled&statue=v11o', null, `v10.openTale('tree')`, 5000],
  ['tale-furnace', 'state=assembled&statue=v11o', null, `v10.openTale('furnace')`, 5000],
  ['tale-den', 'state=assembled&statue=v11o', null, `v10.openTale('den')`, 5000],
  ['exploded-noverse', 'state=exploded&statue=v11o', null, `document.dispatchEvent(new PointerEvent('pointerdown'))`],
  ['quiz', 'state=assembled&statue=v11o', null, `document.getElementById('quiz-btn').click()`],
  ['history-head', 'mode=history&s=2.2&statue=v11o'],
  ['history-s0', 'mode=history&s=0.2&statue=v11o'],
  ['history-s5', 'mode=history&s=5.2&statue=v11o'],
  ['history-evidence', 'mode=history&s=2.2&statue=v11o', null, `document.querySelector('#hist .ev-btn').click()`],
  ['history-evidence2', 'mode=history&s=4.2&statue=v11o', null, `document.querySelector('#hist .ev-btn').click()`],
  ['history-playing', 'mode=history&s=2.2&statue=v11o', null, `document.querySelector('#hist [data-a=play]').click()`, 1500],
].filter(s => !ONLY || new RegExp(ONLY).test(s[0]));
const INFO = `JSON.stringify(Object.fromEntries(Object.entries(director.statue.sections).map(([k,g])=>[k,{home:g.userData.home.toArray().map(v=>+v.toFixed(2)),bottom:+g.userData.bottom.toFixed(2),top:+(g.userData.bottom+g.userData.size.y).toFixed(2),band:(g.userData.band||[]).map(v=>+v.toFixed(2))}])))`;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
for (const [name, q, pre, act, wait] of S) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); }); p.on('requestfailed', r => errs.push('FAILED ' + r.url()));
  const lod = q.includes('lod=') ? '' : '&lod=high';
  await p.goto('http://127.0.0.1:9011/?static' + lod, { timeout: 180000 }); await p.evaluate(`localStorage.setItem('dan2-lang','en');${pre || ''}`);
  await p.goto(`http://127.0.0.1:9011/?static${lod}&${q}`, { timeout: 180000 });
  if (/holdload/.test(q)) { await W(9000); await p.screenshot({ path: `shots/fb-${name}.png` }); console.log('==', name, errs.length ? errs.join(' | ') : 'clean'); await p.close(); continue; }
  await p.waitForFunction('window.__ready === true', { timeout: 240000 }); await W(6000);
  if (act) { await p.evaluate(act); await W(wait || 2500); }
  await p.screenshot({ path: `shots/fb-${name}.png` });
  let info = await p.evaluate(`JSON.stringify({sc:director.statue.root.scale.x,narr:[...document.querySelectorAll('.dd-narr')].map(e=>getComputedStyle(e).display),card:(()=>{const e=document.querySelector('#hist .card');if(!e)return 0;const r=e.getBoundingClientRect();return [r.top|0,r.bottom|0,e.scrollHeight,e.clientHeight]})(),ev:(()=>{const e=document.querySelector('#hist .evidence');if(!e)return 0;const r=e.getBoundingClientRect();return [r.top|0,r.bottom|0,e.scrollHeight,e.clientHeight]})(),verse:document.getElementById('vverse').className})`);
  console.log('==', name, errs.length ? errs.join(' | ') : 'clean', info); await p.close();
}
await b.close();
