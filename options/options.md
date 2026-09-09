# Design Direction Options — imdb-top-1000-films

Comparison tool: `options.html` (open in any browser — built and rendered with real curated posters, verified working). Not the final artifact.

## Similarity check (per workflow requirement)

Checked all three against: shell, palette temperature, typography mood, control placement, image treatment, density, spatial metaphor, interaction model.

| Dimension | A. Constellation | B. Genre Weave | C. Genre Broadsheet |
|---|---|---|---|
| Spatial archetype | Star field | Woven lattice | Broadsheet front page |
| Ground temperature | Ink-black (cold-neutral) | Warm bone/cream | Warm newsprint gray |
| Placement logic | Emergent (weighted cluster centroid + jitter) | Deterministic (thread intersection) | Hand-tiered editorial zones |
| Multi-genre mechanism | Position between clusters + connector lines | Sits at the actual thread crossing | Duplicate "clipping" thumbnail, dashed outline |
| Typography | Quiet italic, near-invisible | Small-caps archival label | Bold serif masthead |
| Density | Ambient, scattered | Ordered lattice | Packed editorial columns |

No more than one dimension is shared between any two options — well under the "more than two shared traits" rejection threshold. All three avoid axis/chart grammar (no option is a scatterplot or bar chart in disguise — confirmed by removing literal proportional-area encoding from Option C's zone sizing after an initial draft leaned too chart-like).

## Data-Art Mandate check

Posture is data-art-led. Options A and B fully abandon chart grammar (physics-adjacent clustering; textile/notation structure) — satisfies "at least two options." Option C is the explicitly composition-led, named-aesthetic-family option (editorial poster / broadsheet) requested for the set; it's the most legible of the three but still isn't axis-based — it's a hand-composed editorial page, not a treemap.

## What was verified, not just described

Built and rendered in a real browser against the actual curated dataset (126-film genre-diverse sample):
- All three compositions render correctly with real poster images.
- The ~16% broken-poster rate is visible in every option and confirmed to render as the approved quiet text fallback card (title only) — not a broken-image icon.
- Multi-genre mechanism is mechanically real in each option (not just claimed): A draws actual connector lines to every genre a film belongs to; B places films at real thread intersections; C duplicates a smaller "clipping" thumbnail into a second zone.
- Found and fixed one real layout defect during verification: Option C's first draft used CSS Grid with fixed row-spans, which left large dead space in shorter zones. Rebuilt as a full-width lead zone (Drama) plus a 4-column editorial flow below — closer to how a real broadsheet front page works, and the defect is gone.

## Honest tradeoffs (found during internal review — carry forward regardless of which direction is chosen)

- **Option B (Weave) is the most chart-adjacent of the three.** Mechanically it's a two-axis categorical grid (genre-column × genre-row, films placed at the crossing point) — closer to matrix/heatmap territory than A or C. The stitch-mark mechanism for a 3rd genre is a real differentiator no standard chart does, but if B is chosen, the wireframe must stay strictly textile (no gridlines beyond the visible threads, no tick labels, no legend box, no uniform cell shading) or it risks reading as a chart with weave decoration rather than genuine data-art.
- **Option C (Broadsheet) under-represents heavy multi-genre films.** Its "duplicate clipping" mechanism caps at 2 genres (primary + one secondary); a film with 3+ genres has its 3rd+ genre entirely unrepresented — weaker than A (connects to every genre) or B (at least gestures at a 3rd via the stitch mark). If C is chosen, this should either be accepted as a stated tradeoff or improved at wireframe stage (e.g. a small "+2 more" indicator).
- **Option C must stay chrome-free if chosen.** No filter/sort/search controls at wireframe stage — the zones must remain a fixed editorial composition, not a category browser with functional filtering, per the standing "no filter-tab/chip UI" constraint from Analyst/Narrator.

## Recommendation if asked

No strong recommendation forced — all three are legitimate, verified, evidence-respecting directions. If a nudge is useful: **A (Constellation)** is the most purely data-art and best answers the "abandon chart grammar" mandate; **C (Broadsheet)** is the most immediately legible and closest to the "editorial film-poster wall" aesthetic family named in the brief; **B (Weave)** is the most structurally honest about multi-genre membership and the most predictable to scale to all 1000 records without a simulation.
