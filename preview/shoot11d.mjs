// v11d statue checks: node shoot11d.mjs [regex]   (server on :9011 from this folder)
import puppeteer from 'puppeteer-core';
const W = ms => new Promise(r => setTimeout(r, ms)); const ONLY = process.argv[2];
const orbit = a => `(()=>{const c=director.camera,t=director.controls.target;const dx=c.position.x-t.x,dz=c.position.z-t.z,r=Math.hypot(dx,dz),a0=Math.atan2(dx,dz);c.position.x=t.x+Math.sin(a0+${a})*r;c.position.z=t.z+Math.cos(a0+${a})*r;director.controls.update();})()`;
const S = [
  ['assembled-front', 'state=assembled&statue=v11d'],
  ['ref-new', 'state=assembled&statue=new'],
  ['assembled-34', 'state=assembled&statue=v11d', null, orbit(Math.PI / 4)],
  ['exploded', 'state=exploded&statue=v11d'],
  ['exploded-34', 'state=exploded&statue=v11d', null, orbit(Math.PI / 4)],
  ['switcher', 'state=assembled&statue=v11d', null, `document.getElementById('statue-btn').click()`],
  ['switcher-unlocked', 'state=assembled&statue=v11d', `localStorage.setItem('dan2-unlock-classic','1')`, `document.getElementById('statue-btn').click()`],
  ['caps-above', 'state=exploded&statue=v11d', `localStorage.removeItem('dan2-unlock-classic')`, orbit(Math.PI / 5) + `;(()=>{const c=director.camera,t=director.controls.target;c.position.y=t.y+95;director.controls.update()})()`],
  ['caps-below', 'state=exploded&statue=v11d', null, orbit(-Math.PI / 5) + `;(()=>{const c=director.camera,t=director.controls.target;c.position.y=t.y-25;director.controls.update()})()`],
  ['caps-headshoulder', 'state=exploded&statue=v11d', null, `(()=>{director.static=true;const S=director.statue.sections,h=S.head,ch=S.chest;h.updateMatrixWorld(true);const hp=h.getWorldPosition(h.position.clone()),cp=ch.getWorldPosition(ch.position.clone());const t=director.controls.target,c=director.camera;t.set((hp.x+cp.x)/2,(hp.y+cp.y)/2+4,(hp.z+cp.z)/2);c.position.set(t.x+28,t.y+14,t.z+40);director.controls.update();})()`],
  ['head-assembled', 'state=assembled&statue=v11d', null, `(()=>{const h=director.statue.sections.head;const hp=h.getWorldPosition(h.position.clone());const t=director.controls.target,c=director.camera;t.set(hp.x,hp.y-6,hp.z);c.position.set(t.x+22,t.y+6,t.z+30);director.controls.update();})()`],
  ['focus-head', 'state=focus&section=head&statue=v11d'],
  ['focus-belly', 'state=focus&section=belly&statue=v11d'],
  ['history', 'mode=history&s=2.2&statue=v11d'],
  ['lod-assembled', 'state=assembled&statue=v11d&lod=low'],
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
  await p.waitForFunction('window.__ready === true', { timeout: 240000 }); await W(6000);
  if (act) { await p.evaluate(act); await W(wait || 2500); }
  await p.screenshot({ path: `shots/v11d-${name}.png` });
  let info = ''; if (/^(assembled-front|ref-)/.test(name)) info = await p.evaluate(INFO);
  console.log('==', name, errs.length ? errs.join(' | ') : 'clean', info); await p.close();
}
await b.close();
