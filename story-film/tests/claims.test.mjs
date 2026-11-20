// The film's words keep to the claim rules, every number has its source, the captions are the narration word for word,
// and the published film was rendered from the sources as they are. Run here with `npm test` (node --test tests/*.test.mjs), or import the
// same checks into the landing repo's own test suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { HERE, MEDIA, config, slug } from '../tools/config.mjs';
import { sourcesHash } from '../tools/sources.mjs';

const script = JSON.parse(readFileSync(HERE + 'script.json', 'utf8'));
const banned = [...(config.claims?.banned || []).map((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')),
  ...(config.claims?.bannedPatterns || []).map((p) => new RegExp(p, 'i'))];

test('the narration keeps to the claim rules', () => {
  for (const l of script.lines) for (const re of banned) assert.ok(!re.test(l.text), `${l.id}: "${l.text}" breaks ${re}`);
});

test('the words on screen keep to the claim rules', () => {
  const src = readFileSync(HERE + 'src/story.js', 'utf8');
  const shown = [...src.matchAll(/(['"`])((?:(?!\1)[^\\]|\\.)*?)\1/g)].map((m) => m[2]).filter((x) => /[a-z]{3,} [a-z]{3,}/i.test(x));
  for (const s of shown) for (const re of banned) assert.ok(!re.test(s), `story.js shows "${s.slice(0, 80)}", which breaks ${re}`);
});

test('every number in the narration carries its source', () => {
  for (const l of script.lines) {
    if (/\d|percent|out of (two|three|four|five|ten)|in (two|three|four|five|ten)\b|half of|most people/i.test(l.text)) {
      assert.ok(l.source && l.source.length > 10, `${l.id} states a number or a share without "source"`);
    }
  }
});

test('the captions are the narration, word for word, without overlaps', { skip: !existsSync(MEDIA + `${slug}.en.vtt`) }, () => {
  const vtt = readFileSync(MEDIA + `${slug}.en.vtt`, 'utf8');
  const cues = vtt.replace(/\r/g, '').split(/\n{2,}/).filter((b) => b.includes('-->')).map((b) => b.split('\n').slice(2).join(' ').trim());
  const words = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);
  assert.deepEqual(words(cues.join(' ')), words(script.lines.map((l) => l.text).join(' ')));
  const times = [...vtt.matchAll(/(\d\d):(\d\d):(\d\d\.\d{3}) --> (\d\d):(\d\d):(\d\d\.\d{3})/g)].map((m) => [+m[1] * 3600 + +m[2] * 60 + +m[3], +m[4] * 3600 + +m[5] * 60 + +m[6]]);
  times.forEach(([a, b], i) => { assert.ok(b > a, `cue ${i + 1} ends before it starts`); if (i) assert.ok(a >= times[i - 1][1] - 1e-6, `cue ${i + 1} overlaps`); });
});

test('the voiceover timing matches the script', { skip: !existsSync(HERE + 'audio/timings.json') }, () => {
  const t = JSON.parse(readFileSync(HERE + 'audio/timings.json', 'utf8'));
  assert.equal(t.lines.length, script.lines.length, 'audio/timings.json is out of date: run tools/voice.py');
  t.lines.forEach((l, i) => assert.equal(l.text, script.lines[i].text, `line ${l.id} differs from script.json: run tools/voice.py`));
});

test('the published film was rendered from the sources as they are', { skip: !existsSync(HERE + 'rendered-from.json') }, () => {
  const r = JSON.parse(readFileSync(HERE + 'rendered-from.json', 'utf8'));
  assert.equal(r.sources, sourcesHash(), 'the scenes, script, timing or engine changed since the film was rendered: run tools/render.mjs (--keep-sound for a picture-only change)');
});
