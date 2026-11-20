// The film on the page, served the way Vercel uploads it: every path .vercelignore drops answers 404 (so a film that
// would be dropped from the upload fails here, not in production). Then, in Chromium:
//   nothing of the film loads before the click; the hero opens the dialog and the film plays with sound and captions;
//   the MP4 and the WebM each play; Esc closes and focus returns to the hero; on a phone the hero opens it too.
//   node tests/deploy-check.mjs            (after the film is rendered and stamped)
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { SITE } from '../tools/config.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt' };
const dropped = (rel) => { try { execFileSync('git', ['-c', `core.excludesFile=${SITE}.vercelignore`, 'check-ignore', '--no-index', '-q', rel], { cwd: SITE }); return true; } catch { return false; } };

// a static server with byte ranges (video needs them) that refuses whatever the deployment would not upload
const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = normalize(url).replace(/^[/\\]+/, '').replace(/^(\.\.[/\\])+/, '') || 'index.html';
  let file = join(SITE, rel);
  try {
    if (rel.split('/').some((p) => p.startsWith('.')) || dropped(rel)) throw new Error('not uploaded');
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    const type = TYPES[extname(file)] || 'application/octet-stream';
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range) {
      const a = range[1] ? +range[1] : 0, b = range[2] ? +range[2] : body.length - 1;
      res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${body.length}`, 'content-length': b - a + 1 });
      res.end(body.subarray(a, b + 1));
    } else {
      res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': body.length });
      res.end(body);
    }
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;

let fail = 0;
const ok = (name, cond, info = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? ': ' + info : ''}`); if (!cond) fail++; };
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

// the engine folder is not served, the film is
for (const p of ['story-film/script.json', 'story-film/src/story.js']) ok(`${p} is not uploaded`, (await fetch(base + p)).status === 404);

const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const early = [];
desk.on('request', (r) => { if (/\/media\/story-film\//.test(r.url())) early.push(r.url()); });
await desk.goto(base);
await desk.waitForTimeout(4000);
ok('nothing of the film loads before the click', early.length === 0, early.join(', '));
await desk.locator('[data-film-open]').click();
await desk.waitForSelector('#film-dlg[open]', { timeout: 10000 });
await desk.waitForTimeout(3500);
const st = await desk.evaluate(() => {
  const v = document.querySelector('#film-dlg video');
  const tr = v.textTracks[0];
  return { t: v.currentTime, paused: v.paused, muted: v.muted, volume: v.volume, src: v.currentSrc, tracks: v.textTracks.length,
    mode: tr && tr.mode, cues: tr && tr.cues ? tr.cues.length : 0, w: v.videoWidth, h: v.videoHeight, dur: v.duration };
});
ok('the dialog opens and the film plays with sound', st.t > 1 && !st.paused && !st.muted && st.volume > 0, JSON.stringify(st));
ok('it plays the MP4 at 1920x1080', /\.mp4\?v=/.test(st.src) && st.w === 1920 && st.h === 1080, st.src);
ok('captions show, from the WebVTT', st.mode === 'showing' && st.cues > 20, `${st.mode}, ${st.cues} cues`);
const wide = await desk.evaluate(() => document.querySelector('#film-dlg video').getBoundingClientRect().width);
ok('the dialog is wide on a desktop', wide >= 1000, `${Math.round(wide)} px`);
// the WebM on its own
const webm = await desk.evaluate(async () => {
  const src = document.querySelector('#film-dlg video').dataset.webm;
  const v = document.createElement('video'); v.muted = true; v.src = src; document.body.appendChild(v);
  await v.play(); await new Promise((r) => setTimeout(r, 2500));
  const out = { t: v.currentTime, w: v.videoWidth, src }; v.remove(); return out;
});
ok('the WebM plays on its own', webm.t > 1 && webm.w === 1920, JSON.stringify(webm));
await desk.keyboard.press('Escape');
await desk.waitForTimeout(600);
ok('Esc closes the dialog', !(await desk.$('#film-dlg[open]')));
ok('focus returns to the hero button', await desk.evaluate(() => document.activeElement && document.activeElement.matches('[data-film-open]')));
ok('the film pauses when the dialog closes', await desk.evaluate(() => document.querySelector('#film-dlg video').paused));

const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await phone.goto(base);
await phone.waitForTimeout(3000);
const badge = phone.locator('[data-film-open]');
await badge.scrollIntoViewIfNeeded();
ok('the hero button is there on a phone', await badge.isVisible());
await badge.tap();
await phone.waitForSelector('#film-dlg[open]', { timeout: 10000 });
await phone.waitForTimeout(3000);
const p = await phone.evaluate(() => { const v = document.querySelector('#film-dlg video'); const r = v.getBoundingClientRect(); return { t: v.currentTime, paused: v.paused, w: Math.round(r.width) }; });
ok('the film plays on a phone, full width', p.t > 1 && !p.paused && p.w >= 340, JSON.stringify(p));

await browser.close();
server.close();
process.exit(fail ? 1 : 0);
