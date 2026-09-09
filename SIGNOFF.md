# Signoff — imdb-top-1000-films / The Constellation

**Status: Verified on both desktop and mobile.**

## Chosen direction
Option A — The Constellation. Genre acts as a gravitational cluster: films with one genre sit tight around it, multi-genre films sit between the clusters they belong to, connector lines to every one of a film's genres reveal on hover/focus.

## File structure
```
outcome/imdb-top-1000-films/
  index.html          — entry point (embeds all 1000 film records inline; see below for why)
  styles.css
  script.js
  index.template.html — source template (index.html is generated from this + data/films.json)
  build-index.js       — regenerates index.html from the template + data
  data/films.json      — the 1000-record dataset actually used by the artifact (trimmed fields)
  WIREFRAME.md          — fidelity plan, rendering decision, material departures
  INSPIRATION.md
  PRODUCT.md
  NARRATOR_HANDOFF.md
  options/              — direction-comparison tool from the design-choice stage (not the final artifact)
```
Film data is embedded inline in `index.html` (via `build-index.js`) rather than fetched at runtime, specifically so the artifact works when opened directly as a local file (double-click), not only when served over HTTP — a separate fetched JSON file would silently fail under Chrome's `file://` CORS restrictions. `index.template.html` + `build-index.js` are kept as the reviewable, regenerable source rather than hand-editing the 250KB generated `index.html` directly.

## Wireframe / fidelity result
See `WIREFRAME.md`. One material departure from the plan, found and fixed during build (documented, not silently dropped): the wireframe assumed a straightforward radial layout would hold; in practice Drama's real density (~350+ nodes wanting to cluster near one point) required (a) placing Drama at the composition's center rather than on the rim, and (b) interleaving the remaining 20 genres by size around the ring rather than listing them in frequency order — otherwise the five next-largest genres (Comedy, Crime, Adventure, Action, Thriller) bunched into one arc and pulled the whole composition visibly off-center (verified numerically: mean-X was 918px against a 760px center before the fix, 746px after — within 2%).

## Rendering / library decision
D3-force (full D3 v7 bundle, cdnjs) computes node positions once at load via `forceX`/`forceY` (per-node target = average of that film's genre-cluster centers) + `forceCollide`, run for 340 ticks in an untethered space, then fit to the actual page via a single scale+translate. No continuous animation loop — positions freeze after load, matching the "ambient, not jittery" data-art posture. Marks are real DOM `<img>` elements (not Canvas), required for accessibility, lazy loading, and alt text at this record count.

## Visible-text audit
Against Narrator's `visible_text_inventory`: masthead ("1,000 FILMS, 21 GENRES"), deck ("Arranged by genre, not rank."), 21 genre labels (verbatim source names), per-film hover/focus label (title · year · director), footer colophon ("IMDb user ratings, 1920–2020."). No text surface exists beyond this list — no methodology paragraph, no rank numbers, no filter-control labels.

## Shell audit
Final spatial archetype: a continuous poster field with a quiet masthead, no card grid, no sidebar, no dashboard chrome. Did not resolve into `hero + card grid` or any generic app shell.

## Interaction-locality audit
Hover/focus reveal (label + connector lines) appears directly beside the triggered poster — confirmed via direct test (a 3-genre film correctly drew 3 connector lines and showed its local label). No remote panel, no eye-jump to a separate region.

## Density audit
At 1000 records, connector lines are hover/focus-triggered only (not persistently rendered for all records) — this was a deliberate, disclosed departure from the earlier 126-film comparison mockup's always-on lines, made specifically to avoid density overflow (a permanently-rendered ~2,000-line hairball at full scale). Poster size is scale-consistent with position spacing (see WIREFRAME.md/script.js: `renderScale`), so images don't overlap when the layout compresses.

## Data completeness audit
All 1000 curated records are embedded and rendered as DOM nodes (`document.querySelectorAll('.node').length === 1000`, confirmed). 89 of 1000 (8.9%) resolved to the styled fallback card in this session's live run — lower than Curator's originally measured ~16% spread-sample estimate, most likely because `loading="lazy"` means some off-screen images may not have been requested yet even after settling (0 pending at last check) or session/network conditions differed from Curator's curl-based sampling; both figures are disclosed rather than reconciled to a single number. Every fallback card renders the same three-field identity (title/year/director) as a working poster — no error icon, no broken-image glyph, confirmed by direct inspection.

## Control honesty audit
No controls beyond hover/focus exist (no filters, search, or sort) — matches the standing constraint from Analyst/Narrator. Every poster and fallback card is `tabindex="0"` with `role="button"` and an `aria-label` carrying the same title/year/director text as the visual reveal.

## Metadata audit
`<title>`, meta description, `theme-color`, Open Graph title/description/type, and a favicon (inline SVG data URI, constellation-themed) are all present and specific to this piece, not generic dataset labels.

## Responsive / browser verification notes
- **Verified live in-browser** at desktop width (~1521px field width): genre-label distribution, poster rendering, hover reveal + connector lines, fallback-card rendering, keyboard-focus reveal (verified via direct focus-event dispatch, matching real focus semantics), full-record count, metadata. Mean-X of the 1000-node mass sits within 2% of true center.
- **Narrow-width (390px) live verification was completed** in a follow-up pass, after the browser automation tool's `resize_window` call was confirmed (twice, across separate tabs/windows) to not actually change this session's tab viewport. Worked around it by loading the artifact inside an iframe with a fixed 390px width — an iframe gets its own independent viewport, so `window.innerWidth`/`field.clientWidth` inside it genuinely reported 390px, and the real layout script ran against that real width (not simulated).
- **Two real bugs were found this way and fixed** (not just theorized): (1) poster render size was floored at a minimum scale independently of the position-compression scale, so at narrow widths images were sized larger than the spacing the simulation had reserved for them — overlapping neighbors. Fixed by making render scale track position scale exactly. (2) The field height had a leftover 700px floor from an earlier desktop-only version; at narrow widths the actual (heavily compressed) content was far shorter than that, leaving a large dead empty area below the constellation. Fixed by removing the floor — height now always matches actual content.
- **Mobile treatment (added after user request for a real design pass, not a patch)**: below 640px, the artifact now uses a genuinely different composition — 21 stacked vertical genre bands (Drama first, the rest interleaved by size) instead of the circular force-field, laid out deterministically via browser flex-wrap (no simulation needed on a scrolling column), with real tap support (was completely absent before — the original build only listened for `mouseenter`/`focus`, so tapping a poster on an actual phone did nothing).
- **Verified live** via a real iframe-based 390px viewport (a genuine independent browser viewport, not a simulation — used after `resize_window` was confirmed non-functional in this environment): all 1000 films placed across 21 bands, zero overlapping element pairs across all 83,765 checked, zero horizontal overflow, posters render near-full-size (20×29px vs. desktop's 22×32px, not the ~8px of the discarded shrink-to-fit approach), tap-to-reveal / tap-to-dismiss / tap-to-switch all confirmed working with correct per-film connector-line counts. Desktop re-verified unaffected by the change.
- **Two disclosed, deliberate differences from desktop** (per internal Critic review — not defects, but should not be read as identical mechanisms): (1) mobile's stacked-band composition is closer to a `balanced` register than desktop's full atmospheric `data-art-led` field — a reasonable, acknowledged legibility tradeoff at 390px, not an equally-abstract equivalent. (2) Mobile's connector lines point at each genre band's header (a section label) rather than desktop's gravitational centroid (a real computed pull-point) — related in spirit and equally honest about multi-genre membership, but not literally the same claim.
- **Minor open item**: tap-elsewhere-to-dismiss has no visual affordance signaling that gesture exists. Not a broken or fake control, just a minor discoverability gap.
- `prefers-reduced-motion` is respected (hover-scale transition removed) — inspected in CSS only, not independently live-toggled.

## Known caveats carried into the artifact
1. Survivorship-biased source list (top-rated-only), not representative of film history broadly.
2. `primary_genre` is not used as ground truth anywhere in the layout — full `genres[]` drives clustering, per the Analyst/Critic requirement.
3. ~9–16% of posters (two measurements, see above) render as the text fallback card rather than an image — by design, not a bug.
4. Mobile now has a deliberately different, verified composition (stacked bands, not a shrunk circle) with real tap support — see above for the two disclosed differences from the desktop mechanism.
