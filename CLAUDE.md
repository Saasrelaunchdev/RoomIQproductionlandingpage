# CLAUDE.md

The production landing page for **RoomIQ**: room-by-room underwriting for rent-by-the-room houses, sold to small co-living operators (and the investors learning from them). The page proves one thing: **RoomIQ's numbers are evidence you can check, not a promise**.

This repo is the page's home. Edit `index.html` here directly; Vercel serves the repo root as it is (`vercel.json`: no install, no build; `.vercelignore` keeps the repo-only files off the site).

## Anti-regression (read first, every time)

The page only moves forward. Every edit and every push builds on the newest `main`, never on an older copy.

1. **Start from the newest `main`.** Before any edit: `git pull --ff-only origin main`. If that fails, stop and sort it out; do not edit a stale copy.
2. **Edit in place.** Change `index.html` and the files beside it. Never replace `index.html` with a copy from anywhere else (the old `RoomIQ-landing-page` repo, a zip, a download, an earlier commit, a chat, memory). If a rebuild elsewhere is ever needed, port this repo's current content into it first.
3. **Every change is a new version.** Raise `<meta name="page-version" content="N">` in `index.html` by one and add `## vN` with what changed to the top of `CHANGELOG.md`, in the same commit.
4. **Nothing the page has may disappear unasked.** `guard/features.json` lists every feature. Add a marker when you add a feature. Remove one only when the user asked for that feature to go, and say so in the changelog.
5. **Run the guard before committing and pushing:** `node guard/check.mjs`. It fails if this copy is behind `main`, the version did not go up, the changelog entry is missing, a listed feature is gone, a file the page loads is missing, or an em dash or an unlisted email address is in the page. Fix the cause; never weaken the guard to get past it.
6. **Never force-push, reset or rewrite `main`'s history.** Undo a change with a new commit that is itself a new version.
7. Enforcement: `.githooks/pre-push` (enable once per clone with `git config core.hooksPath .githooks`), the Claude Code hook in `.claude/settings.json` (runs the guard before `git commit` and `git push`), and the `guard` GitHub check on pushes and pull requests to `main`.

## Layout

- `index.html`: the whole page. Its CSS (`<style>`) and script (`<script>`) are inside it. The page's words, the demo data (houses, markets, scorecard questions) and the site facts (links, `formEndpoint`, `scorecardUrl`, `seatsLeft`) sit in the JSON the script reads near its top.
- `media/`: the screens (AVIF and WebP at several widths). `real01` to `real15` are real app screens; `forecast`, `location`, `rooms`, `market`, `baseline`, `analyzer` are mockups with demo data (the hero still uses `forecast` and `location`). `media/demo/` holds the deal demo's three made-up houses.
- Sections in order: hero, napkin math (calculator), evidence (`#evidence`), deal demo (`#how`), between deals (`#between`), the real app tour (`#app`), comparison, pricing, FAQ, cohort, final call, footer.
- `fonts/`: Bricolage Grotesque (display) and Instrument Sans (text).
- `og.png` (the share image, 1200 x 630) and `favicon.svg`.
- The page was first built in `Saasrelaunchdev/RoomIQ-landing-page` (brief, mockup sources, tests, build tools). That repo is history now, read-only.

## Non-negotiables

1. **Claims.** Only what the GTM repo (`Saasrelaunchdev/roomIQGTMBuild`, `GTM-BRIEF.md` Section 5) documents. No customer logos, counts, testimonials, ratings, outcome or saving figures unless measured, sourced and permitted. Unknown facts stay `{TBD · reason}` (shown with `?view=preview`, hidden in production).
2. **Compare structure and evidence, never people.** No competitor names (categories only). No host name, listing title or photo, exact address or named data-source platform. Every house, market and figure in the demos is made up and says so. Housing ad rules: nothing targets by age, gender or ZIP.
3. **Screens are honest.** Real screens are captioned "Real screen · RoomIQ web app · Nov 2026" (plus "personal details hidden" where something was covered). Mockups are captioned as product previews with demo data; never call a mockup real. Any new real screen must hide the account (name, email), typed addresses, listing titles, host names and listing photos. Discovery screens 08, 09 and 10 are never used: they show other operators' listing photos.
4. **Copy budget.** Headline up to 8 words, the line under it up to 16, labels up to 5, other sentences up to 20, FAQ answers up to 35. No em dashes anywhere.
5. **Numbers agree.** Everything runs at 4.35 weeks a month, as the product prints. If you change a figure in the copy, change the arithmetic it comes from, and the other places that quote it.
6. **Phone first, WCAG 2.2 AA.** Check at 390 px and 1440 px, light and dark (`?theme=dark`), and with reduced motion (`?tier=c`). Keep keyboard and screen-reader support on every interactive part.
7. **Images are cached for a year.** Image URLs carry `?v=` (the `v` field of each screen in the `SHOTS` table in `index.html`); if you replace a file in `media/`, change that `v`, or visitors keep the old one. Add new images under new names rather than overwriting.

## Before launch (open)

- Pricing on the page (Portfolio, Operator, annual billing, 7-day Pro trial) must go live in the product at the same time.
- Set the form endpoint (seat application, scorecard email), the Portfolio checkout link, the site URL (canonical, absolute share image), and turn indexing on (`noindex`).
- Seats left and covered markets are `{TBD}`.
