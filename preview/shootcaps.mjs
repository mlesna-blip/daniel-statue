import puppeteer from 'puppeteer-core';
const W = ms => new Promise(r => setTimeout(r, ms)); const TAG = process.argv[2] || 'before';
const view = `(()=>{director.static=true;const c=director.camera,t=director.controls.target;const dx=c.position.x-t.x,dz=c.position.z-t.z,r=Math.hypot(dx,dz),a0=Math.atan2(dx,dz)+Math.PI/4;c.position.x=t.x+Math.sin(a0)*r;c.position.z=t.z+Math.cos(a0)*r;c.position.y=t.y+45;director.controls.update();})()`;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
for (const sid of (process.argv[3]||'new,v11d,classic').split(',')) for (const [nm, act] of [['34', view], ['front', '']]) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });
  await p.goto('http://127.0.0.1:9011/?static&lod=high', { timeout: 180000 }); await p.evaluate(`localStorage.setItem('dan2-lang','en');localStorage.setItem('dan2-unlock-classic','1')`);
  await p.goto(`http://127.0.0.1:9011/?static&lod=high&state=exploded&statue=${sid}`, { timeout: 180000 });
  await p.waitForFunction('window.__ready === true', { timeout: 240000 }); await W(6000);
  if (act) { await p.evaluate(act); await W(2500); }
  const f = `shots/caps/${TAG}-${sid}-${nm}.png`; await p.screenshot({ path: f }); console.log('==', f, errs.length ? errs.join(' | ') : 'clean'); await p.close();
}
await b.close();
