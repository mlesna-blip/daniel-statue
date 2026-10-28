import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const sid of ['new','v11d','classic']) { const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error'&&errs.push(m.text()));
await p.goto(`http://127.0.0.1:9011/?static&lod=high&statue=${sid}`); await p.evaluate(`localStorage.setItem('dan2-unlock-classic','1')`); await p.goto(`http://127.0.0.1:9011/?static&lod=high&statue=${sid}`);
await p.waitForFunction('window.__ready === true', { timeout: 240000 });
console.log(sid, await p.evaluate(`JSON.stringify(Object.fromEntries(Object.entries(director.statue.sections).map(([k,g])=>{const c=[];g.traverse(o=>o.name&&o.name.startsWith('cap_')&&c.push(o.name+':'+o.geometry.attributes.position.count/3));return [k,[g.userData.caps,c.join(' ')]]})))`), errs.join('|')); await p.close(); }
await b.close();
