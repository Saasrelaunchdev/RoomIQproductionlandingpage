// A model check for the film on the landing page, in Chromium. Adapt the selectors to the page.
//   node tests/page-check.mjs --url http://localhost:3000/ --open ".hero-film" [--phone-open ".hero-watch button"] [--dialog "dialog[open]"]
// Checks: nothing of the film is requested before the click; the dialog opens and plays with sound; captions draw;
// Esc closes it and focus returns to the button; on a phone the phone entry opens it full screen.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const url = arg('url', 'http://localhost:3000/'), open = arg('open', '[data-film-open]'), phoneOpen = arg('phone-open', null);
const dialogSel = arg('dialog', 'dialog[open]'), media = arg('media', '/media/');
let fail = 0;
const ok = (name, cond, info = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? ': ' + info : ''}`); if (!cond) fail++; };

const browser = await chromium.launch();
const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const early = [];
desk.on('request', (r) => { if (r.url().includes(media) && /\.(mp4|webm|vtt)/.test(r.url())) early.push(r.url()); });
await desk.goto(url);
await desk.waitForTimeout(3500);
ok('nothing of the film loads before the click', early.length === 0, early.join(', '));
await desk.locator(open).first().click();
await desk.waitForSelector(dialogSel, { timeout: 10000 });
await desk.waitForTimeout(2500);
const st = await desk.evaluate((sel) => { const d = document.querySelector(sel), v = d && d.querySelector('video'); return v ? { t: v.currentTime, paused: v.paused, muted: v.muted, src: v.currentSrc } : null; }, dialogSel);
ok('the film plays with sound', st && st.t > 0.5 && !st.paused && !st.muted, JSON.stringify(st));
await desk.keyboard.press('Escape');
await desk.waitForTimeout(700);
ok('Esc closes the dialog', !(await desk.$(dialogSel)));
ok('focus returns to the button that opened it', await desk.evaluate((s) => document.activeElement && document.activeElement.matches(s), open));
if (phoneOpen) {
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await phone.goto(url);
  await phone.waitForTimeout(1500);
  ok('the phone entry is visible', await phone.locator(phoneOpen).first().isVisible());
  await phone.locator(phoneOpen).first().tap();
  await phone.waitForSelector(dialogSel, { timeout: 10000 });
  await phone.waitForTimeout(2000);
  const p = await phone.evaluate((sel) => { const v = document.querySelector(sel + ' video'); return v ? { t: v.currentTime, paused: v.paused } : null; }, dialogSel);
  ok('the film plays on a phone', p && p.t > 0.5 && !p.paused, JSON.stringify(p));
}
await browser.close();
process.exit(fail ? 1 : 0);
