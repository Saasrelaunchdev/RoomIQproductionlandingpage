# RoomIQ story film

The film the landing page's hero opens: "See the investment inside the house", 1:57, narrated, made with the
`landing-story-film` skill (Saasrelaunchdev/Landingpagestoryvideo) from the GTM repo (Saasrelaunchdev/roomIQGTMBuild,
`main`) and this page. `brief.md` says what it is built from and why; `beats.md` is the beat sheet; `script.json` holds
every spoken word with the claim or source behind it. The rendered files are in `../media/story-film/` (generated).

Setup once: `npm install`, then `python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile numpy scipy librosa sherpa-onnx`.

The loop for this film:

```bash
.venv/bin/python -I tools/voice.py --check   # Kokoro af_heart; every line read back by speech recognition
.venv/bin/python -I tools/mix.py             # music, effects, loudness; read the report
node tools/beats.mjs                         # a frame per line beside what it must show (out/beats/)
node tools/render.mjs                        # frames, the fresh-browser check, MP4, WebM, captions, poster
node tools/stamp.mjs                         # each file's ?v= into ../index.html (media is cached for a year)
npm test                                     # claims, captions, timing, freshness, the page and the deploy
```

To re-voice with ElevenLabs: save a key for `api.elevenlabs.io` (header `xi-api-key`), set `voice.engine` to
`elevenlabs` and a `voice_id` in `script.json`, and run the loop from `voice.py` (delete `out/frames/` first).

The engine's own notes follow.

---

# Story film engine

A starter kit for a landing page's story film: the script, the voiceover, 3D clay scenes with motion-design words on top,
the sound, a deterministic render, and the files the page serves. It renders a small sample film as it is; replace the
sample with the film's own script and shots (see the skill's references).

## Set up (once per landing repo)

```bash
cp -r <skill>/engine <landing-repo>/story-film          # any folder name; the page never serves it
cd <landing-repo>/story-film
npm install                                             # three; Playwright is used from the machine (or: npm i -D playwright)
python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile numpy scipy librosa sherpa-onnx
```

Edit `film.config.json`:

| Key | What |
|---|---|
| `slug` | the media files' base name (`<slug>.mp4`, `.webm`, `.en.vtt`, `-poster.webp`) |
| `site` | the landing repo's root, relative to this folder (`..`); served to the render page at `/site/` |
| `output` | where the media files go, relative to this folder, inside the site (for example `../media/story-film/`) |
| `width`, `height`, `fps` | 1920 x 1080 at 30 for the final film |
| `three` | `false` for a film with no 3D world (motion design only) |
| `poster` | the second the poster frame is taken from |
| `fonts` | the page's font files: `[{ "family": "Inter", "src": "/site/assets/fonts/inter.woff2", "weight": "400 800" }]` |
| `sprite` | the page's inline SVG icon sprite: `{ "page": "/site/index.html" }` (the first `<svg>` holding `<symbol>`s; `"match"` for another regex), or `null` |
| `brand` | the page's colours and fonts, copied from its CSS variables |
| `loudness` | the page's other videos' loudness (measure them); default -16.5 LUFS, -1.5 dBTP |
| `claims` | words and patterns the narration and the on-screen text must not use |

Add to the landing repo's deploy ignore (anchored, so it never matches inside the media folder):
`/story-film/` (Vercel: `.vercelignore`; Netlify and others: their own). Keep `node_modules/`, `.venv/`, `.cache/`,
`out/` and `audio/lines/` out of git (this folder's `.gitignore` already does).

## The loop

```bash
.venv/bin/python -I tools/voice.py --check      # narration + word timings, read back by speech recognition
.venv/bin/python -I tools/mix.py                # music, effects, ducking, loudness; read the report
node tools/preview.mjs --every 3 --sheet        # contact sheets: out/preview/sheet-N.png
node tools/beats.mjs                            # a frame per line next to what it must show: out/beats/beats.md
node tools/render.mjs --draft                   # half size, with the check: out/<slug>-draft.mp4
.venv/bin/python -I tools/flicker.py out/<slug>-draft.mp4
node tools/render.mjs                           # the final film (about an hour for 2 minutes; resumes)
npm test                                        # claims, captions, timing, freshness
node tests/page-check.mjs --url http://localhost:PORT/   # the page plays it (adapt the selectors)
```

Before the voice exists, the render page estimates the timing from the script (2.6 words a second) so the shots can be
written and previewed; the final render refuses estimated timing.

Changing things:
- a line's words: `voice.py --check`, `mix.py`, then render (delete `out/frames/` first: every frame moved)
- a shot's picture only: delete the frames for its seconds (frame number = seconds x fps) and render with `--keep-sound`
- the music or effects only: `mix.py`, then `render.mjs --encode-only`

## Files

```
film.config.json   the site, the output, the brand, the size, loudness, encode, banned words
script.json        the narration: lines with id, text, pause, the scene, what each must show; music moods; effects
src/index.html     the render page: seek(t), duration, shots, ready
src/frame.js       the frame contract: restore as built, rest, shot, after, stage; pools; overlay helpers
src/stage.js       the 3D stage: renderer, camera, day and night light, mood, glows
src/kit3d.js       clay kit: people and poses, houses, vans, offices, desks, screens, trees, lamps, brand tile, layers
src/ui.css         the 2D layer: pills, cards, chips, phones, app windows, statistics, titles, end card
src/story.js       the film's own world and shots (a sample until replaced)
src/anim.js        easing, keys, prog, fade, pop
tools/             voice.py, mix.py, render.mjs, preview.mjs, beats.mjs, flicker.py, captions.mjs, serve.mjs, sources.mjs
tests/             claims.test.mjs (npm test), page-check.mjs (a model end-to-end page check)
```

## Gotchas that each cost a film once

- Two flat surfaces at one height flicker: every flat thing goes on its own `kit.LAYER`.
- Card text shimmered: the render redraws the overlay before each screenshot; no `will-change` in the CSS.
- A frame drawn after other frames differed from one drawn first: every shot sets what it shows from `t` alone; the
  render's fresh-browser check catches it.
- Headlights stayed off: lights and glows are applied after the shot, from the mood and `userData` it set.
- The site served an old film: `rendered-from.json` and the freshness test.
- The film was not deployed: a deploy-ignore pattern without a leading `/` matched the media folder too.
- Music as loud as the voice: read `mix.py`'s report every time.
- Hugging Face is often blocked in sandboxes: the voice and speech-recognition models come from GitHub releases.
