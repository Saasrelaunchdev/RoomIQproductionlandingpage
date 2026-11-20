// What the film is made from: the scenes (src/), the script and the voiceover's timing (which also make the captions),
// and the engine's dependencies (package-lock.json). A change to any of them changes the film, but the site only plays
// what tools/render.mjs last encoded. So render.mjs records their hash in rendered-from.json, and the tests fail while
// the two differ: the film on the site would still be the one made before the change.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { HERE } from './config.mjs';

export function sourceFiles() {
  const src = readdirSync(HERE + 'src', { recursive: true }).map((p) => 'src/' + p.split('\\').join('/'));
  const more = ['script.json', 'film.config.json', 'audio/timings.json', 'package-lock.json'].filter((p) => existsSync(HERE + p));
  return [...src.filter((p) => statSync(HERE + p).isFile()), ...more].sort();
}

export function sourcesHash() {
  const h = createHash('sha256');
  // line endings normalised, so a checkout on Windows hashes the same
  for (const p of sourceFiles()) h.update(p + '\0' + readFileSync(HERE + p, 'utf8').replace(/\r\n/g, '\n') + '\0');
  return h.digest('hex');
}
