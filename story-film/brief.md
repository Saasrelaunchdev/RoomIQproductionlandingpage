# Film brief: RoomIQ

Every line cites a file. `GTM:` is `Saasrelaunchdev/roomIQGTMBuild` at `main` (c2e7958, read-only); `LP:` is this repo.
Unknown: `{TBD: reason}`.

## Choices (decided at the end of discovery)

- **World:** Lakeview, the page's own made-up market (LP:index.html, product previews and the demo), built as a
  miniature town on a floating slab: Greenway Drive along the greenway, City Park, the lake, Mill Lane. The candidate
  house is the page's demo house, 1207 Greenway Drive, six bedrooms. A second set is the operator's desk at home in the
  evening, where the numbers are worked out and the offer is sent (the moment of truth, shown twice). An abstract set
  on the page's light canvas carries the product screens. Why: the buyer's unit of value is the room inside a house
  (GTM:GTM-BRIEF.md Section 1, "Unit of analysis"), the page's headline is about the house ("See the investment inside
  the house."), and the GTM walkthrough already uses a miniature real-estate town whose houses open and whose rooms
  light (GTM:walkthrough/BRIEF.md, "The open house (recurring motif)").
- **Medium:** a mix. 3D clay town (the engine's Three.js kit) in the page's palette for the human beats; UI-led for the
  mechanism, with the page's own product previews (LP:media/*-screen-1920.webp, demo data) floating in tilted slabs as
  the hero does, and crisp HTML recreations of the regions that land on a spoken word (the revenue card, its formula and
  labels, the supply count, the room mix). Why: the page's art is product UI in soft 3D slabs (LP:index.html #hero,
  `.hv-3d`), and every product screen must be a captioned preview on demo data (LP:CLAUDE.md, non-negotiable 3).
- **Voice:** a warm, grounded American female narrator, calm and plain, Kokoro `af_heart` at about 0.9 speed, local
  (Kokoro-82M, Apache 2.0). Why: the GTM gives no demographic lead on purpose (housing ad rules; GTM:deliverables/
  buying_committee.xlsx, Design_Partners, "Demographics: Not used"), the audience is US owner-operators, often couples
  (GTM:deliverables/icp_dashboard.xlsx, Team Size), and the brand's tone is calm and honest ("A sharper view. Not a
  crystal ball."). `af_heart` is the best-rated Kokoro voice. ElevenLabs was not used: `api.elevenlabs.io` is closed in
  this environment without a key. The film re-voices without touching the scenes (the timeline follows
  `audio/timings.json`).

## Ground rules

- GTM repo: `Saasrelaunchdev/roomIQGTMBuild`, read-only for this work. Its canonical branch is `main` (GTM:CLAUDE.md
  section 1); the local checkout was on an older branch, so `main` was read from a detached worktree.
- Landing repo rules (LP:CLAUDE.md): edit `index.html` directly (Vercel serves the root as is, no build); claims only
  from GTM-BRIEF.md Section 5; compare structure and evidence, never people; no competitor names; no host name,
  listing title or photo, exact address or named data-source platform; every house, market and figure in a demo is made
  up and says so; product previews are captioned as previews; copy budget (sentences up to 20 words, no em dashes);
  numbers agree at 4.35 weeks a month; phone first, WCAG 2.2 AA, light and dark, reduced motion; images cached for a
  year, so media URLs carry `?v=`.
- Branch: develop on `claude/great-feynman-dfi92v`, push there. No merge or deploy without the owner.
- Deploy: Vercel, static, `vercel.json` (no install, no build). `/media/(.*)` is served `immutable` for a year, so the
  film's four files are referenced with `?v=<hash>`. No `.vercelignore` existed; one is added with the anchored
  pattern `/story-film/` so the engine is never uploaded and `media/story-film/` always is.
- Existing video player: none. The page has two `<dialog class="dlg">` (seat application, scorecard); the film dialog
  reuses that component. No other videos on the page, so loudness uses the skill's default (-16.5 LUFS, -1.5 dBTP).

## From the GTM repo

| Field | Value | Source |
|---|---|---|
| Product in one sentence | Room-level market data and underwriting for US rent-by-the-room investors: pick a market, benchmark comparable properties, and estimate an address's revenue and deal returns, with the evidence behind each number shown | GTM:GTM-BRIEF.md Section 1, One-liner |
| ICP (the one featured) | Level 1: small co-living operators already running rent-by-the-room homes, owner-operated, about 1 to 10 homes, evaluating the next acquisition | GTM:deliverables/icp_dashboard.xlsx, ICP; GTM:GTM-BRIEF.md Classification |
| The buyer's words | rooms, by the room, weekly rent, occupancy, fill, lease-up, comps, private bath, shared bath, the next house, the offer, the deal, pencils | GTM:deliverables/buying_committee.xlsx; LP:index.html copy |
| Unit of value | The room: priced per room per week, occupancy tracked room by room, segmented by bath type and size | GTM:GTM-BRIEF.md Section 1, Unit of analysis |
| Good intent | They run their houses well and use the right first formula: rooms, times weekly rent, times occupancy | LP:index.html #napkin ("It's the right first question") |
| Quiet failure (no one at fault) | Two of the formula's numbers are borrowed: the rent is typed in, the occupancy assumed; nearby supply is never counted; no confidence is shown | LP:index.html #napkin ledger; GTM:deliverables/assets_library.xlsx, pain-stack hooks |
| Moment of truth and the decider | The offer on the next house, decided by the operator. Lost: made on borrowed numbers, then two rooms sit empty for weeks while 17 houses nearby rent rooms. Won: the same desk, the same formula, every number with its evidence | GTM:deliverables/icp_dashboard.xlsx, Triggers ("Evaluating the next property"); assets_library.xlsx hooks ("a house that filled slower than the spreadsheet said", "a market that looked open until the nearby supply was counted") |
| Rival (fictional, by role) | The status quo: the napkin math. And the unseen supply nearby, shown as structure (houses), never as people or another operator's property | GTM:GTM-BRIEF.md Section 5, governing sensitivity |
| Visible proxy for the cost | The question marks on the plan's numbers ("$200/wk?", "90%?", "Supply?"), the page's own drifting guesses; and two dark rooms marked Vacant | LP:index.html #hero `.drift`, #napkin ledger tags |
| Mechanism steps (trigger, visible result) | 1. Type the address: nearby co-living supply counted and mapped within about 3 miles (C21, Seen). 2. Add each room and its bath: private-bath and shared-bath rooms change the estimate (baseline, C14). 3. The estimate prints its formula, its comps and its support and confidence labels, and flags the one input to check (C27, Seen). Then the deal is tested with the operator's own costs (C31) | GTM:GTM-BRIEF.md Section 3; LP:index.html #how, #evidence |
| Proof on file (may the after show results?) | None: the proof table is empty until founding operators sign citation clauses. The after shows the decision made on evidence, never a result | GTM:GTM-BRIEF.md Section 5, "The proof set" |
| Statistics (value, wording, source, year) | No third-party statistic is used. The only figures are the page's own arithmetic on its made-up house: 6 rooms x $200/wk x 90% x 4.35 = $4,698 a month; at 75%, $783 a month off the plan. Demo forecast: $224 x 6 x 86.5% x 4.35 = $5,057, 14 comps a median 1.6 mi away, local support, Confidence Medium; 17 active properties within about 3 mi | LP:index.html #napkin, screens JSON (forecast, location) |
| Claim rules and banned words | GTM-BRIEF Section 5: no accuracy, prediction, outcome, income, return, time-saved, "only/first/leading", coverage or price-comparison claims; no named platform; "estimate", "shows its working"; Deal Calculator "informational only, not financial or lending advice". Banned: leverage, unlock, seamless, robust, streamline, cutting-edge, empower; no en or em dashes | GTM:GTM-BRIEF.md Section 5; GTM:CLAUDE.md section 4 |
| Brand line to close on | "See the investment inside the house." (one of the three site headlines that stay) | GTM:GTM-BRIEF.md decision 7; LP:index.html #hero |

## From the landing repo

| Field | Value | Source |
|---|---|---|
| Hero headline and visual | "See the investment inside the house." The forecast screen in a tilted slab, its revenue card lifted off it ($5,057 /mo, the formula, Local support, Confidence Medium) with a cyan glow edge, the nearby-supply map slab at its corner, three guesses drifting away | LP:index.html #hero |
| Hero on phones | The visual stays, below the two buttons | phone screenshot at 390 px |
| Art style (one sentence) | Clean product UI floating in soft 3D slabs on a pale cyan canvas (deep navy in dark mode), cyan glow edges, rounded cards, navy ink | LP:index.html; screenshots |
| Palette | navy ink #03045E, deep #010041, cyan #00B4D8, cyan text #00667B, blue action #0077B6, primary-50 #ECFAFE, primary-100 #D9F4FC, surface #F4F7FE, line #EBEEF6, signal amber #F2B442 (text #785300), ok green (product) #1FA971 | LP:index.html tokens; product previews |
| Fonts (files) | Bricolage Grotesque (display, 200 to 800, `fonts/bricolage-grotesque-latin-opsz-normal.woff2`), Instrument Sans (text, 400 to 700, `fonts/instrument-sans-latin-wght-normal.woff2`) | LP:fonts/ |
| Components to reuse | `.proof-chip` (dot + "Product preview · demo data · web app"), the ledger (`.ldg` with `.tag.borrowed`), `.est` calculator card, hotspots, `.label`, buttons (navy fill, cyan in dark), `.dlg` dialog | LP:index.html |
| Icon sprite and logo | Inline sprite (`i-check`, `i-x`, `i-home`, `i-map`, `i-calc`...); logo: a cyan rounded square (`logo-mark`, rx 6 of 26) and "RoomIQ" in Bricolage 800 (`logo-h`) | LP:index.html sprite |
| Sample world | Operator "maya.ortiz"; market Lakeview (Northgate, Midtown, Riverside, Harbor Point); 1207 Greenway Drive, Lakeview, house, 6 bedrooms, 4 baths, 2,640 sq ft, 2 private-bath rooms, shared-bath pressure 2.0; streets North Lane, High Street, Mill Lane, Park Road, Elm Street, City Park, Greenway, the lake | LP:media product previews; LP:index.html demo JSON |
| Statistics and claims already on the page | $4,698 napkin, $783 and $470 what-ifs, $5,057 forecast, $1,032 slow launch (Diggz, Atlanta), "No accuracy claim. Working you can check." | LP:index.html |

## What the GTM screenshots were used for

The 15 app captures in GTM:docs/discovery/screenshots are the source for what the product does and how its screens
look. They are not shown raw: they carry a signed-in account's name and email, real market names and figures, and three
of the five first-run defects (the $1,098 forecast on 1 room, Q26; the 22% interest default, Q30; the 5% vacancy
haircut, Q31), which GTM decision 6 keeps out of every public asset. The film shows the same screens as the page does:
re-staged on demo data (LP:media), plus HTML recreations of their panels, all captioned as product previews.
