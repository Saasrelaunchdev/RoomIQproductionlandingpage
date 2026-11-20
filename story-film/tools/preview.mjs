// Frames at chosen moments, small, for checking a change without rendering the film.
//   node tools/preview.mjs 3 12.5 26        out/preview/<t>.png for each time
//   node tools/preview.mjs --every 4         a frame every 4 seconds
//   add --sheet for contact sheets of 12 frames (out/preview/sheet-N.png), --full for full size
import { createRequire } from 'node:module';
import { mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { HERE, W, H } from './config.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = HERE + 'out/preview/';
const args = process.argv.slice(2), flag = (k) => args.includes('--' + k);
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const server = await serve(0);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: flag('full') ? 1 : 0.5 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type() + ':', m.text().slice(0, 300)); });
await page.goto(`http://127.0.0.1:${server.address().port}/src/`);
await page.waitForFunction(() => window.ready, null, { timeout: 180000 });
const dur = await page.evaluate(() => window.duration);
let times = args.filter((a) => /^[\d.]+$/.test(a) && args[args.indexOf(a) - 1] !== '--every').map(Number);
const ev = args.indexOf('--every');
if (ev >= 0) { times = []; for (let t = 0.5; t < dur; t += +args[ev + 1]) times.push(+t.toFixed(2)); }
let k = 0;
for (const t of times) {
  const shot = await page.evaluate((t) => window.seek(t), t);
  await page.screenshot({ path: `${OUT}${String(++k).padStart(3, '0')}.png` });
  console.log(`${String(k).padStart(3, '0')}.png  ${t.toFixed(2)} s  ${shot}`);
}
await browser.close();
server.close();
if (flag('sheet') && k) {
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '1', '-i', `${OUT}%03d.png`,
    '-vf', 'scale=640:-1,tile=3x4:padding=8:color=white', `${OUT}sheet-%d.png`]);
  console.log(`contact sheets: out/preview/sheet-*.png (3 across, 4 down, in time order)`);
}
