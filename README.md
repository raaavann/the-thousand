# The Thousand

A constellation of the 1,000 highest-rated films on IMDb, and the data-visualisation
skill that was written to audit it.

Built for **DE705 Interactive Data Visualization**.

---

## Live

**[→ Open the constellation](https://raaavann.github.io/the-thousand/)**

| | |
|---|---|
| [The Thousand](https://raaavann.github.io/the-thousand/) | the constellation, as shipped |
| [The original](https://raaavann.github.io/the-thousand/before/) | the first build, kept runnable for comparison |
| [Spatial Claim Check](https://raaavann.github.io/the-thousand/skills/spatial-claim-check/) | the skill write-up, with charts |

---

## What it is

1,000 films placed by genre. Every star is a film, and its rating sets how near it
sits: the highest rated are largest, brightest and in focus, while the rest recede
into soft bokeh. Scroll to zoom, drag to pan, hover a genre to light its films.

Three ideas do the work:

1. **Genre anchors come from the real co-occurrence graph**, measured as Jaccard
   rather than raw counts. Drama is 72.4% of the collection, so by raw counts it is
   the nearest neighbour of nearly every genre and the whole field collapses onto it.
2. **Each film sits between its own genres**, pulled hardest by its rarest, so what
   distinguishes a film decides where it sits.
3. **A cluster may grow to at most 0.46×** the distance to the nearest anchor it does
   *not* belong to. Past that midpoint its outer stars would sit closer to a foreign
   genre than their own, and the chart would contradict its own caption.

Position is affinity, not measurement. The page says so in the frame.

---

## The claim, measured

The piece claims that films sit among the genres they belong to. That is testable,
so it was tested: for every film, find the nearest of the 21 genre anchors and ask
whether it is one of that film's own genres. Random placement scores about 12%.

| | Overall | 1 genre | 2 genres | 3 genres |
|---|---|---|---|---|
| Original build | 55.4% | 98.1% | 59.4% | **46.9%** |
| Shipped | **~69%** | 100% | 61.8% | **67.2%** |

Read the columns, not the total. The original aced the trivial case and did *worst*
on three-genre films, which are 64.6% of the collection and the entire premise.

The score is scale-free, but the layout is recomputed per viewport, so the figure
moves a little with the shape of the frame. Measured at three container sizes it read
69.3%, 69.2% and 68.5%.

**Check it yourself.** The page hands over its own coordinates:

```js
__spatialAudit()   // { size, anchors: [...], stars: [...] }
```

---

## The skill

`skills/spatial-claim-check/` is a data-visualisation skill that audits what position
actually means in charts whose coordinates are computed rather than measured: force
layouts, t-SNE, UMAP, packed bubbles, word clouds.

It found five failures in the original build of this very page, and then two more in
the rebuild that replaced it, including a regression its own author had missed.

- `SKILL.md` — the skill itself
- `references/measures.md` — Jaccard, nPMI, lift, cosine, and when each is right
- `references/methods.md` — what each layout method licenses you to claim
- `references/interaction.md` — occlusion, zoom, and the scroll conflict
- `AUDIT.md` — the full run against `before/`
- `evidence/ablate.js` — reproduces the ablation table

---

## Building

No dependencies, no build step for readers. `index.html` is self-contained: data,
styles and behaviour are all inlined, so it opens straight from disk.

```bash
node prepare-data.js    # data/source/films.curated.json -> data/films.enriched.json
node build-index.js     # template + css + js + data -> index.html
```

To rebuild the original for comparison:

```bash
cd before && node build-index.js
```

To reproduce the ablation:

```bash
node skills/spatial-claim-check/evidence/ablate.js
```

Source files are `index.template.html`, `styles.css`, `script.js` and `sky.js`.
Edit those, not `index.html`.

---

## The data

1,000 films from the IMDb Top 1000, 1920–2020. Every title rates between 7.6 and 9.3,
so this is a narrow, already-selected band of acclaim, not the whole of cinema.

It skews heavily to English-language and post-1990 releases, and to films with enough
votes to be ranked at all. Metascore is missing for 157 titles and box office for 169;
those slots are left blank rather than guessed.

Posters are served by IMDb and are not redistributed here. The IMDb mark appears on
the page as source attribution.

