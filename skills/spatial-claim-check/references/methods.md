# What each method licenses you to say

For check 3. The column that matters is the third one — the readings a viewer will
make automatically and that the method cannot support.

## Force-directed / spring layouts

| Readable | Artifact — do not claim |
|---|---|
| Adjacency: connected things end up near each other | Absolute position; there are no axes |
| Rough community structure | Distance between two *distant* nodes — unconstrained by the forces |
| Relative density of a neighbourhood | Cluster area or "size" |

Also: node placement is dominated by degree unless you correct for it. A hub sits in
the middle because it is a hub, not because it is central to the subject. Rotation and
reflection are arbitrary — never annotate "left/right" or "top/bottom" as if the
directions mean anything.

## t-SNE

| Readable | Artifact — do not claim |
|---|---|
| Local neighbourhoods: near points were near in the original space | **Distance between clusters** — meaningless |
| Existence of separated groups (with caveats below) | **Cluster size / spread** — meaningless, t-SNE equalises density |
| — | Axes, orientation, absolute position |

Perplexity changes how many clusters appear. Run several perplexities; if the clusters
survive, they are more likely real. Random seed changes the picture — fix it.
Well-separated blobs appear even in pure noise at low perplexity.

## UMAP

Same forbidden list as t-SNE, with one difference: UMAP preserves *some* global
structure, so between-cluster distance is weakly meaningful — weakly enough that you
should still not put a number on it or annotate "X is twice as far from Y as from Z".
`n_neighbors` trades local for global; report the value you used.

## PCA / MDS

The honest ones — these have real axes.

| Readable | Artifact — do not claim |
|---|---|
| Axes are genuine linear combinations; state loadings | That component 1 is "the important one" without reporting explained variance |
| Distances approximate the original metric (metric MDS) | Anything, if variance explained is low — report it, always |

If PC1 + PC2 explain 31% of variance, say so on the chart. A 2-D projection of a
30-D space is mostly not shown, and the reader deserves the number.

## Packed bubbles / circle packing

| Readable | Artifact — do not claim |
|---|---|
| Area (if you encoded it and used area, not radius) | Position — packing solvers place circles by fit, not by meaning |
| Containment, in a hierarchical pack | Adjacency; neighbours are neighbours because they fitted |

The most over-claimed chart on this list. Adjacency in a bubble pack is a
consequence of the packing order. If you need adjacency to mean something, this is
the wrong form.

## Beeswarm / jitter plots

One axis is real and one is not. State which. The jitter axis exists to prevent
overplotting and carries **no** information — never label it, never let a reader infer
a second variable from vertical spread.

## Word clouds

Position is meaningless; adjacency is meaningless; area is usually mis-encoded
(font size scales linearly while perceived area goes as the square). Rotation is
decorative and harms comparison. If the claim is "which words are frequent", a sorted
bar chart answers it correctly. Recommend the replacement rather than improving the
cloud.

## Sankey / alluvial node ordering

Flow widths are real. Vertical node order is chosen by a crossing-minimisation
heuristic and is **not** a ranking, though every reader will read it as one. Either
order the nodes deliberately by a stated variable and say so, or state that the order
is arbitrary.

## Treemap tiling

Area is real. Position and aspect ratio are outputs of the tiling algorithm.
Squarified treemaps trade positional meaning for readable aspect ratios; ordered
treemaps keep sequence at the cost of thin slivers. Say which you used if the reader
might infer an order.

## Geographic-looking layouts that are not geographic

Hex-grid "maps", cartograms and any layout borrowing a map's visual language inherit
a map's credibility. The reader assumes measured position. Label these unambiguously
and never let a non-geographic layout use a map's projection, coastline or compass
styling.
