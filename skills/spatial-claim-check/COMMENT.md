# Skill: `spatial-claim-check`

| | |
|---|---|
| 🌌 **[The constellation](https://raaavann.github.io/the-thousand/)** | the rebuilt piece, live |
| 🕳️ **[The original](https://raaavann.github.io/the-thousand/before/)** | the before, still runnable |
| 📐 **[Spatial Claim Check](https://raaavann.github.io/the-thousand/skills/spatial-claim-check/)** | the full audit, with charts |
| 💾 **[Repo](https://github.com/raaavann/the-thousand)** | everything, including the skill files |

Both builds are live, so none of the numbers below have to be taken on trust. Open
either one and run `__spatialAudit()` in the console to pull the coordinates and
re-run the check yourself.

## What it's for

Most dataviz skills people reach for are about colour or copy. This one is about a
failure I don't think gets audited much: **charts where position is computed rather
than measured.**

In a scatterplot, position is a measurement. In a force layout, a t-SNE, a UMAP, a
packed bubble chart or a word cloud, position is an *output* of a solver — and the
viewer cannot tell the difference, because every chart they've ever seen taught them
that near means alike. So these charts routinely make a spatial claim the data does
not support, and nothing about them looks broken. The clusters are crisp, the shape is
organic, the picture is often beautiful. It's just not about what it appears to be
about — usually because the layout has rediscovered which category is *most common*
rather than which things belong together.

The skill audits that claim before anyone discusses aesthetics.

<details>
<summary><b>SKILL.md</b> (click to expand)</summary>

```markdown
---
name: spatial-claim-check
description: Audit what position actually means in a chart whose coordinates are computed rather than measured — force-directed graphs, t-SNE, UMAP, PCA, MDS, packed bubbles, beeswarms, word clouds, Sankey node ordering, genre or topic "maps". Use when a layout is described with words like clusters, embedding, similarity map, constellation, "things that are alike sit together"; when a reviewer asks what distance means; or before shipping any chart where a mark's x/y came out of an algorithm rather than off an axis.
---

# Spatial Claim Check

## Input
1. The data or a profile: row count, the fields driving position, and the frequency
   distribution of each categorical field. (The distribution is the part people forget
   to bring, and the part that predicts most failures.)
2. The method — the layout code, or the algorithm name and parameters.
3. The claim, in the maker's own words.

If the maker cannot supply the frequency distribution, compute it first. Never audit a
layout without knowing whether one category dominates it.

## The seven checks

**1 — State the claim.** Make the maker complete, out loud, before anything else:
  > "Two marks near each other in this chart means ______."
  If the sentence cannot be finished, position is decoration. Say so and stop — an
  arrangement that encodes nothing should be replaced (sorted grid, small multiple,
  ranked list), not tuned. This check is a gate; do not proceed past a failure.

**2 — Frequency domination.** If any single category exceeds ~40% of rows, any layout
  driven by raw counts will collapse toward it: it is mechanically the nearest
  neighbour of nearly everything, for no reason but being common. Fix with a
  size-corrected measure (see references/measures.md).

**3 — What the method supports.** Name the readings the method forbids. t-SNE cluster
  sizes and between-cluster distances are meaningless. Force-layout absolute position
  is meaningless. Bubble-pack adjacency is a packing artifact. Sankey node order is a
  crossing heuristic, not a ranking. (see references/methods.md)

**4 — Determinism.** Re-run it. If the picture changes it is not a map — a cluster
  cannot be pointed at twice. Seed every stochastic step.

**5 — Aggregation collapse.** When marks sit at a centroid of anchors: does the common
  member dominate the mean? And does cluster radius exceed roughly half the distance to
  the nearest *foreign* anchor — past which the outer marks are literally closer to a
  group they don't belong to?

**6 — Legibility at N.** Layout area ÷ mark count. Can the mark carry its encoding at
  that size? A dot carries a value in radius *and* lightness at 3px; an image carries
  nothing. If not, simplify the mark and move the richness to hover/detail.

**7 — Caveat and coordinates.** Ship both: one sentence *in the frame* saying what
  position does and does not mean, and a way to hand the coordinates over, so the
  claim can be checked instead of trusted.

## 8 — Measure it, don't argue about it

The most important habit here. Layout-quality arguments are unfalsifiable until
someone writes down a number. Every claim shape has a scale-free test:

| Claim | Test | Random baseline |
|---|---|---|
| "Items sit among the groups they belong to" | share whose **nearest anchor is one of their own groups** | mean groups per item ÷ anchors |
| "Similar items are near each other" | **k-NN label agreement** | overall label prevalence |
| "The embedding preserves the original space" | trustworthiness/continuity at k | — |
| "Clusters are real" | re-run with a new seed, compare assignment (ARI) | — |

Always report the baseline beside the score — 40% sounds poor until you know that
shuffling scores 12%.

**And ablate.** Changing four things at once and reporting one improvement is not
evidence. Vary one at a time and publish the table, including the rows where the change
you were proudest of did nothing.

## Choices to put to the user
1. What should distance mean? (shared membership / similarity / adjacency / nothing)
2. Which association measure? Offer 2–3 with a one-line consequence each, and say
   explicitly that this changes *what the chart is about*, not how it looks.
3. Fidelity or fill? Stretching to the frame's aspect fills the space but distorts the
   distances that carry the meaning. Preserve and accept margins, or stretch to a cap.
4. Where does the caveat go?

## Output format
1. Verdict table — PASS / WEAK / FAIL per check, each with the actual number.
2. The claim, rewritten so it is true. One sentence, ready to paste.
3. The measurement, its baseline, and the ablation table if several things changed.
4. Concrete fixes — the formula or parameter, never "consider normalising".
5. A drafted caveat line.

Never output a score on its own.

## Always
- Make the maker state the claim before proposing any fix.
- Compute the frequency distribution before judging the layout.
- Give the formula, not the concept.
- Report a random baseline next to any score.
- Say out loud when a fix changes *what is being measured*, not just how it looks.

## Never
- Never let a computed-position chart ship without an in-artifact caveat.
- Never accept "it looks organic" or "the clusters look clean" as a claim.
- Never offer perplexity / iteration-count / force-strength tweaks as the fix for a
  *claim* problem. Parameters change the picture; they don't make an unsupported claim
  supported.
- Never report an improvement from a bundle of simultaneous changes without ablating.
- Never confuse two different measurements — anchor adjacency and item placement are
  different questions, and a change can move one while leaving the other flat.
- Never conclude from a rendering you have not actually seen. Blank or partial renders
  are frequently an environment artifact (hidden window, throttled tab, deferred image
  loading), not a defect. Force a real paint and re-check first.
```

All of it is in [the repo](https://github.com/raaavann/the-thousand/tree/main/skills/spatial-claim-check).
Three reference files sit alongside it: `references/measures.md` (Jaccard, nPMI,
lift, cosine-on-TF-IDF, with formulas and when each is right), `references/methods.md`
(the per-method table of what is readable and what is an artifact), and
`references/interaction.md` (occlusion, the zoom scaling rule, and the scroll
conflict — for charts the reader operates rather than only reads).

</details>

---

## Applying it to today's viz

I ran it on my genre constellation — 1,000 IMDb films placed by genre, Drama fixed at
the centre, the other 20 on a circle, each film at the **unweighted mean** of its
genres' positions. Its stated claim was a good one, which is what made it auditable:
*"films with more than one genre sit between the clusters they belong to."*

**[→ Open the original](https://raaavann.github.io/the-thousand/before/)** and give the
posters a few seconds to load. Seven genre labels (Fantasy, Musical, Sport, History,
Animation, Family, Film-Noir) sit in open space while the collection piles into one
undifferentiated mass. The anchors are decorative.

**Five of seven checks failed.** The two that hurt:

- **Check 2** — Drama is **72.4%** of the collection. It tops six of the eight
  strongest raw pairs, so raw co-occurrence was mostly rediscovering that Drama is
  common.
- **Check 5** — with an unweighted centroid at that skew, **4 of 21 genres (Biography,
  Mystery, Family, War) had zero films within 120px of their own label**, despite
  holding 109, 99, 56 and 51 films. The label said Mystery and not one of its
  ninety-nine films was anywhere near it.

### Then check 8 made it falsifiable

*For every film, is its nearest genre anchor one of its own genres?* Scale-free, no
units. Random ≈ 12%.

| | Overall | 1-genre | 2-genre | 3-genre |
|---|---|---|---|---|
| Original | 55.4% | 98.1% | 59.4% | **46.9%** |

The 55.4% is misleading and the columns say why. It aces the trivial case — a
single-genre film is placed on its anchor and barely moves — and does *worst* on
exactly the case the piece exists to show. Three-genre films are 64.6% of the
collection and the entire premise, and they land nearest a genre they don't belong to
more than half the time.

### The part I didn't expect

I fixed it (Jaccard instead of raw counts, rarity-weighted centroid, aspect-fill fit)
and then — because the skill says to — ran the audit **on my own rebuild**. It had
quietly broken the easy case:

| | Overall | 1-genre | 2-genre | 3-genre |
|---|---|---|---|---|
| Original | 55.4% | 98.1% | 59.4% | 46.9% |
| Rebuild v1 | 58.2% | **29.5%** ⚠️ | 54.6% | 64.2% |
| **Rebuild v2** | **69.3%** | **100%** | **61.8%** | **67.2%** |

The Drama-only cluster was spreading 145px while Comedy's anchor sat 108px away, so its
outer stars were nearer a genre they didn't belong to. The rule that fixes it: *a
cluster may grow to at most 0.46 × the distance from its centroid to the nearest anchor
it doesn't belong to.* Past halfway, a chart contradicts its own caption.

### The ablation was humbling

| Config | Overall | Δ |
|---|---|---|
| A — raw counts, plain centroid | 39.7% | — |
| B — + Jaccard affinity | 56.1% | **+16.4** |
| C — + aspect-fill fit | 58.2% | +2.1 |
| D — + rarity-weighted centroid | 58.2% | **±0.0** |
| E — + cluster radius cap *(shipped)* | 69.3% | **+11.1** |

The rarity-weighted centroid — the change I was most pleased with, and the one I'd
described as the fix — **contributed nothing** to the claim metric. It redistributes
and it populates the outer clusters visually, so I kept it, but saying it improved the
claim would have been false. I'd never have known without ablating.

## How it made the viz better

**[→ Open the rebuild](https://raaavann.github.io/the-thousand/)**. Three things to
try, in order:

1. **Hover a genre label.** Its films light and the rest recede. Try *Animation*: it
   lights an arc between Family, Fantasy and Adventure, which is the structure the
   original had no way of showing.
2. **Scroll to zoom, and drag.** The crowded core resolves into separate, clickable
   stars. Marks grow more slowly than the field does, so separation outpaces size.
3. **Hover any star.** Amber lines run to each genre it actually belongs to. That is
   the claim being shown rather than asserted.

| | Original | Shipped |
|---|---|---|
| Nearest anchor is own genre | 55.4% | **~69%** |
| — three-genre films *(the premise)* | 46.9% | **67.2%** |
| Genres with no films near their label | 4 of 21 | 0 of 21 |
| Deterministic across reloads | no (unseeded `Math.random()`) | yes |
| Rating encoded | not at all | radius + brightness |
| Caveat in the artifact | none | one sentence, in frame |
| Coordinates auditable | no | `window.__spatialAudit()` |

One caveat I'd add, because I got it wrong first: that score is scale-free but the
*layout* is recomputed per viewport, so the same build measured 69.3%, 69.2% and
68.5% across three container sizes. Report the frame you measured in, and don't
print a decimal a resize can move.

That last row is my favourite thing the skill produced. A computed-position chart that
can't hand over its coordinates is asking for trust it hasn't earned — so the piece now
exposes its own positions and anchors, and anyone can re-run the check on it.

## One correction, on the record

My first pass recorded that the original rendered a near-empty field with almost no
posters loading. That was wrong. The browser running the check wasn't painting, which
suppressed `loading="lazy"` so completely that **zero image requests were ever issued** —
it looked empty because nothing had been asked for. Forcing a real paint showed 923 of
1,000 posters loading into a dense mass.

The real defect was never the loading; it was that a thousand unreadable marks in one
blob say nothing about genre. That's a spatial-claim failure, and only visible once the
thing genuinely rendered. It's now the last line of the skill's **Never** list.
