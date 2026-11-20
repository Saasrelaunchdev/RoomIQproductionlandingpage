# QA: the story film against the skill's bar

Checked on 2026-11-20. "Measured" means a tool measured it; "seen" means a rendered frame was looked at. Sound was
checked by measurement only (the voice and music were never heard by the maker): please listen.

## Story (bar 1 to 5)

| # | Check | Result |
|---|---|---|
| 1 | One protagonist, the buyer; product arrives at 55 to 65% | The operator ("you"); RoomIQ named at 65.2 s of 117.75 s (55.4%), measured from `audio/timings.json` |
| 2 | The moment of truth twice, same staging | The offer at her desk: lost at 30.7 s (C1, napkin with amber question tags), won at 93.0 to 109.3 s (G1 to G3, the same desk, lamp and camera, the same card with evidence). Seen in `out/beats/C1.png` and `G3.png` |
| 3 | One visible cost proxy | The question marks on the borrowed numbers (amber tags, then empty ghost boxes "behind" them), with two dark Vacant rooms; seen in C2, D2 |
| 4 | Mechanism in 2 to 4 real steps, each on its word | 1. address typed, supply counted and mapped ("maps", 17 pins and ring); 2. rooms and baths ("room", "bath", chips and the room mix); 3. the estimate prints its formula, comps and label ("formula", "comps", "sure"). Seen in F1 to F3 |
| 5 | Close on the page's headline and hero | "See the investment inside the house." over the page's own hero composition (forecast slab, lifted revenue card, supply map, drifting guesses) on its canvas #DEF2FA. Seen in H1 |

## Truth (6 to 8)

| # | Check | Result |
|---|---|---|
| 6 | Every claim traces to the GTM repo; no promised outcome | Each line of `script.json` carries a `claim` or `source` (GTM-BRIEF.md Section 5, the page). No accuracy, income, return, time-saved or coverage claim; rooms glow cyan for evidence, never "full". No third-party statistic is used |
| 7 | Names and numbers from the page's world; no real competitor | Lakeview, 1207 Greenway Drive, the napkin ($4,698; $783 at 75%), the demo forecast ($224 x 6 x 86.5% x 4.35 = $5,057; 14 comps, 1.6 mi; 17 within about 3 mi). "Made-up" is said on screen at A2, on the cost card and the end card. No competitor or platform named |
| 8 | Banned words and rules hold for every spoken and shown word | `npm test`: claim rules on the narration and on every string in `src/story.js` (GTM banned list, dashes, "it's not X, it's Y", competitor and platform names, outcome patterns): pass |

## Voice and words (9, 10)

| # | Check | Result |
|---|---|---|
| 9 | Spoken, humanized; one brand line at the end | Full sentences in the second person; no fragments, "here's the thing", slogan pairs or rhetorical openers; brand named twice (the turn, the close) |
| 10 | Voice cast, 145 to 165 wpm, brand said right, read-back | Kokoro `af_heart`, speed 0.8: 158 words a minute while speaking, measured. "RoomIQ" respelled "Room eye cue" (phonemes ɹˈuːm ˈaɪ kjˈuː). Parakeet read-back: every line reads back word for word |

## Picture (11 to 14)

| # | Check | Result |
|---|---|---|
| 11 | Looks like the page | The page's fonts (Bricolage Grotesque, Instrument Sans) and sprite loaded from the repo; palette from its tokens and the GTM walkthrough's town palette (sampled from roomiq.io); the page's components (pills, ledger tags, estimate card, proof chips, hero slabs) |
| 12 | Every beat visible within 0.3 s of its word | `tools/beats.mjs`: one frame per line at its key word plus 0.5 s, all 18 seen against "shows" (the address pill was moved from +0.45 s to +0.1 s after "next") |
| 13 | Legible at half size, nothing clipped | Overlay text at 26 px or more at 1080p; contact sheets checked for clipping (fixed: the address pill, the sign, the house in the rooms shot, the badge collisions) |
| 14 | No flicker; frames depend on time alone | Fresh-browser re-draw: 33 frames (the middle of every shot and 16 spread), drawn again shuffled, match the frames on disk byte for byte. `tools/flicker.py` on the MP4: the flipping pixels sit on camera moves only (0:02 to 0:06 push-in and glide, 0:41 the rise over the town, 1:12 the pull-out); on still overlays (the count pill, the product slab) the masks are empty, so no text shimmers |

## Sound (15)

| Check | Result |
|---|---|
| Music under the voice | 18.9 dB while speaking (target 15 to 20), 14.3 dB in the pauses (target 12 to 15), measured on the stems by `tools/mix.py` |
| Effects | Peaks 10.2 dB under the voice's peaks (target about 10) |
| Loudness | Mix: -16.5 LUFS integrated, -1.5 dBTP. Encoded: MP4 (AAC) -16.5 LUFS, true peak -1.4 dBFS; WebM (Opus) -16.5 LUFS, -1.3 dBFS. The codecs add 0.1 to 0.2 dB over the mix's peak, still under the -1 dBTP ceiling streaming platforms use |

## On the page (16, 17)

| # | Check | Result |
|---|---|---|
| 16 | Nothing loads before play; accessible dialog; phones | `tests/deploy-check.mjs` in Chromium: no film request before the click; the hero opens the dialog (1188 px wide at 1440), the film plays with sound, the MP4 at 1920x1080, captions showing (WebVTT); Esc closes, focus returns to the hero button, the film pauses; on a 390 px phone the hero button opens it full width and it plays. Light, dark and phone screenshots checked |
| 17 | The deployment serves it; the repo knows it is generated | `.vercelignore` anchors `/story-film/`: git's matching keeps `media/story-film/` and drops the engine (`tests/page.test.mjs`); the deploy-style server answers 404 for the engine and serves both encodings, each playing. `rendered-from.json` matches the sources; every `?v=` is the file's content hash (`tools/stamp.mjs`). `npm test`: 10 of 10 pass |

## The files

| File | Size | Notes |
|---|---|---|
| `roomiq-story.mp4` | 17.0 MB | H.264 High 4.0, 1920x1080, 30 fps, AAC 48 kHz; 1.16 Mbps on average, 0.30 to 1.72 Mbps per 10 s (the wide town shots cost the most) |
| `roomiq-story.webm` | 12.1 MB | VP9 and Opus, 0.82 Mbps |
| `roomiq-story.en.vtt` | 2.9 KB | 40 cues from the voiceover's timing, split at phrases; equal to the narration word for word |
| `roomiq-story-poster.webp` | 54 KB | The opening wide shot of Lakeview, 1280 wide |
