# CLAUDE.md

The production landing page for **RoomIQ**: room-by-room underwriting for rent-by-the-room houses, sold to small co-living operators (and the investors learning from them). The page proves one thing: **RoomIQ's numbers are evidence you can check, not a promise**.

This repo is the page's home. Edit `index.html` here directly; Vercel serves the repo root as it is (`vercel.json`: no install, no build).

## Layout

- `index.html`: the whole page. Its CSS (`<style>`) and script (`<script>`) are inside it. The page's words, the demo data (houses, markets, scorecard questions) and the site facts (links, `formEndpoint`, `scorecardUrl`, `seatsLeft`) sit in the JSON the script reads near its top.
- `media/`: the product previews (AVIF and WebP at several widths) and `media/demo/` (the deal demo's three made-up houses).
- `fonts/`: Bricolage Grotesque (display) and Instrument Sans (text).
- `og.png` (the share image, 1200 x 630) and `favicon.svg`.
- `media/story-film/`: the story film the hero opens (MP4, WebM, captions, poster). **Generated**: never edit or replace these by hand; rebuild them from `story-film/`.
- `story-film/`: the film's sources and tools (script, voice, scenes, sound, render, tests), made with the `landing-story-film` skill (`Saasrelaunchdev/Landingpagestoryvideo`). Not deployed (`.vercelignore` anchors `/story-film/`). Its `brief.md` and `beats.md` record what the film says and why.
- The page was first built in `Saasrelaunchdev/RoomIQ-landing-page` (brief, mockup sources, tests, build tools). That repo is history now, read-only.

## The story film

The hero visual is the film's poster: a button over it opens a dialog that loads the film only on click, plays it with sound and captions, closes on Esc and returns focus. The film follows the same non-negotiables as the page (its claims, numbers and words are tested in `story-film/tests/`).

- Change words: edit `story-film/script.json`, then `.venv/bin/python -I tools/voice.py --check`, `.venv/bin/python -I tools/mix.py`, delete `story-film/out/frames/` and run `node tools/render.mjs`.
- Change a picture only: edit `story-film/src/`, delete the frames for the seconds that change (frame = seconds x 30) and run `node tools/render.mjs --keep-sound`.
- After any render: `node tools/stamp.mjs` (writes each file's `?v=` into `index.html`), then `npm test` in `story-film/` (fails while the film, its sources or the page disagree).
- Setup and the full loop: `story-film/README.md`.

## Non-negotiables

1. **Claims.** Only what the GTM repo (`Saasrelaunchdev/roomIQGTMBuild`, `GTM-BRIEF.md` Section 5) documents. No customer logos, counts, testimonials, ratings, outcome or saving figures unless measured, sourced and permitted. Unknown facts stay `{TBD · reason}` (shown with `?view=preview`, hidden in production).
2. **Compare structure and evidence, never people.** No competitor names (categories only). No host name, listing title or photo, exact address or named data-source platform. Every house, market and figure in the demos is made up and says so. Housing ad rules: nothing targets by age, gender or ZIP.
3. **Screens are honest.** Product previews are mockups of features RoomIQ really has, captioned as previews; never call one a real screen.
4. **Copy budget.** Headline up to 8 words, the line under it up to 16, labels up to 5, other sentences up to 20, FAQ answers up to 35. No em dashes anywhere.
5. **Numbers agree.** Everything runs at 4.35 weeks a month, as the product prints. If you change a figure in the copy, change the arithmetic it comes from, and the other places that quote it.
6. **Phone first, WCAG 2.2 AA.** Check at 390 px and 1440 px, light and dark (`?theme=dark`), and with reduced motion (`?tier=c`). Keep keyboard and screen-reader support on every interactive part.
7. **Images are cached for a year.** Image URLs carry `?v=`; if you replace a file in `media/`, change its `?v=` value in `index.html`, or visitors keep the old one.

## Before launch (open)

- Pricing on the page (Portfolio, Operator, annual billing, 7-day Pro trial) must go live in the product at the same time.
- Set the form endpoint (seat application, scorecard email), the Portfolio checkout link, the site URL (canonical, absolute share image), and turn indexing on (`noindex`).
- Seats left and covered markets are `{TBD}`.
