// Renders the film: every frame of src/ in headless Chromium, a check that frames depend on their time alone, then the
// files the landing page serves.
//
//   node tools/render.mjs                 frames (resumes where it stopped), the check, then encode into the output
//   node tools/render.mjs --draft         half size into out/draft-frames/ and out/<slug>-draft.mp4 (nothing published)
//   node tools/render.mjs --frames-only | --encode-only | --mp4-only | --webm-only
//   options: --workers 2  --quality 94
//            --keep-sound   a change to the picture only: each film keeps its sound and length (the files already in the
//                           output folder), so audio/mix.wav and the Python tools are not needed
//            --no-check     skip the fresh-browser check (only for frames rendered on another machine)
//
// Writes to the output folder (film.config.json "output"): <slug>.mp4 (H.264 High, AAC), <slug>.webm (VP9, Opus),
// <slug>.en.vtt and <slug>-poster.webp; then rendered-from.json records what the film was made from (tools/sources.mjs).
// Each file is encoded in out/ and moved into the output folder only once it is whole, so a half-written or draft film
// is never served or committed.
//
// Speed: software WebGL (SwiftShader) already uses every core, so more browsers barely help; about 1 to 1.3 s a frame at
// 1080p for a busy clay scene, so a 2-minute film takes about an hour. Run it in the background and resume if stopped.
import { createRequire } from 'node:module';
import { mkdir, readdir, writeFile, readFile, access, rename } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { serve } from './serve.mjs';
import { captions } from './captions.mjs';
import { sourcesHash } from './sources.mjs';
import { HERE, MEDIA, FPS, W, H, config, slug, timings as loadTimings } from './config.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);
const DRAFT = flag('draft');
const WORKERS = +arg('workers', 2), Q = +arg('quality', 94), SCALE = DRAFT ? 0.5 : 1;
const FRAMES = HERE + (DRAFT ? 'out/draft-frames/' : 'out/frames/');
const CHECK = HERE + 'out/check/';
const OUT = HERE + 'out/';
const enc = { h264Crf: 26, vp9Crf: 38, vp9Kbps: 900, vp9MaxKbps: 1400, ...(config.encode || {}) };

const timings = loadTimings();
const N = Math.ceil(timings.duration * FPS);
const name = (i) => `f_${String(i).padStart(5, '0')}.jpg`;

// Runs in the page after seek(t), before the screenshot: the 2D layer is taken out for one frame and put back, so it is
// drawn anew. Chromium keeps a drawing of a layer and only moves it; a still card would show the subpixel offset of an
// earlier frame and its text would shimmer from frame to frame.
const redraw = () => new Promise((done) => {
  const ov = document.getElementById('ov');
  ov.style.display = 'none';
  requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.display = ''; done(); }));
});

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  return page;
}

async function frames() {
  await mkdir(FRAMES, { recursive: true });
  const have = new Set(await readdir(FRAMES));
  const todo = [];
  for (let i = 0; i < N; i++) if (!have.has(name(i))) todo.push(i);
  console.log(`${N} frames at ${FPS} fps${DRAFT ? ' (draft, half size)' : ''}, ${todo.length} to render, ${WORKERS} browsers`);
  if (!todo.length) return;
  const server = await serve(0);
  const url = `http://127.0.0.1:${server.address().port}/src/`;
  let next = 0, done = 0;
  const t0 = Date.now();
  async function worker() {
    const browser = await chromium.launch();
    const page = await openPage(browser);
    await page.goto(url);
    await page.waitForFunction(() => window.ready, null, { timeout: 180000 });
    if (!DRAFT && await page.evaluate(() => window.estimated)) throw new Error('timing is estimated: run tools/voice.py before a final render');
    while (next < todo.length) {
      const i = todo[next++];
      await page.evaluate((t) => window.seek(t), i / FPS);
      await page.evaluate(redraw);
      await page.screenshot({ path: FRAMES + name(i), type: 'jpeg', quality: Q });
      if (++done % 60 === 0) {
        const per = (Date.now() - t0) / done;
        console.log(`${done}/${todo.length}  ${(per / 1000).toFixed(2)} s a frame, ${((todo.length - done) * per / 60000).toFixed(1)} min left`);
      }
    }
    await browser.close();
  }
  await Promise.all(Array.from({ length: WORKERS }, worker));
  server.close();
  console.log(`frames done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

// Every frame depends on its time alone. One fresh browser draws a sample again in a shuffled order (the middle of every
// shot and 16 frames spread over the film); each must match the frame on disk byte for byte. A mismatch means a frame
// depends on what was drawn before it, or out/frames/ holds frames from before a change: delete those and render again.
async function check() {
  const server = await serve(0);
  const browser = await chromium.launch();
  const page = await openPage(browser);
  await page.goto(`http://127.0.0.1:${server.address().port}/src/`);
  await page.waitForFunction(() => window.ready, null, { timeout: 180000 });
  const shots = await page.evaluate(() => window.shots);
  const pick = new Set(shots.map(([t0], k) => Math.round(((t0 + (shots[k + 1] ? shots[k + 1][0] : timings.duration)) / 2) * FPS)));
  for (let k = 0; k < 16; k++) pick.add(Math.floor(((k + 0.5) / 16) * N));
  const sample = [...pick].filter((i) => i >= 0 && i < N);
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = sample.length - 1; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [sample[k], sample[j]] = [sample[j], sample[k]]; }
  const differ = [];
  for (const i of sample) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    await page.evaluate(redraw);
    const shot = await page.screenshot({ type: 'jpeg', quality: Q });
    if (!shot.equals(await readFile(FRAMES + name(i)))) {
      differ.push(i);
      await mkdir(CHECK, { recursive: true });
      await writeFile(CHECK + name(i), shot);
    }
  }
  await browser.close();
  server.close();
  if (differ.length) {
    throw new Error(`${differ.length} of ${sample.length} frames drawn again in a fresh browser differ (saved to out/check/): `
      + differ.map((i) => `${name(i)} (${(i / FPS).toFixed(2)} s)`).join(', ')
      + '. A frame depends on state an earlier frame left behind (see src/frame.js), or the frames are from before a change.');
  }
  console.log(`checked: ${sample.length} frames drawn again in a fresh browser, shuffled, match byte for byte`);
}

const pictures = (film) => new Promise((ok, no) => execFile('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
  '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', film], (e, out) => (e ? no(e) : ok(+out.trim()))));

function ff(args) {
  return new Promise((ok, no) => {
    const p = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
    p.on('exit', (c) => (c ? no(new Error('ffmpeg exited ' + c)) : ok()));
  });
}

const h264 = (crf) => ['-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(crf), '-profile:v', 'high', '-level', '4.0',
  '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-movflags', '+faststart'];

async function encodeDraft() {
  const audio = HERE + 'audio/mix.wav';
  let sound = [];
  try { await access(audio); sound = ['-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '128k', '-shortest']; } catch { /* picture only */ }
  await ff(['-framerate', String(FPS), '-i', FRAMES + 'f_%05d.jpg', ...sound, ...h264(28), OUT + `${slug}-draft.mp4`]);
  console.log(`draft written: out/${slug}-draft.mp4`);
}

async function encode() {
  await mkdir(MEDIA, { recursive: true });
  const keep = flag('keep-sound');
  const audio = HERE + 'audio/mix.wav';
  if (!keep) try { await access(audio); } catch { throw new Error('audio/mix.wav is missing: run tools/mix.py first'); }
  // with --keep-sound, the replaced film's track is copied packet for packet at its times (-copyts), and the picture
  // ends on the frame the old picture ended on
  const input = (film) => [...(keep ? ['-copyts'] : []), '-framerate', String(FPS), '-i', FRAMES + 'f_%05d.jpg', '-i', keep ? MEDIA + film : audio];
  const sound = async (film, codec) => (keep ? ['-vf', `trim=end_frame=${await pictures(MEDIA + film)}`, '-c:a', 'copy'] : [...codec, '-shortest']);
  const place = (f) => rename(OUT + f, MEDIA + f);
  if (!flag('webm-only')) {
    await ff([...input(`${slug}.mp4`), '-map', '0:v', '-map', '1:a', ...h264(enc.h264Crf),
      ...(await sound(`${slug}.mp4`, ['-c:a', 'aac', '-b:a', '160k', '-ar', '48000'])), OUT + `${slug}.mp4`]);
    await place(`${slug}.mp4`);
    console.log('mp4 written');
  }
  if (!flag('mp4-only')) {
    await ff([...input(`${slug}.webm`), '-map', '0:v', '-map', '1:a', '-c:v', 'libvpx-vp9', '-crf', String(enc.vp9Crf), '-b:v', `${enc.vp9Kbps}k`,
      '-maxrate', `${enc.vp9MaxKbps}k`, '-bufsize', `${enc.vp9MaxKbps * 2}k`, '-row-mt', '1', '-deadline', 'good', '-cpu-used', '3',
      '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), ...(await sound(`${slug}.webm`, ['-c:a', 'libopus', '-b:a', '112k', '-ar', '48000'])), OUT + `${slug}.webm`]);
    await place(`${slug}.webm`);
    console.log('webm written');
  }
  await ff(['-i', FRAMES + name(Math.round((config.poster ?? 1.2) * FPS)), '-vf', 'scale=1280:-2', '-c:v', 'libwebp', '-quality', '82', MEDIA + `${slug}-poster.webp`]);
  await writeFile(MEDIA + `${slug}.en.vtt`, captions(timings, config.title || 'the film'));
  console.log('poster and captions written to', MEDIA);
  if (!flag('mp4-only') && !flag('webm-only')) {
    await writeFile(HERE + 'rendered-from.json', JSON.stringify({ sources: sourcesHash(), files: 'tools/sources.mjs' }, null, 2) + '\n');
    console.log('rendered-from.json written');
  }
}

if (!flag('encode-only')) await frames();
if (!flag('no-check')) await check();
if (!flag('frames-only')) await (DRAFT ? encodeDraft() : encode());
