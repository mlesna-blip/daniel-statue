import puppeteer from 'puppeteer-core';
const W = ms => new Promise(r => setTimeout(r, ms)); const H = 'http://127.0.0.1:9013/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function shot(name, q, act, wait=5000, vp={width:1440,height:900}) {
  const p = await b.newPage(); await p.setViewport(vp); const errs=[], fails=[];
  p.on('pageerror', e => errs.push(e.message)); p.on('requestfailed', r => fails.push(r.url().split('/').pop()));
  await p.goto(H+'?static', {timeout:180000}); await p.evaluate(`localStorage.clear(); localStorage.setItem('dan2-lang','en');`);
  await p.goto(H+`?static&statue=v11o&${q}`, {timeout:180000});
  await p.waitForFunction('window.__ready===true', {timeout:300000, polling:1000});
  if (/mode=history/.test(q)) await p.waitForFunction('window.__beastsLoaded===true', {timeout:300000, polling:1000});
  await W(4000); if (act) { await p.evaluate(act); await W(wait); }
  await p.screenshot({ path: `shots/v13-${name}.png` });
  const info = await p.evaluate(`JSON.stringify({state:director&&director.state,hist:!!(history3d&&history3d.active),sid:director&&director.statue&&director.statue.id,toggle:!!document.getElementById('d7-btn'),qz:!!document.querySelector('.qz-pick'),pr:!!document.querySelector('.pr-prev')})`);
  console.log('==', name, (errs.length||fails.length)?('ERR '+errs.concat(fails).join('|')):'clean', info); await p.close();
}
await shot('assembled', 'state=assembled');
await shot('history-babylon', 'mode=history&s=0.2', null, 6000);
await shot('history-rise', 'mode=history&s=2.2', `window.__slideK=0.35`, 2000);
await shot('quiz-pick', 'state=assembled', `document.getElementById('quiz-btn').click()`, 1500);
await shot('presenter', 'present=1');
await shot('stone', 'state=stone&t=8');
await shot('mobile-p', 'state=assembled', null, 4000, {width:390,height:844,isMobile:true,hasTouch:true});
await shot('mobile-hist', 'mode=history&s=2.2', null, 5000, {width:390,height:844,isMobile:true,hasTouch:true});
await shot('mobile-l', 'state=assembled', null, 4000, {width:844,height:390,isMobile:true,hasTouch:true});
await b.close();
