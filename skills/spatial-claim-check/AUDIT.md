# Spatial Claim Check — "1,000 Films, 21 Genres"

Audit of the genre constellation in `before/`, run 9 September 2026; second pass
over the rebuilt artifact, 10 September 2026; third pass against an external
critique, 6 November 2026.
Every number below was measured, not estimated; the method for each is given so it
can be re-run.

**Subject.** 1,000 films from the IMDb Top 1000, placed by genre. Drama is fixed at
the centre of the field, the other 20 genres on a circle of radius `0.42 × width`.
Each film is placed at the unweighted mean of its genres' positions, then relaxed
with a d3 force simulation (`forceX`/`forceY` toward the mean, `forceCollide`).
Marks are 22 × 32 px poster images.

---

## Verdict

| # | Check | Verdict | Reason, with the number |
|---|---|---|---|
| 1 | Claim stated | **PASS** | The piece commits to one: *"films with more than one genre sit between the clusters they belong to."* Testable — which is what makes the rest of this audit possible. |
| 2 | Frequency domination | **FAIL** | Drama is **72.4%** of the collection (724/1000), far past the 40% threshold. Under raw co-occurrence it is the top-ranked partner of 6 of the 8 strongest pairs. |
| 3 | Method supports the reading | **WEAK** | Force layout: adjacency is readable, absolute position is not. The fixed Drama-at-centre construction invites reading the centre as "most typical", which the method cannot support. |
| 4 | Determinism | **FAIL** | Node jitter uses unseeded `Math.random()` (`script.js:120`). The map is different on every reload; a cluster cannot be pointed at twice. |
| 5 | Aggregation collapse | **FAIL** | Unweighted centroid + 72.4% Drama. **4 of 21 genres — Biography, Mystery, Family and War — have zero films within 120px of their own label**, despite holding 109, 99, 56 and 51 films. |
| 6 | Legibility at N | **FAIL** | Layout affords 1,048 px² per mark; the mark is a 22 × 32 px poster (704 px²). A poster needs roughly 60–80 px of width to be identifiable. Identity — the only thing the mark encodes — is unreadable, and rating is not encoded at all. |
| 7 | Caveat + exposed coordinates | **FAIL** | No caveat in the artifact, though the project's own `INSPIRATION.md` warned: *"must not read as a scientific instrument."* No way to extract coordinates. |

---

## The claim, measured

> "Films sit among the genres they belong to."

**Test.** For every film, find the nearest of the 21 genre anchors, and ask whether it
is one of that film's own genres. Scale-free — no radius, no units, no dependence on
canvas size. Random placement scores ≈12% (mean 2.54 genres ÷ 21 anchors).

| | Overall | 1-genre | 2-genre | 3-genre |
|---|---|---|---|---|
| **Original build** | **55.4%** | 98.1% | 59.4% | 46.9% |

Read the columns, not the total. The layout aces the trivial case — a single-genre
film is placed exactly on its anchor and barely moves — and then does worst on
**exactly the case the piece exists to show**. Three-genre films, 64.6% of the
collection and the whole premise of "sitting between clusters", land nearest a genre
they do not belong to more than half the time.

The headline 55.4% is carried by the 10.5% of films the piece is *not* about.

---

## Why (check 2 and 5, mechanically)

Under raw co-occurrence, Drama sits at **0.039** from the centre of the layout while
the average anchor sits at **0.302** — it is pinned at the gravitational centre, at
13% of a typical anchor's distance from it. Because 72.4% of films carry Drama into
their centroid, most of the collection is dragged into an undifferentiated middle.

The top pairs show the same thing. By raw count, five of the top six contain Drama:

| Rank | By raw count | | By Jaccard |
|---|---|---|---|
| 1 | Crime + Drama — 160 | | Action + Adventure — 0.275 |
| 2 | Comedy + Drama — 123 | | Adventure + Animation — 0.230 |
| 3 | Drama + Romance — 106 | | Crime + Drama — 0.207 |
| 4 | Biography + Drama — 103 | | Biography + History — 0.204 |
| 5 | Action + Adventure — 83 | | Mystery + Thriller — 0.163 |
| 6 | Drama + Thriller — 83 | | Action + Crime — 0.160 |

Raw counts mostly rediscover that Drama is common. Jaccard surfaces pairs that are
specifically each other's: Action–Adventure, Biography–History, Mystery–Thriller.

---

## Fixes, ablated

Four changes were made. Reporting them as a bundle would prove nothing, so each was
varied alone. Metric as above; `evidence/ablate.js` reproduces the table.

| Config | Overall | 1-genre | 2-genre | 3-genre |
|---|---|---|---|---|
| A — raw counts, plain centroid, no cap | 39.7% | 16.2% | 33.7% | 45.8% |
| B — **+ Jaccard affinity** | 56.1% | 24.8% | 48.2% | 64.2% |
| C — + aspect-fill fit (capped 1.45×) | 58.2% | 28.6% | 47.8% | 67.0% |
| D — + rarity-weighted centroid | 58.2% | 29.5% | 54.6% | 64.2% |
| E — **+ cluster radius cap** *(shipped)* | **69.3%** | **100.0%** | **61.8%** | **67.2%** |

Config E is confirmed against the live artifact via `window.__spatialAudit()`, which
reports the same four figures — so the offline port is faithful and A–D can be
trusted.

**On the precision of these figures.** The metric is scale-free, but the *layout* is
recomputed per viewport, so the anchors move when the frame's aspect ratio changes
and the score moves with them. Across three subsequent builds the same configuration
measured 69.3%, 69.2% and 68.5%, purely from resizing the container. All three are
correct for the frame they were taken in; quoting any of them to one decimal in the
artifact was not. The eventual fix was structural rather than editorial: stop
re-solving the layout per viewport, so there is one figure to quote. See the
third pass above.

**What the ablation says, including the parts that are unflattering:**

- **Jaccard is the single biggest lever** (+16.4 points). It earns its place.
- **The aspect-fill fit adds +2.1**, not the transformation it appeared to be. Judged
  by eye it looked like the change that spread the layout out; measured, it is a
  minor contributor. Anchor-to-anchor adjacency is nearly unchanged between raw and
  Jaccard (Crime→Thriller, Adventure→Action are the nearest-neighbour pairs under
  both) — the measure changes *how far Drama sits from the pack*, not who is beside
  whom, and it is the former that moves film placement.
- **The rarity-weighted centroid contributes 0 points overall.** It redistributes —
  2-genre films +6.8, 3-genre films −2.8 — and it populates the outer clusters
  visually, which is why it was kept. But it does not improve the claim metric, and
  saying it did would be false.
- **The cluster radius cap adds +11.1** and was found only because the audit was run
  on the *new* build too. Without the cap, single-genre films scored **29.5%** —
  worse than the original build's 98.1%. The rebuild had quietly broken the easiest
  case while fixing the hard one.

### The cap, stated

A cluster may grow to at most **0.46 × the distance from its centroid to the nearest
anchor it does not belong to**. Past the halfway point its outer members are closer
to a foreign genre than to their own, and the chart contradicts its own caption.
Before the cap the Drama-only cluster spread 145 px while Comedy's anchor sat 108 px
away.

---

## Rewritten claim

Paste this into the artifact, replacing nothing (there was nothing):

> Genres are anchored by how often they share a film **relative to how common each
> one is**, so Action sits beside Adventure and Biography beside History, while
> Musical drifts to the edge. Each film then sits between its own genres' anchors,
> pulled hardest by its rarest one. Position is affinity, not measurement.

---

## Result

Measured on the live artifact at 1512×950 unless stated.

| | Original | Rebuilt | Shipped |
|---|---|---|---|
| Nearest anchor is own genre | 55.4% | ~69% | **64.0%** |
| — one-genre films | 98.1% | 100% | 87.6% |
| — two-genre films | 59.4% | 61.8% | 61.0% |
| — three-genre films *(the premise)* | 46.9% | 67.2% | **61.3%** |
| Spread of that score across screen shapes | not measured | 69.3 → 68.5 | **64.5 / 64.1 / 64.3** |
| Genres with no films near their label | **4 of 21** | 0 of 21 | 0 of 21 |
| Anchor labels legible over the field | no | yes, scrimmed | yes, scrimmed |
| Overlapping label pairs | not measured | 0 | 0 at 390px and 1512px |
| Deterministic across reloads | no | yes (seeded) | yes (seeded) |
| Rating encoded | not at all | radius + brightness | **5 classes, radius + lightness** |
| Rating classes shown in the legend | — | 3 of a continuous ramp | **all 5, with counts** |
| Dense centre readable | no (22px posters) | no (additive blowout) | **yes (capped source-over)** |
| Animation on an encoding channel | n/a | brightness ±7% | **none** |
| Smallest rendered type | 6.4px | 9px | **12px** |
| Caveat in the artifact | none | one sentence, in frame | one sentence, in frame |
| Coordinates auditable | no | `window.__spatialAudit()` | `window.__spatialAudit()` |

**The score went down, and that is the trade.** The rebuild re-solved the layout
for every viewport, which fit each screen better and meant no two readers saw the
same map. The shipped version solves once and fits, so the arrangement is stable
to within half a point across landscape, narrower landscape and portrait — and
costs about five points of absolute accuracy to get there. Stability was judged
the better buy for something a reader is meant to return to. Both numbers are in
the artifact.

---

## Third pass, against an external critique

An outside review of the shipped artifact raised nine data-visualisation points
and seven UX ones. Most were fair and are now fixed. Three are worth recording
because the skill's own checks had passed the build they were made against.

**Check 6 missed that a channel can be technically present and practically
unreadable.** Rating was carried by area, brightness and blur — all low on the
Cleveland–McGill accuracy ranking — on a continuous ramp. The distribution made
it worse: 805 of 1,000 films rate between 7.6 and 8.1, so four fifths of the
collection sat in the bottom third of the brightness range, the faintest drawn at
about 7% opacity. The check asked whether the mark could be *resolved*; it did not
ask whether the *scale* could be read. Now five graduated classes with fixed
sizes, breaks following the distribution, all five in the legend with counts.

**Nothing in the skill covered exaggeration.** Radius ran 1× to 3.7×, so area grew
13.7× across a range whose real spread is 22% — a lie factor near 57 by area.
Stretching within a range is a legitimate choice; the legend not saying so is not.
It now reads "sizes are relative within 7.6–9.3, not to scale."

**Check 6b was right and still insufficient.** It said motion carrying no data
must stay below the threshold of attention. It did not say that motion on a
channel that *does* carry data is simply forbidden. The twinkle modulated
brightness, which is rating; the parallax moved position, which is genre. Both
are off the data now — the disc holds steady and only the glow around it
shimmers, with a separate dust layer carrying the parallax.

Also fixed: additive blending replaced with capped source-over, because 'lighter'
summed the 724-film Drama core to flat white; blur replaced with aerial
perspective, so no mark is harder to hit than another; uneven Wall bands aligned
to the same five classes; the 2020s bar marked as the single year it covers.

On the UX side the timing heuristic for scroll-to-zoom is gone — plain wheel
belongs to the page, Ctrl/Cmd+wheel zooms — the star a click would take is ringed
before the click, several films inside one pick radius are listed rather than
silently resolved, and the "how to read it" note moved from below the chart to
three steps on first visit.

**The rAF trap caught this author a third time.** Verifying the cursor lens on the
live site returned a −0.0% lift and I nearly reported the feature broken. The pane
was not painting, so `requestAnimationFrame` never advanced and the canvas held
the frame from before the hover. Re-measured with forced paints: 2.5%. This is
already in the Never list and in `references/interaction.md`, and it still cost a
false finding.

## Second pass, on the rebuilt artifact

The skill was re-run against the redesigned page. Two checks that had passed on the
original failed on the rebuild, both because the rebuild was more ambitious:

- **Check 6, labels.** The genre labels were unreadable over the dense core, and
  collided with each other at narrow widths. The original had never triggered this
  because its labels sat in empty space, which is to say it passed by accident. Fixed
  with a per-frame scrim, collision relaxation with leader lines, and a re-layout
  after the webfont swap. Now 0 overlapping pairs at 390px and 1512px.
- **Check 6b, a new one this pass created.** The rebuild added depth and parallax.
  A z-axis the reader can see but that encodes nothing is a spatial claim with no
  data behind it, so depth was bound to rating, which it already needed to show.

Interaction added a third failure that check 3 had no vocabulary for: the crowded
core was unclickable, and the zoom that fixes it fought the page for the scroll
wheel. Both are now written up in `references/interaction.md`.

## Note on a false finding

An early pass recorded that the original build rendered a near-empty field with
almost no posters loaded. That was wrong, and worth recording as a caution: the
browser pane running the check was not painting, which suppressed `loading="lazy"`
so that **zero image requests were ever issued**. Forcing a real paint showed 923 of
1,000 posters loading and a dense field.

The actual defect was never the loading. It was that a dense field of a thousand
unreadable marks says nothing about genre — which is a spatial-claim failure, and
only visible once the thing was genuinely rendered. Hence the last line of the
skill's **Never** list.
