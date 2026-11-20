#!/usr/bin/env node
// Claude Code PreToolUse hook (.claude/settings.json): before any `git push` or `git commit`, run the guard.
// Exit code 2 blocks the command and shows the guard's report to Claude.
import { execFileSync } from "node:child_process";
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let cmd = "";
  try { cmd = JSON.parse(input).tool_input?.command || ""; } catch { process.exit(0); }
  if (!/\bgit\b[^;&|]*\b(push|commit)\b/.test(cmd)) process.exit(0);
  try { execFileSync("node", ["guard/check.mjs", ...(/\bcommit\b/.test(cmd) ? ["--offline"] : [])], { stdio: ["ignore", "pipe", "pipe"] }); process.exit(0); }
  catch (e) { process.stderr.write(String(e.stdout || "") + String(e.stderr || "") + "\nBlocked: fix the problems above first (CLAUDE.md, Anti-regression).\n"); process.exit(2); }
});
