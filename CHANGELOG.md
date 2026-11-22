# Changelog

Every change to the page gets a new version here, newest first, and the same number in `index.html` (`<meta name="page-version" content="N">`). `guard/check.mjs` refuses a push whose version is not higher than the one on `main`, or that has no entry here.

## v3 (2026-11-22)
- New: the story film. The hero's visual is now the film's poster, and "Watch the story" opens it in a dialog: 1:58, with sound and English captions, loaded only on click; Esc closes it and returns focus to the button.
- The film follows an operator from napkin math to an offer made on evidence. It uses the page's real screens of the RoomIQ web app (Predictor, Analyzer, forecast, Deal Calculator), each captioned as a real screen, shows the RoomIQ logo throughout, and turns from the before to the after on "From guesswork to a defensible offer." Every house, market and figure in its story is made up, and the film says so.
- The narrator is a male voice from an open-source model (Kokoro-82M, Apache 2.0), shaped line by line for tone: pitch, pace and the words each line leans on.
- The film's files are in `media/story-film/` (generated: rebuild them from `story-film/`, never edit by hand); its script, scenes, sound, tools and tests are in `story-film/`, which is not deployed.
- `guard/features.json` now lists the story film.

## v2 (2026-11-20)
- Real screens of the RoomIQ web app, captured in November 2026, replace mockups as proof. Account details and typed addresses are hidden; the property detail and Analyzer signal screens are cropped to exclude the listing title, host name and photo.
- Evidence section ("A sharper view. Not a crystal ball.") now uses the real forecast result ($1,098, Fallback support, Confidence Low) with four callouts, and the real Evidence Quality strip.
- The three feature cards use the real Dallas-Fort Worth dashboard, the real property signal ($72 best spread) and the real Deal Calculator.
- "Benchmark the houses you run" uses the real 7, 30 and 90 day windows.
- New section "Real screens, captured from RoomIQ." (`#app`, in the menu as "Real app"): all twelve usable screens in three tabs (Dashboard, Property Analyzer, Property Predictor).
- Footer note now separates made-up demo content from real screens.
- Not used, and never to be used: discovery screens 08 (visually similar rooms), 09 and 10 (Media Studio). They show other operators' listing photos.
- Anti-regression guard added: `guard/check.mjs`, `guard/features.json`, the pre-push hook, the Claude Code hook and the GitHub check.

## v1 (2026-11-19)
- The page moved here from `RoomIQ-landing-page` as its production home: hero, room calculator, evidence section, three-tab deal demo, market switcher, comparison, pricing, FAQ, founding cohort, scorecard, footer. Product screens were mockups with demo data.
