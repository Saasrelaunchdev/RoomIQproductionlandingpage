// Writes each film file's content hash into its ?v= in index.html. Vercel serves /media/ as immutable for a year
// (vercel.json), so a re-rendered film must change its URLs or visitors keep the old one (CLAUDE.md, rule 7).
//   node tools/stamp.mjs            after tools/render.mjs; tests/page.test.mjs fails until it has run
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { MEDIA, SITE, slug } from './config.mjs';

export const FILES = [`${slug}.mp4`, `${slug}.webm`, `${slug}.en.vtt`, `${slug}-poster.webp`];
export const version = (file) => createHash('sha256').update(readFileSync(MEDIA + file)).digest('hex').slice(0, 8);

if (import.meta.url === `file://${process.argv[1]}`) {
  const page = SITE + 'index.html';
  let html = readFileSync(page, 'utf8');
  for (const f of FILES) {
    const re = new RegExp(`(/media/story-film/${f.replace(/\./g, '\\.')})\\?v=[0-9a-z]+`, 'g');
    const n = (html.match(re) || []).length;
    if (!n) throw new Error(`index.html does not reference ${f}`);
    html = html.replace(re, `$1?v=${version(f)}`);
    console.log(`${f}  ?v=${version(f)}  (${n} reference${n > 1 ? 's' : ''})`);
  }
  writeFileSync(page, html);
}
