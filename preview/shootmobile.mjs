// v12 mobile: node shootmobile.mjs [tag] [regex]  (server on :9013)
import puppeteer from 'puppeteer-core';
const W = ms => new Promise(r => setTimeout(r, ms)); const TAG = process.argv[2] || 'm'; const ONLY = process.argv[3]; const H = 'http://127.0.0.1:9013/';
const VP = [['p', 390, 844], ['l', 844, 390]];
const S = [['assembled', 'state=assembled'], ['exploded', 'state=exploded'], ['history', 'mode=history&s=2.2'], ['tale', 'state=assembled', `v10.openTale('furnace')`], ['quiz', 'state=assembled', `document.getElementById('quiz-btn').click()`], ['focus', 'state=focus&section=head'], ['presenter', 'present=2']].filter(s => !ONLY || new RegExp(ONLY).test(s[0]));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 240000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [o, w, h] of VP) for (const [name, q, act] of S) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(H + '?static', { timeout: 180000 }); await p.evaluate(`localStorage.setItem('dan2-lang','en')`);
  await p.goto(`${H}?static&statue=v11o&${q}`, { timeout: 180000 }); await p.waitForFunction('window.__ready === true', { timeout: 300000, polling: 1000 }); await W(5000);
  if (act) { await p.evaluate(act); await W(4000); }
  await p.screenshot({ path: `shots/${TAG}-${o}-${name}.png` });
  const ov = await p.evaluate(`(()=>{const els=[...document.querySelectorAll('button, .card, .clayf, #ui h1, header')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&+s.opacity>0.1&&s.display!=='none'});const off=els.filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2||r.bottom>innerHeight+2||r.left<-2}).map(e=>(e.id||e.className||e.tagName).toString().slice(0,24));return JSON.stringify({lod:!!(window.director&&director.statue&&director.statue.lite),off:off.slice(0,8)})})()`);
  console.log('==', o, name, errs.join(' | ') || 'clean', ov); await p.close();
}
await b.close();
