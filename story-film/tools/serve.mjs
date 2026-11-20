// A small static server for the render page (ES modules need http). Serves the film's folder at / and the landing
// page's repository at /site/, so the film loads the page's own fonts, icons and pictures.
//   node tools/serve.mjs [port]      then open http://127.0.0.1:<port>/src/?t=12.5 or /src/?play
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HERE, SITE } from './config.mjs';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt' };

export function serve(port = 0) {
  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const site = url.startsWith('/site/');
    const rel = normalize(site ? url.slice(5) : url).replace(/^(\.\.[/\\])+/, '');
    let file = join(site ? SITE : HERE, rel);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await serve(Number(process.argv[2] || 8790));
  console.log(`http://127.0.0.1:${s.address().port}/src/  (?t=seconds, ?play)`);
}
