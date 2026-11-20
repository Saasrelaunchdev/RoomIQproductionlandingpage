// The film on the landing page: the hero opens it, nothing of it loads before the click, the files the page names exist
// and carry their current ?v=, and a Vercel upload keeps the media while leaving this engine folder out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { MEDIA, SITE } from '../tools/config.mjs';
import { FILES, version } from '../tools/stamp.mjs';

const html = readFileSync(SITE + 'index.html', 'utf8');

test('the hero opens the film: a button over the hero visual, outside its aria-hidden scene', () => {
  const hero = html.slice(html.indexOf('<section id="hero"'), html.indexOf('</section>', html.indexOf('<section id="hero"')));
  assert.match(hero, /<button type="button" class="film-open" data-film-open[^>]*aria-label="Watch the RoomIQ story, [^"]*with sound and captions"/);
  const scene = hero.slice(hero.indexOf('<div class="hv-3d"'), hero.indexOf('<button type="button" class="film-open"'));
  assert.ok(!/data-film-open/.test(scene), 'the button must not sit inside the aria-hidden scene');
  assert.match(html, /<dialog class="dlg dlg-film" id="film-dlg" aria-labelledby="film-h">/);
});

test('nothing of the film loads before the click', () => {
  const dlg = html.slice(html.indexOf('<dialog class="dlg dlg-film"'), html.indexOf('</dialog>', html.indexOf('<dialog class="dlg dlg-film"')));
  assert.match(dlg, /<video[^>]*preload="none"/);
  assert.ok(!/<source|<track|\ssrc=|\sposter=/.test(dlg), 'media URLs live in data attributes until the dialog opens');
});

test('the page names every film file, each exists, each with its current ?v=', () => {
  for (const f of FILES) {
    assert.ok(existsSync(MEDIA + f), `media/story-film/${f} is missing: run tools/render.mjs`);
    const m = html.match(new RegExp(`/media/story-film/${f.replace(/\./g, '\\.')}\\?v=([0-9a-z]+)`));
    assert.ok(m, `index.html does not reference ${f}`);
    assert.equal(m[1], version(f), `${f} changed since index.html was stamped: run node tools/stamp.mjs`);
  }
});

test('a Vercel upload keeps media/story-film/ and leaves the engine out (anchored ignore)', () => {
  const ignore = readFileSync(SITE + '.vercelignore', 'utf8');
  assert.match(ignore, /^\/story-film\/$/m, '.vercelignore must anchor /story-film/ (an unanchored pattern also drops media/story-film/)');
  const ignored = (p) => {
    try { execFileSync('git', ['-c', `core.excludesFile=${SITE}.vercelignore`, 'check-ignore', '--no-index', '-q', p], { cwd: SITE }); return true; }
    catch { return false; }
  };
  for (const f of FILES) assert.equal(ignored(`media/story-film/${f}`), false, `media/story-film/${f} would not be uploaded`);
  assert.equal(ignored('story-film/script.json'), true, 'the engine folder would be uploaded');
  assert.equal(ignored('index.html'), false);
});
