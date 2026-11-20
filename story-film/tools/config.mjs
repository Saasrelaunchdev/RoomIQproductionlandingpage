// Paths and settings every tool shares, from film.config.json.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..') + '/';
export const config = JSON.parse(readFileSync(HERE + 'film.config.json', 'utf8'));
export const SITE = resolve(HERE, config.site || '..') + '/';
export const MEDIA = resolve(HERE, config.output || 'out/media/') + '/';
export const FPS = config.fps || 30, W = config.width || 1920, H = config.height || 1080;
export const slug = config.slug || 'story';
export const script = () => JSON.parse(readFileSync(HERE + 'script.json', 'utf8'));
export const timings = () => {
  const p = HERE + 'audio/timings.json';
  if (!existsSync(p)) throw new Error('audio/timings.json is missing: run tools/voice.py first');
  return JSON.parse(readFileSync(p, 'utf8'));
};
