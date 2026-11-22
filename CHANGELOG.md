# Changelog

Every change to the page gets a new version here, newest first, and the same number in `index.html` (`<meta name="page-version" content="N">`). `guard/check.mjs` refuses a push whose version is not higher than the one on `main`, or that has no entry here.

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
