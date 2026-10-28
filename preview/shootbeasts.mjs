// v12 history beasts: node shootbeasts.mjs [regex]  (server on :9013)
import puppeteer from 'puppeteer-core';
const W = ms => new Promise(r => setTimeout(r, ms)); const ONLY = process.argv[2]; const H = 'http://127.0.0.1:9013/';
const S = [['babylon', 'mode=history&s=0.2'], ['persia', 'mode=history&s=2.2'], ['greece', 'mode=history&s=5.2'], ['rome', 'mode=history&s=7.2'], ['divided', 'mode=history&s=12'],
  ['mid-transition', 'mode=history&s=2.2', `window.__slideK=.5;history3d.goTo(5)`, 6000, `JSON.stringify({m:history3d.metal,s:history3d.st.s})`], ['presenter-persia', 'present=8'], ['evidence-open', 'mode=history&s=2.2', `document.querySelector('#hist .ev-btn').click()`, 4000], ['assembled-back-home', 'state=assembled']].filter(s => !ONLY || new RegExp(ONLY).test(s[0]));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
for (const [name, q, act, wait] of S) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(H + '?static', { timeout: 180000 }); await p.evaluate(`localStorage.setItem('dan2-lang','en')`);
  await p.goto(H + '?static&lod=high&statue=v11o&' + q, { timeout: 180000 }); await p.waitForFunction('window.__beastsLoaded === true', { timeout: 300000, polling: 1000 }); await W(5000);
  if (act) { await p.evaluate(act); await W(wait); }
  await p.screenshot({ path: `shots/hb-${name}.png` });
  const info = await p.evaluate(`JSON.stringify(Object.fromEntries(Object.entries(beasts.items).map(([k,i])=>[k,[i.holder.visible,+i.sx.toFixed(2),i.sGoal]])))`);
  console.log('==', name, errs.join(' | ') || 'clean', info); await p.close();
}
await b.close();
