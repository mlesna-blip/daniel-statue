import puppeteer from 'puppeteer-core';
const W = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const view = sec => `(()=>{director.static=true;const s=director.statue.sections['${sec}'];const p=s.getWorldPosition(new THREE_V());const t=director.controls.target,c=director.camera;t.set(p.x,p.y,p.z);c.position.set(p.x+34,p.y+34,p.z+34);director.controls.update();})()`.replace('new THREE_V()', 's.position.clone()');
for (const sid of (process.argv[2]||'new,v11d,classic').split(',')) for (const tag of ['after3']) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error'&&errs.push(m.text()));
  await p.goto(`http://127.0.0.1:9011/?static&lod=high`); await p.evaluate(`localStorage.setItem('dan2-lang','en');localStorage.setItem('dan2-unlock-classic','1')`);
  await p.goto(`http://127.0.0.1:9011/?static&lod=high&state=exploded&statue=${sid}${tag==='before'?'&nocaps':''}`);
  await p.waitForFunction('window.__ready === true', { timeout: 240000 }); await W(5000);
  for (const sec of ['belly','legs']) { await p.evaluate(view(sec)); await W(1500); const f=`shots/caps/close-${tag}-${sid}-${sec}.png`; await p.screenshot({ path: f }); console.log('==', f, errs.length ? errs.join(' | ') : 'clean'); }
  await p.close(); }
await b.close();
