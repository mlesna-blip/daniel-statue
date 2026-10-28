import puppeteer from 'puppeteer-core';
const W = ms => new Promise(r => setTimeout(r, ms)); const ONLY = process.argv[2];
const orbit = a => `(()=>{const c=director.camera,t=director.controls.target;const dx=c.position.x-t.x,dz=c.position.z-t.z,r=Math.hypot(dx,dz),a0=Math.atan2(dx,dz);c.position.x=t.x+Math.sin(a0+${a})*r;c.position.z=t.z+Math.cos(a0+${a})*r;director.controls.update();})()`;
const S = [
  ['switcher-locked', 'state=assembled', null, `document.getElementById('statue-btn').click()`],
  ['switcher-unlocked-ru', 'state=assembled&lang=ru', `localStorage.setItem('dan2-unlock-classic','1')`, `document.getElementById('statue-btn').click()`],
  ['switcher-es', 'state=assembled&lang=es', `localStorage.removeItem('dan2-unlock-classic')`, `document.getElementById('statue-btn').click()`],
  ['new-back', 'state=assembled&lang=en', null, orbit(Math.PI)],
  ['new-back-low', 'state=assembled', null, orbit(Math.PI) + `;director.camera.position.y=18;director.controls.update()`],
  ['classic-assembled', 'state=assembled&statue=classic', null, `document.getElementById('statue-btn').click()`],
  ['classic-exploded', 'state=exploded&statue=classic'],
  ['classic-focus', 'state=focus&section=chest&statue=classic'],
  ['classic-history', 'mode=history&s=2.2&statue=classic'],
  ['new-exploded', 'state=exploded'],
  ['tale-furnace', 'state=assembled', null, `v10.openTale('furnace')`, 4000],
  ['tale-den', 'state=assembled', null, `v10.openTale('den')`, 4000],
  ['tale-tree', 'state=assembled', null, `v10.openTale('tree')`, 4000],
  ['caps-front', 'state=exploded'],
  ['caps-34', 'state=exploded', null, orbit(Math.PI / 4)],
  ['caps-above', 'state=exploded', null, orbit(Math.PI / 5) + `;(()=>{const c=director.camera,t=director.controls.target;c.position.y=t.y+95;director.controls.update()})()`],
  ['caps-below', 'state=exploded', null, orbit(-Math.PI / 5) + `;(()=>{const c=director.camera,t=director.controls.target;c.position.y=t.y-25;director.controls.update()})()`],
  ['caps-headshoulder', 'state=exploded', null, `(()=>{director.static=true;const S=director.statue.sections,h=S.head,ch=S.chest;h.updateMatrixWorld(true);const hp=h.getWorldPosition(h.position.clone()),cp=ch.getWorldPosition(ch.position.clone());const t=director.controls.target,c=director.camera;t.set((hp.x+cp.x)/2,(hp.y+cp.y)/2+4,(hp.z+cp.z)/2);c.position.set(t.x+28,t.y+14,t.z+40);director.controls.update();})()`],
  ['caps-headshoulder-assembled', 'state=assembled', null, `(()=>{const h=director.statue.sections.head;const hp=h.getWorldPosition(h.position.clone());const t=director.controls.target,c=director.camera;t.set(hp.x,hp.y-6,hp.z);c.position.set(t.x+22,t.y+6,t.z+30);director.controls.update();})()`],
  ['caps-focus-head', 'state=focus&section=head'],
  ['caps-focus-chest', 'state=focus&section=chest'],
  ['caps-history', 'mode=history&s=0.2'],
].filter(s => !ONLY || new RegExp(ONLY).test(s[0]));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
for (const [name, q, pre, act, wait] of S) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); }); p.on('requestfailed', r => errs.push('FAILED ' + r.url()));
  await p.goto('http://127.0.0.1:9011/?static&lod=high', { timeout: 180000 }); await p.evaluate(`localStorage.setItem('dan2-lang','en');${pre || ''}`);
  await p.goto(`http://127.0.0.1:9011/?static&lod=high&${q}`, { timeout: 180000 });
  await p.waitForFunction('window.__ready === true', { timeout: 240000 }); await W(6000);
  if (act) { await p.evaluate(act); await W(wait || 2500); }
  await p.screenshot({ path: `shots/v11-${name}.png` }); console.log('==', name, errs.length ? errs.join(' | ') : 'clean'); await p.close();
}
await b.close();
