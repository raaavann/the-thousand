# What changed

Two things are worth separating: how this skill relates to the Data Vizard set it
was written alongside, and what changed inside it between the first version and the
one shipped here.

---

## 1. Relative to the Data Vizard skills

This is a **new skill, not a modification** of any of the ones the workshop provides.
Those cover the pipeline end to end:

| Skill | Covers |
|---|---|
| `data-curator` | finding, cleaning, profiling, joining data |
| `data-analyst` | patterns, anomalies, story candidates |
| `narrator` | language load, framing, titles, caveats |
| `critic` | editorial rigour, visual craft, anti-default critique |
| `designer` | chart choice, encoding, layout, the HTML artifact |
| `de-slop` | rescuing bad or default-looking charts |

The gap: **none of them asks whether a chart's position means anything.**

That is not an oversight, it is a specialist question. It only arises in a specific
family of charts, the ones where `x` and `y` are the output of a solver rather than a
reading off an axis: force layouts, t-SNE, UMAP, MDS, packed bubbles, beeswarms, word
clouds, Sankey node order. In those, `designer` will happily produce something
beautiful and `critic` will happily judge it as a picture, because the failure is
invisible to both. The clusters look crisp. The shape looks organic. It is simply not
about what it appears to be about.

So `spatial-claim-check` sits **before** `designer` and `critic` in the order of
operations, and refuses to discuss aesthetics at all until one sentence has been
completed:

> "Two marks near each other in this chart means ______."

Where it overlaps `critic`, it differs in kind: `critic` is a judgement, this is a
measurement. Every claim it examines gets turned into a falsifiable number with a
random baseline printed beside it.

---

## 2. Inside the skill: first version → shipped

The first version was written after auditing the original build of *The Thousand*.
Everything below was added after the audit was run **a second time, on the rebuild
that the first audit produced** — which is where most of it came from. Three of the
four additions exist because the rebuild failed a check the original had passed.

### Check 6 gained its missing half: labels are marks too

The original check only considered data marks. That let it pass the first build and
then ship a rebuild whose genre labels were unreadable over the dense core and
collided with each other at narrow widths.

The addition covers three fixes, and one observation that makes the failure worth
naming: **it is invisible on a sparse test set.** Labels over empty space look fine.
Only the crowded region exposes it, which is exactly the region a quick check skips.

1. Contrast against what is actually behind the label, which is the data, not the
   background. Paint a scrim.
2. Relax colliding labels apart; give any that moved a leader line back to its anchor.
3. Re-run label layout after the webfont swaps, or the whole arrangement is solved
   against fallback metrics and is quietly wrong on every cold load.

Plus a cheap assertion: count overlapping label pairs at the narrowest and widest
breakpoints. It should be zero.

### New check 6b: depth, parallax and motion are spatial claims

Did not exist before. It exists because the rebuild added a z-axis and parallax, and
a visible axis that encodes nothing is a spatial claim with no data behind it.

Two rules follow, both learned by getting them wrong:

- **The reference frame does not move.** Parallax the data, never the axes, labels or
  anchors. A label that drifts under the pointer is a label you have to chase.
- **Motion carrying no data stays below the threshold of attention.** Independent
  phase per mark reads as life; the same effect in unison reads as the whole chart
  pulsing, which a reader will assume means something.

### Check 8 gained a caveat about precision

A metric can be scale-free and still viewport-dependent, because the *layout* is
usually recomputed per viewport: change the frame's aspect ratio and the anchors move,
so the score moves with them.

The same configuration measured **69.3%, 69.2% and 68.5%** across three container
sizes. All three were correct for the frame they were taken in. Quoting any of them to
one decimal in the artifact was not. Report the frame, and round.

### The Never list gained the `requestAnimationFrame` case

The existing rule was "never conclude from a rendering you have not actually seen."
The addition names the sharpest version of it: **a window that is not painting does
not run rAF**, so transitions, fades and ambient motion all sit frozen at their start
values and look broken when they are fine. During this project that produced three
separate false findings, including one reported before it was caught.

Verify animation by forcing paints between samples, never by waiting.

### New reference file: `references/interaction.md`

For charts the reader operates rather than only reads. Nothing in the first version
covered interaction at all, and interaction turned out to produce its own class of
spatial-claim failure.

- **Occlusion is a legibility failure**, not a nuisance. A mark you cannot click is a
  mark that is not in the chart, and anchor labels crowd the densest region by
  construction.
- **The zoom scaling rule.** Zoom separates crowded marks only if marks grow *more
  slowly* than the field (`z^0.7` against `z^1.0`). Scale them linearly and you have
  magnified the problem along with the picture.
- **The scroll conflict**, and the four-case intent test that resolves it.
- `touch-action` gating, hit radii for coarse pointers, and preview-beats-commit.

### Also updated

- **Frontmatter description** picked up the new triggers, so the skill fires on
  "marks too crowded to click" and "labels collide with the data".
- **`AUDIT.md`** records the second pass, including that two checks which passed on
  the original failed on the rebuild.
- **`COMMENT.md`** swapped screenshots for live links, and picked up the precision
  caveat.

### Unchanged

The seven checks' core logic, `references/measures.md`, `references/methods.md`, and
both evidence scripts. The ablation table still reproduces exactly via
`evidence/ablate.js`.

---

## The pattern worth noticing

Every addition in section 2 came from running the skill on work that had just been
called finished, including work the skill itself had produced. It found five failures
in the original build, then two more in the rebuild that fixed those five.

That is the argument for check 8 and for ablating: without a number and a baseline,
"it looks better now" is unfalsifiable, and a rebuild can quietly regress the case it
was not looking at. It did, once, and only the metric caught it — single-genre films
fell from **98.1% to 29.5%** in a version that scored better overall.
