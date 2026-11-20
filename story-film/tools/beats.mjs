// One frame per line of the narration, at the line's key word plus 0.5 s (its "at" word, or its middle), next to what
// the line says must be visible ("shows" in script.json). Look at every one: a beat is not done until it is seen in a
// frame. Writes out/beats/<id>.png and out/beats/beats.md (time, words, what must show, image).
//   node tools/beats.mjs [--full]
import { createRequire } from 'node:module';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { serve } from './serve.mjs';
import { HERE, W, H, script } from './config.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = HERE + 'out/beats/';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const sc = script();
const server = await serve(0);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: process.argv.includes('--full') ? 1 : 0.5 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/src/`);
await page.waitForFunction(() => window.ready, null, { timeout: 180000 });
const rows = ['| Line | Time | Words | Must show | Frame |', '|---|---|---|---|---|'];
for (const line of sc.lines) {
  const when = await page.evaluate(async ({ id, at }) => {
    const r = await fetch('/audio/timings.json');
    const tm = r.ok ? await r.json() : null;
    const l = tm && tm.lines.find((x) => x.id === id);
    if (!l) return null;
    if (at && l.words) {
      const n = (x) => x.toLowerCase().replace(/[^a-z0-9']/g, '');
      const w = l.words.find((x) => n(x.w) === n(at));
      if (w) return w.t + 0.5;
    }
    return (l.start + l.end) / 2;
  }, { id: line.id, at: line.at });
  if (when == null) { rows.push(`| ${line.id} | | ${line.text} | ${line.shows || ''} | no timing |`); continue; }
  const shot = await page.evaluate((t) => window.seek(t), when);
  await page.screenshot({ path: `${OUT}${line.id}.png` });
  rows.push(`| ${line.id} | ${when.toFixed(2)} s (${shot}) | ${line.text} | ${line.shows || '(nothing listed)'} | ${line.id}.png |`);
}
await writeFile(OUT + 'beats.md', rows.join('\n') + '\n');
await browser.close();
server.close();
console.log(`out/beats/: ${sc.lines.length} frames and beats.md. Check each frame against "Must show".`);
