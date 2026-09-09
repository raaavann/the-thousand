# Association measures

For check 2. When two items co-occur, "how related are they" has several answers, and
the choice decides what the chart is about. Notation: `n(a)` = rows containing a,
`n(ab)` = rows containing both, `N` = total rows.

## The problem being solved

Raw co-occurrence counts answer *"how often do these appear together?"* — which in
any skewed dataset is mostly a restatement of *"how common is the more common one?"*.
The most frequent category becomes the top-ranked partner of nearly everything, and
a layout driven by those counts pins it at the centre and drags everything toward it.

The measures below all divide out that frequency in some way. Pick by what you want
the chart to say.

## Jaccard

```
J(a,b) = n(ab) / (n(a) + n(b) − n(ab))
```

Share of the rows containing *either* that contain *both*. Symmetric, bounded 0–1,
easy to explain in one sentence to a reader — which matters, because check 7 requires
you to explain it.

- **Use when** membership is roughly symmetric and you want "these two genuinely go
  together" rather than "these two are both common".
- **Watch for** small denominators: a pair of rare categories that co-occur twice out
  of three appearances scores very high. Floor the support (`n(ab) ≥ 5`, say) before
  ranking.
- **Default choice** for tag/genre/label co-membership.

## Pointwise mutual information

```
PMI(a,b) = log( p(ab) / (p(a)·p(b)) )
npmi     = PMI / −log p(ab)          # normalised to −1..1
```

How much more often the pair appears than independence predicts. Sharper than
Jaccard at surfacing genuinely surprising pairings.

- **Use when** you want *surprise* rather than *overlap* — "these co-occur far more
  than chance" is the claim.
- **Watch for** an extreme bias toward rare pairs; use nPMI and floor the support.
- Undefined at `n(ab) = 0` — handle explicitly rather than letting a `-Infinity`
  propagate silently into a force calculation.

## Lift

```
lift(a,b) = p(ab) / (p(a)·p(b))
```

PMI without the log. Same behaviour, unbounded above, harder to map onto a force
strength because the scale is long-tailed. Usually prefer nPMI.

## Cosine on TF-IDF vectors

Build a vector per category over the rows (or over co-occurring categories), weight
by TF-IDF, take cosine similarity.

- **Use when** items have many co-occurring attributes and you want similarity of
  *profile* rather than of a single pairwise count — e.g. two directors who work with
  similar casts, two topics with similar vocabulary.
- Heavier to compute and much harder to explain to a reader in one line. Do not reach
  for it if Jaccard would do.

## Conditional probability (asymmetric)

```
P(b|a) = n(ab) / n(a)
```

Not symmetric, so it **cannot** drive a distance — distance is symmetric by
definition. Useful for annotation ("87% of Film-Noir titles are also Crime"), never
for placement. Listed here because it is a common mistake: a directed measure fed
into an undirected layout produces an average of two different claims.

## Choosing, in one table

| You want the chart to say | Measure |
|---|---|
| These two genuinely overlap | Jaccard |
| These two co-occur more than chance would predict | nPMI |
| These two have similar profiles across many attributes | Cosine on TF-IDF |
| A is usually accompanied by B | Conditional probability — **annotation only** |

## Before you switch

Switching measures changes which pairs the chart claims are related. That is a change
of subject, not of styling, and the maker has to agree to it. Show them the top ~10
pairs under both measures side by side and let them confirm the new ranking is the
one they meant. A slopegraph of the two rankings makes the reordering legible in one
look.

## After you switch

Verify with check 8 that the change actually moved the placement metric. It may not.
A measure can substantially reorder the *pair rankings* while leaving the *embedded
geometry* nearly unchanged, because the embedder's repulsion term can dominate. These
are two different questions and they have to be measured separately:

- Did the ranking change? Compare top-k lists.
- Did the geometry change? Compare anchor adjacency (each anchor's nearest neighbour).
- Did the placement improve? Run the check-8 metric.

Report whichever of those actually moved, and do not claim the others.
