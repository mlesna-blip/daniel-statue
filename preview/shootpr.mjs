// v12 presenter checks: node shootpr.mjs [regex]   (server on :9013 from this folder)
import puppeteer from 'puppeteer-core';
const W = ms => new Promise(r => setTimeout(r, ms)); const ONLY = process.argv[2]; const H = 'http://127.0.0.1:9013/';
const S = [['s01-assembled', 1], ['s02-head', 2], ['s04-belly', 4], ['s06-feet', 6], ['s07-babylon', 7], ['s09-greece', 9], ['s11-divided', 11], ['s12-stone', 12]].filter(s => !ONLY || new RegExp(ONLY).test(s[0]));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
const page = async q => { const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  await p.goto(H + '?static', { timeout: 180000 }); await p.evaluate(`localStorage.setItem('dan2-lang','en');window.__presStoneT=8`); await p.goto(H + '?static&lod=high&statue=v11o&' + q, { timeout: 180000 }); await p.waitForFunction('window.__ready === true', { timeout: 240000 }); return p; };
for (const [name, n] of S) { const p = await page('present=' + n); await p.evaluate('window.__presStoneT=8'); if (n === 12) await p.evaluate('presenter.go(11)'); await W(7000); await p.screenshot({ path: `shots/pr-${name}.png` }); console.log('==', name, p.errs.join(' | ') || 'clean'); await p.close(); }
if (!ONLY || /keys/.test(ONLY)) {
  const p = await page('state=assembled'); await W(4000); const st = () => p.evaluate(`JSON.stringify({on:presenter.on,i:presenter.i,n:document.querySelector('.pr-n').textContent,hist:history3d.active,state:director.state,focus:director.focused&&director.focused.name,black:document.getElementById('presenter').classList.contains('black'),tools:getComputedStyle(document.getElementById('quiz-btn')).display})`);
  await p.screenshot({ path: 'shots/pr-before.png' });
  const log = async k => { if (k) await p.keyboard.press(k); await W(2500); console.log(k || 'start', await st()); };
  await log(); await log('KeyP'); await log('ArrowRight'); await log('PageDown'); await log('Space'); await log('ArrowLeft');
  for (let j = 0; j < 4; j++) await p.keyboard.press('ArrowRight'); await log('ArrowRight'); await W(4000); await p.screenshot({ path: 'shots/pr-keys-history.png' });
  await log('KeyB'); await p.screenshot({ path: 'shots/pr-black.png' }); await log('KeyB'); await log('KeyN'); await p.screenshot({ path: 'shots/pr-narr-off.png' }); await log('Escape'); await W(2500); await p.screenshot({ path: 'shots/pr-after-exit.png' });
  console.log('== keys', p.errs.join(' | ') || 'clean'); await p.close();
}
await b.close();
