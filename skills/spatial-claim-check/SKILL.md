---
name: spatial-claim-check
description: Audit what position actually means in a chart whose coordinates are computed rather than measured — force-directed graphs, t-SNE, UMAP, PCA, MDS, packed bubbles, beeswarms, word clouds, Sankey node ordering, genre or topic "maps". Use when a layout is described with words like clusters, embedding, similarity map, constellation, "things that are alike sit together"; when a reviewer asks what distance means; when marks are too crowded to click or labels collide with the data; or before shipping any chart where a mark's x/y came out of an algorithm rather than off an axis.
---

# Spatial Claim Check

## Context

In a scatterplot, position is a measurement. In a force layout, a t-SNE, a bubble
pack or a word cloud, position is an **output** — and the viewer cannot tell the
difference. They read distance and clustering as meaning, because every chart they
have ever seen taught them to.

That gap is where computed-position charts go wrong. Not by being ugly, but by
making a spatial claim the data does not support: clusters that are artifacts of
the algorithm, a distance axis that encodes nothing, or a layout dominated by
whichever category is simply the most common.

This skill audits that claim. It is not a beauty pass and not a chart-type
recommender. It answers one question — *does position here mean what a viewer will
assume it means* — and if not, what specifically to change.

Use it **before** polishing a computed-position chart. Polishing a layout whose
position claim is void is wasted work.

## Input

Ask for whatever of these exists; proceed with what you get.

1. **The data** or a profile of it: row count, the fields driving position, and the
   frequency distribution of each categorical field. *The distribution is the part
   people forget to bring, and it is the part that predicts most failures.*
2. **The method** — the layout code, or the name and parameters of the algorithm.
3. **The claim**, in the maker's own words: what they believe position shows.
4. Optionally a screenshot or the live artifact.

If the maker cannot supply the frequency distribution, compute it first. Do not
audit a layout without knowing whether one category dominates it.

## The seven checks

Run all seven. Report a verdict per check.

### 1 — State the claim

Make the maker complete this sentence, out loud, before anything else:

> "Two marks near each other in this chart means ______."

If the sentence cannot be finished, position is decoration. Say so plainly and stop
— an arrangement that encodes nothing should be replaced by one that does (a sorted
grid, a small-multiple, a ranked list), not tuned. Do not proceed to checks 2–7 on a
chart that fails check 1; you would be optimising a claim that does not exist.

### 2 — Frequency domination

Compute each category's share of rows. **If any single category exceeds ~40%**, any
layout driven by raw co-occurrence or raw counts will collapse toward it: it is
mechanically the nearest neighbour of nearly everything, for no reason other than
being common.

Fix: switch to a size-corrected association measure. See `references/measures.md`
for which one, and the formula.

### 3 — What the method can actually support

Every method licenses some readings and forbids others. Naming the forbidden ones is
usually the highest-value thing this skill does, because makers routinely annotate
charts with claims their own algorithm cannot support — cluster sizes in t-SNE,
absolute axes in UMAP, distance between distant nodes in a force layout.

See `references/methods.md` for the per-method table of what is readable and what is
an artifact. If the chart is interactive, `references/interaction.md` covers
occlusion, zoom and the scroll conflict.

### 4 — Determinism

Re-run the layout. If it comes out different, it is not a map — the reader cannot
return to it, cannot compare it to yesterday's, and cannot trust that a cluster is
a finding rather than a seed. Every stochastic step needs a fixed seed.

### 5 — Aggregation collapse

Applies when a mark is placed at a centroid, mean or weighted combination of several
anchors. Two failure modes:

- **The common member dominates the mean.** If most items share one group, most
  items land on that group's anchor, and position degrades to "distance from the
  common thing" — near-zero information.
- **Cluster radius exceeds anchor spacing.** If items are spread around their
  centroid by more than roughly half the distance to the nearest *foreign* anchor,
  the outer ones are literally closer to a group they do not belong to. The chart
  then contradicts itself.

Both are measurable. See check 8.

### 6 — Legibility at N

Compute the area the layout affords per mark: `layout area ÷ mark count`. Then ask
what the mark must carry (identity? a value? a category?) and whether it can carry
it at that size.

A mark that cannot be resolved is not encoding anything, however correct its
position. If the answer is no, the fix is a simpler mark — a dot can carry a value
in radius *and* lightness at 3px, where an image, icon or label cannot carry
anything at all — with the rich content moved to hover, click or a detail panel.

**The labels are marks too, and this is the half people skip.** An anchor label
printed over a dense field is unreadable, and twenty of them will collide with each
other. Three fixes, in order of how often they are forgotten:

1. **Contrast against what is actually behind it**, which is the data, not the
   background. Paint a scrim under each label, or the ones over the dense part of
   the field disappear while the ones over empty space look fine — so the failure is
   invisible to whoever is checking on a sparse test set.
2. **Relax colliding labels apart** and give any that had to move a leader line back
   to its anchor. This is the standard cartographic fix: the name moves, the tie to
   the point does not.
3. **Re-run label layout after the webfont swaps.** Relaxation measures rendered
   text, so if it runs before the font arrives the whole arrangement is solved
   against fallback metrics and is quietly wrong on every cold load.
4. **Drop a label whose anchor has left the frame.** Clamping names inside the box
   is right at 1:1 and wrong under any view transform: zoomed in, most anchors are
   off-screen and the clamp stacks four names in the same corner. The relaxation
   then separates that pile, so the names are legible, in the wrong place, and
   pointing at nothing. Test this at your maximum zoom, not at rest.

Verify by counting overlapping label pairs at your narrowest and widest breakpoints.
The answer should be zero, and it is cheap to assert.

### 6b — Depth, parallax and motion are spatial claims

If you add a third dimension — a z-axis, parallax on pointer, a 3D tilt — the reader
will try to read it, because you have given them an axis. So it has to encode
something, or you have added a variable that means nothing and invited an
interpretation you cannot support.

The honest version is to bind depth to a variable you already have. Rating driving
size *and* brightness *and* focus *and* parallax amount is one variable in four
channels: redundant, mutually reinforcing, and readable at a glance. Depth driven by
nothing is decoration wearing the clothes of an encoding.

Two rules follow:

- **The reference frame does not move.** Parallax the data, never the axes, labels or
  anchors. A label that drifts under the pointer is a label the reader has to chase.
- **Motion that carries no data must be beneath the threshold of attention.** An
  ambient effect at a few percent amplitude, with independent phase per mark, reads
  as life; the same effect in unison reads as the whole chart pulsing, which the
  reader will assume means something. Measure it: sample a patch across frames and
  check the aggregate barely moves even though individual marks do.
- **A translucent mark leaks whatever is animating behind it**, in proportion to
  one minus its opacity — and opacity is very often part of the encoding, which
  means the marks that leak most are exactly the ones carrying the lowest values.
  Putting the twinkle on a halo and keeping the disc fixed is not enough if the
  halo is drawn underneath a disc that is only 58% opaque: measured here at 6.1%
  variation on the mark whose brightness *is* its value. Clear the centre out of
  whatever animates, at a radius that stays inside the mark at every zoom level.
  Verify by sampling the mark's own pixels across a full cycle, not the glow
  around it.

### 6c — If you offer zoom, zoom the layout and not the marks

Zoom exists here for one reason: to pull apart a cluster too dense to pick from.
That only works if separation outgrows mark size, so the mark scale has to be
sublinear in the zoom factor. It is also worth putting a knee in it: grow marks
normally until the smallest is comfortably clickable — about 10px — then almost
stop, and spend the rest of the range entirely on separation. Without the knee,
every further step re-inflates the discs it just separated, and the ceiling you
can usefully offer is two or three times lower than it needs to be.

Glow, bloom, shadows and spikes get their own, much earlier ceiling. They are
rendering artefacts rather than measurements, and a flare that widens as the
reader leans in turns a legible field into soup at exactly the moment they were
trying to read it.

One interaction rule that is not about the data at all, and is the easiest thing
in this whole document to get wrong: **a control must not move when pressing it
changes what else is on the toolbar.** A Reset that appears beside + the moment
you first zoom, in a group anchored to one edge, pushes + out from under the
hand between the first press and the second. Put the control that comes and goes
at the far end of the group, or reserve its space.

Verify by measuring the position of each control at rest and at full zoom. The
numbers should be identical.

### 7 — Stated caveat, and exposed coordinates

Two shipping requirements:

- The artifact itself carries **one sentence** saying what position does and does not
  mean. Not in the README, not in the methods appendix — in the frame, where someone
  who only ever sees a screenshot of it will still read it.
- The artifact can **hand over its coordinates** for checking. A computed-position
  chart that cannot be audited is asking for trust it has not earned. In a web
  artifact this is a few lines exposing the positions and anchors.

## 8 — Measure it, don't argue about it

**This is the most important habit in the skill.** Layout quality arguments are
unfalsifiable until someone writes down a number. Every claim from check 1 can be
turned into a scale-free test:

| Claim shape | Test | Random baseline |
|---|---|---|
| "Items sit among the groups they belong to" | Share of items whose **nearest anchor is one of their own groups** | mean groups per item ÷ number of anchors |
| "Similar items are near each other" | **k-NN label agreement**: share of an item's k nearest neighbours sharing its label | overall label prevalence |
| "The embedding preserves the original space" | **Trustworthiness / continuity** at k, or Spearman correlation of pairwise distances before vs after | — |
| "Clusters are real" | Re-run with a different seed and compare cluster assignment (ARI); bootstrap the rows | — |

Always report the random baseline alongside the score. A layout scoring 40% sounds
poor until you know that shuffling scores 12%.

**Report the frame you measured in, and round accordingly.** A metric can be
scale-free and still viewport-dependent, because the *layout* is usually recomputed
per viewport: change the aspect ratio of the frame and the anchors move, so the score
moves with them. One measured figure drifted 69.3% → 69.2% → 68.5% across three
builds purely from resizing the container. None of those numbers was wrong; quoting
any of them to one decimal in the artifact was. Round, say what frame you measured
in, and note that it shifts with the shape of the container.

Better still, remove the drift. If the layout is recomputed per viewport, every
reader gets a different map and the metric has no single value to report. Solving
once and fitting the result held the same chart to within half a point across
three screen shapes, at a cost of about five points of absolute accuracy — a
trade worth making for anything a reader is meant to return to.

**And ablate.** If several things changed at once, changing them together and
reporting one improvement is not evidence. Vary one at a time and report the table.
Expect this to be uncomfortable: it routinely shows that the change the maker was
proudest of did nothing, and an unglamorous one did the work.

## Choices to put to the user

Do not silently pick these. Present the trade-off, recommend one, and let them
choose.

1. **What should distance mean here?** — shared membership / similarity in a measured
   space / adjacency in a graph / nothing (in which case, check 1 already failed).
2. **Which association measure?** — offer two or three from `references/measures.md`
   with a one-line consequence each and a recommendation. Say explicitly that this
   changes *what the chart is about*, not merely how it looks.
3. **Fidelity or fill?** — when the layout's natural shape does not match the frame's
   aspect, stretching fills the space but distorts the distances that carry the
   meaning. Offer: preserve distances and accept empty margins, or stretch within a
   stated cap.
4. **Where does the caveat go?** — in-frame note / caption / tooltip / colophon.

## Output format

Produce, in this order:

1. **Verdict table** — one row per check: `PASS` / `WEAK` / `FAIL`, plus a one-line
   reason containing the actual number.
2. **The claim, rewritten so it is true.** One sentence. This is the deliverable the
   maker will paste into the artifact.
3. **The measurement** — the test from check 8, its result, and its random baseline.
   If several changes are proposed, the ablation table.
4. **Concrete fixes** — the formula or the parameter, never "consider normalising."
5. **A drafted caveat line**, ready to paste.

Never output a score on its own. A number without the sentence and the formula is
not actionable.

## Always

- **Always** make the maker state the distance claim before proposing any fix.
- **Always** compute the frequency distribution before judging the layout.
- **Always** give the formula, not the concept.
- **Always** report a random baseline next to any score.
- **Always** say out loud when a proposed fix changes *what is being measured*, not
  just how it looks. Switching from raw counts to Jaccard is not a cosmetic change —
  it changes which pairs the chart says are related, and the maker must agree to that.

## Never

- **Never** let a computed-position chart ship without an in-artifact caveat.
- **Never** accept "it looks organic", "it feels right", or "the clusters look clean"
  as a claim. Those describe the picture, not the data.
- **Never** propose perplexity, iteration-count, learning-rate or force-strength
  tweaks as the fix for a *claim* problem. Parameters change the picture; they do not
  make an unsupported claim supported.
- **Never** report an improvement from a bundle of simultaneous changes without
  ablating them.
- **Never** confuse two different measurements. Anchor-to-anchor adjacency and
  item-placement accuracy are different questions, and a change can move one
  substantially while leaving the other flat.
- **Never** conclude from a rendering you have not actually seen. Blank or partial
  renders are frequently an artifact of the environment — a hidden window, a
  throttled tab, deferred image loading — not a defect in the chart. Force a real
  paint and re-check before reporting any visual finding. This bites hardest on
  anything driven by `requestAnimationFrame`: a window that is not painting does not
  run rAF, so transitions, fades and ambient motion all sit frozen at their start
  values and look broken when they are fine. Verify animation by forcing paints
  between samples, never by waiting and hoping.
