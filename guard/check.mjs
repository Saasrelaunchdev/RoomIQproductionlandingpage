#!/usr/bin/env node
/**
 * Anti-regression guard. Run before every commit and push; the pre-push hook, the Claude Code hook and the
 * GitHub check run it too. It fails when the page would go backwards:
 *   1. the copy here is behind origin/main (someone pushed a newer version: pull first)
 *   2. index.html changed but its page-version did not go up, or CHANGELOG.md has no entry for the new version
 *   3. a feature listed in guard/features.json is missing from index.html
 *   4. an image, font or file the page loads is missing
 *   5. an em dash, or an email address that is not on the allowed list, is in the page
 *
 *   node guard/check.mjs            (no dependencies; Node 18+)
 *   node guard/check.mjs --offline  (skip the comparison with origin/main)
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const offline = process.argv.includes("--offline");
const fails = [], notes = [];
const html = readFileSync(join(ROOT, "index.html"), "utf8");
// attribute values hold JSON with &quot;: markers are matched against the decoded text
const page = html.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const versionOf = (s) => { const m = s.match(/<meta name="page-version" content="(\d+)">/); return m ? +m[1] : null; };
const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString();

// 1 and 2: never behind main, and every change is a new, logged version
const v = versionOf(html);
if (v === null) fails.push('index.html has no <meta name="page-version" content="N"> tag');
if (!offline && v !== null) {
  let remote = null;
  try { sh("git fetch --quiet --depth=1 origin main"); remote = sh("git show FETCH_HEAD:index.html"); }
  catch { notes.push("could not read origin/main (offline?): version comparison skipped"); }
  if (remote !== null) {
    const rv = versionOf(remote);
    if (rv !== null && v < rv) fails.push(`this copy is page-version ${v}, but origin/main is at ${rv}. Pull first (git pull --ff-only) and redo your edit on top of it. Never push an older copy.`);
    else if (rv !== null && v === rv && remote !== html) fails.push(`index.html changed but page-version is still ${v}. Raise it to ${v + 1} and add "## v${v + 1}" to CHANGELOG.md.`);
    else notes.push(`page-version ${v} (origin/main: ${rv ?? "none"})`);
  }
}
const log = existsSync(join(ROOT, "CHANGELOG.md")) ? readFileSync(join(ROOT, "CHANGELOG.md"), "utf8") : "";
if (v !== null && !new RegExp(`^## v${v}\\b`, "m").test(log)) fails.push(`CHANGELOG.md has no "## v${v}" entry describing this version`);

// 3: nothing the page already has may disappear
const spec = JSON.parse(readFileSync(join(ROOT, "guard", "features.json"), "utf8"));
for (const [name, marks] of Object.entries(spec.features)) {
  const missing = marks.filter((m) => !page.includes(m));
  if (missing.length) fails.push(`feature lost: ${name} (missing ${missing.map((m) => JSON.stringify(m)).join(", ")})`);
}

// 4: every file the page loads exists
const need = new Set();
for (const m of html.matchAll(/(?:src|href|srcset|content)="(\/[^"#?]+?\.(?:webp|avif|png|svg|woff2|jpg))(?:\?[^"]*)?"/g)) need.add(m[1]);
for (const m of html.matchAll(/url\((?:'|")?(\/[^'")?]+?\.(?:woff2|webp|png|svg))/g)) need.add(m[1]);
const shotsM = html.match(/const SHOTS = (\{[\s\S]*?\});\n/);
if (!shotsM) fails.push("the SHOTS table (the screens' files) was not found in index.html");
else {
  const kebab = (s) => String(s).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()).replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  const shots = JSON.parse(shotsM[1]);
  for (const [id, set] of Object.entries(shots)) for (const [name, s] of Object.entries(set)) for (const w of s.ws) for (const ext of ["avif", "webp"]) need.add(`/media/${kebab(id)}-${kebab(name)}-${w}.${ext}`);
}
const T = html.match(/const T = (\{[\s\S]*?\});\n/);
if (T) for (const h of JSON.parse(T[1]).demo?.houses || []) for (const w of [144, 216, 420, 840]) need.add(`/media/demo/${h.image}-${w}.webp`);
const lost = [...need].filter((p) => !existsSync(join(ROOT, p)));
if (lost.length) fails.push(`${lost.length} file(s) the page loads are missing, e.g. ${lost.slice(0, 5).join(", ")}`);
else notes.push(`${need.size} files the page loads are present`);

// 5: house rules
const text = html.replace(/<script[\s\S]*?<\/script>/g, (s) => s.replace(/\/\*[\s\S]*?\*\//g, ""));
if (text.includes("\u2014")) fails.push("an em dash is in index.html (the house style forbids them)");
const emails = [...new Set(html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])].filter((e) => !spec.allowedEmails.includes(e.toLowerCase()));
if (emails.length) fails.push(`email address(es) not on the allowed list in guard/features.json: ${emails.length} found. Personal details never go on the page.`);

for (const n of notes) console.log("  - " + n);
if (fails.length) {
  console.error(`\nguard: ${fails.length} problem(s), the page would regress:`);
  for (const f of fails) console.error("  x " + f);
  process.exit(1);
}
console.log(`guard: ok (page-version ${v}, ${Object.keys(spec.features).length} features intact)`);
