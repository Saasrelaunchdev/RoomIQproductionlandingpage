# QA: the story film against the skill's bar

Version 2, checked on 2026-11-22. "Measured" means a tool measured it; "seen" means a rendered frame was looked at.
Sound was checked by measurement only (the voice and music were never heard by the maker): please listen.

## What version 2 changed (the owner's review)

| Asked | Result |
|---|---|
| A male voice | Kokoro-82M (open source, Apache 2.0): `am_fenrir` 0.65 and `am_michael` 0.35, blended. No paid voice: the owner asked for open-source voices |
| A voice whose tone changes with what it says | Measured on `audio/narration.flac` (Praat pitch): version 1's lines all sat within 1.4 semitones of each other (medians 189 to 205 Hz), which is the flat tone the owner heard. Version 2's line medians span 3.6 semitones (119 to 147 Hz) and follow the emotion: uneasy 119 Hz, deflated 121, serious 122; excited 144, bright 141, confident 145, proud 147. Movement within a line: 4.97 semitones on average (version 1: 4.5), most on the excited, rueful and confident lines (5.4 to 5.9) |
| The page's real app screens | real11 (Predictor, address hidden), real12 (baseline profile), real07 (Analyzer rooms), real14 (forecast) and real15 (Deal Calculator), each captioned "Real screen · RoomIQ web app · Nov 2026" (plus "personal details hidden" as the page does). Seen in F1 to F4 and G2 |
| The logo and name on the film and its elements | The logo in the top-left corner from 0.15 s to the close (the end card carries its own); on the RoomIQ version of the card; the 3D tile and wordmark at the turn. Seen in every beat frame |
| The problem-to-solution turn, from the board | "From guesswork to a defensible offer." on "RoomIQ", a cyan wipe from the napkin card into the RoomIQ version row for row; the journey rail (Address, Rooms and baths, Comparable rooms, The estimate, The deal). Seen in E1, F1 to F3, G2 |

## Story (bar 1 to 5)

| # | Check | Result |
|---|---|---|
| 1 | One protagonist, the buyer; product arrives at 55 to 65% | The operator ("you"); RoomIQ named at 65.4 s of 118.08 s (55.4%), measured from `audio/timings.json` |
| 2 | The moment of truth twice, same staging | The offer at her desk: lost at 29.7 s (C1, napkin with amber question tags, "Offer sent · on two guesses"), won at 94.3 to 110.0 s (G1 to G3, the same desk, lamp and camera, the same card with its evidence, "Offer sent · with its evidence"). Seen in `out/beats/C1.png` and `G3.png` |
| 3 | One visible cost proxy | The question marks on the borrowed numbers (amber tags, then empty boxes behind them), with two dark Vacant rooms; seen in C2, D2 |
| 4 | Mechanism in 2 to 4 real steps, each on its word | 1. address: the real Predictor, the town's 17 houses counted and mapped ("maps"); 2. rooms and baths: the real baseline's bathroom mix ("bath"), the real Analyzer's rooms by bath and size ("comparable"); 3. the real forecast's formula, comps and labels ("formula", "comps", "label"); 4. its labels when the evidence is thin ("thin"). Seen in F1 to F4 |
| 5 | Close on the page's headline and hero | "See the investment inside the house." over the page's own hero composition on its canvas #DEF2FA. Seen in H1 |

## Truth (6 to 8)

| # | Check | Result |
|---|---|---|
| 6 | Every claim traces to the GTM repo; no promised outcome | Each line of `script.json` carries a `claim` or `source` (GTM-BRIEF.md Section 5, the page). The new line F4 rests on the real forecast's own labels (Fallback support, Confidence Low, 82.88 mi) and GTM's "sell the labeling". No accuracy, income, return, time-saved or coverage claim; rooms glow cyan for evidence, never "full" |
| 7 | Names and numbers from the page's world; real screens keep their own | The story's figures are the page's made-up house: Lakeview, 1207 Greenway Drive, the napkin ($4,698; $783 at 75%), 17 within about 3 miles. The real screens show only their own figures ($1,098 and its labels, as the page shows them); no demo figure is typed onto a real screen. "Made-up" is said on screen at the cost card and the end card. Discovery screens 08, 09 and 10 are not used. The Deal Calculator's 5% vacancy default (GTM Q31) is not lit |
| 8 | Banned words and rules hold for every spoken and shown word | `npm test`: claim rules on the narration and on every string in `src/story.js` (GTM banned list, dashes, "it's not X, it's Y", competitor and platform names, outcome patterns): pass |

## Voice and words (9, 10)

| # | Check | Result |
|---|---|---|
| 9 | Spoken, humanized; one brand line at the end | Full sentences in the second person; no fragments or slogan pairs; brand named twice (the turn, the close) |
| 10 | Voice cast, 145 to 165 wpm, brand said right, read-back | Kokoro `am_fenrir` and `am_michael`, speed 0.9 with a pace per emotion, shaped by `tools/prosody.py`: 161 words a minute while speaking, measured. "RoomIQ" respelled "Room eye cue". Parakeet read-back after shaping: every line reads back word for word |

## Picture (11 to 14)

| # | Check | Result |
|---|---|---|
| 11 | Looks like the page | The page's fonts, sprite and logo loaded from the repo; its palette and components (pills, ledger, estimate card, hotspots, proof captions) |
| 12 | Every beat visible within 0.3 s of its word | `tools/beats.mjs`: one frame per line at its key word plus 0.5 s, all 19 seen against "shows" |
| 13 | Legible at half size, nothing clipped, clear of the captions | Overlay text at 26 px or more at 1080p; fixed in review: the rail against the logo, the real-screen captions over the town (now on a light pill), callouts covering what they point at, the deal label off the frame's edge, house markers over the count pills. The count, "Before the offer" and "Offer sent" pills moved up, out of the band the player's captions use |
| 14 | No flicker; frames depend on time alone | Fresh-browser re-draw: 33 frames (the middle of every shot and 16 spread), drawn again shuffled, match the frames on disk byte for byte. `tools/flicker.py` on the MP4: the flipping pixels sit on camera moves only (0:02 to 0:06 push-in and glide, 0:40 to 0:41 the rise over the town, 1:11 to 1:12 the rise for the supply count); on still overlays (the logo, the rail, the real Predictor screen) the masks are empty |

## Sound (15)

| Check | Result |
|---|---|
| Music under the voice | 18.8 dB while speaking (target 15 to 20), 14.2 dB in the pauses (target 12 to 15), measured on the stems by `tools/mix.py` |
| Effects | Peaks 9.1 dB under the voice's peaks (target about 10); 24 effects, one new on "test the deal" |
| Loudness | Mix: -16.5 LUFS integrated, -1.5 dBTP. Encoded: MP4 (AAC) -16.5 LUFS, true peak -1.5 dBFS; WebM (Opus) -16.5 LUFS, -1.5 dBFS |

## On the page (16, 17)

| # | Check | Result |
|---|---|---|
| 16 | Nothing loads before play; accessible dialog; phones | `tests/deploy-check.mjs` in Chromium: no film request before the click; the hero opens the dialog (1188 px wide at 1440), the film plays with sound, the MP4 at 1920x1080 and 118.08 s, captions showing (41 cues); the WebM plays on its own; Esc closes, focus returns to the hero button, the film pauses; on a 390 px phone the hero button opens it full width and it plays. The button says "1:58 · sound on" and its label "1 minute 58 seconds" |
| 17 | The deployment serves it; the repo knows it is generated | `.vercelignore` anchors `/story-film/`; the deploy-style server answers 404 for the engine and serves both encodings. `rendered-from.json` matches the sources; every `?v=` is the file's content hash (`tools/stamp.mjs`). `npm test`: 10 of 10 pass. `guard/check.mjs`: ok, page-version 3 |

## The files

| File | Size | Notes |
|---|---|---|
| `roomiq-story.mp4` | 17.5 MB | H.264 High, 1920x1080, 30 fps, AAC 48 kHz; 1.19 Mbps on average |
| `roomiq-story.webm` | 12.4 MB | VP9 and Opus, 0.84 Mbps |
| `roomiq-story.en.vtt` | 3.0 KB | 41 cues from the voiceover's timing, split at phrases; equal to the narration word for word |
| `roomiq-story-poster.webp` | 55 KB | The opening wide shot of Lakeview with the logo, 1280 wide |
