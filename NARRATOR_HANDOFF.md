# Narrator Handoff — imdb-top-1000-films

## posture
`data-art-led`

## language_load
`minimal copy` — a masthead title and one short deck line, plus functional labels required for the piece to be legible and navigable (poster identity, genre sections). No body copy, no methodology explanation, no ranking language.

Rationale: fully silent (no title at all) risks the piece feeling unmoored for a standalone public artifact — a title anchors it. But the genre-constellation composition itself is the thing that should communicate the organizing logic; language should only orient, never argue or explain.

## text_budget
≤12 words of narrative copy (masthead + deck combined). Functional labels (film title/year/director on hover-select, genre section names) are metadata, not narrative copy, and sit outside this budget — but must stay terse (no descriptive sentences attached to any record).

## visible_text_inventory
1. Masthead title (persistent, understated — not a hero banner)
2. Deck line (one line, directly under/beside masthead)
3. Genre section labels (21 genre names, used as structural dividers within the composition)
4. Per-poster identity label, shown on hover/select only: title, year, director
5. Optional: small footer/colophon line (source + rating range) — see `optional_text`

Any visible text surface not on this list (captions under individual posters at rest, a legend, a methodology note, filter-control labels, rank numbers) is unauthorized by default.

## must_keep_text
- **Masthead:** `1,000 FILMS, 21 GENRES`
- **Deck:** `Arranged by genre, not rank.`
- **Genre section labels:** the 21 source genre names as they appear in the data (Drama, Comedy, Crime, Adventure, Action, Thriller, Romance, Biography, Mystery, Animation, Sci-Fi, Fantasy, History, Family, War, Music, Horror, Western, Film-Noir, Sport, Musical) — no renaming/rebranding of genre names.
- **Per-poster identity label** (hover/select state only): film title, year, director. Necessary for a record-by-record explorer to be usable — a poster wall where you can never learn what you're looking at fails the "all records reachable" bar. Keep to three data points; no synopsis, no rating number needed here (rating already informed inclusion in the set, doesn't need restating on every card).

## optional_text
- **Footer/colophon** (small, quiet, bottom of page — not competing with the masthead): `IMDb user ratings, 1920–2020.` — a plain source/scope disclosure. This does double duty as an implicit caveat (rating-based selection, not a canon) without lecturing the viewer about survivorship bias. Designer may cut this if it visually clutters the composition; it is not load-bearing.

## focal_point
The genre-clustered poster field itself. No text element should out-weigh or compete with the composition — the masthead should read like a magazine spine, not a hero section.

## default_to_avoid
- Generic dashboard/listicle framing: no "Top 1000 Movies of All Time," no rank numbers overlaid on posters, no star ratings shown per-card.
- Decorative metaphor or poetic filler ("a journey through cinema," "cinematic universe," "unlock the magic of film") — none of this earns its place; cut on sight.
- A methodology paragraph explaining survivorship bias, genre simplification, or data caveats as on-page prose — these are real caveats but belong in curation/critique records, not visible copy. The footer's plain source line is the only permitted trace of this.
- **Structural requirement, not text, but must reach Designer**: most films in this set carry 2+ genres. The composition must let a multi-genre film be findable/visible under more than one genre grouping (or otherwise honestly represent multi-genre membership) — do not silently sort every film into exactly one bucket via `primary_genre` alone. This is a data-fidelity requirement carried over from Analyst/Critic, not a caption to be written.
- Filter-tab/chip instructional language ("Filter by genre," "Select a category") — genre labels are section dividers in an editorial composition, not form controls, and should not be captioned as if they were.

## forbidden_phrases
"Top 1000", "Best Movies of All Time", "Must-Watch", "Cinematic Journey", "A Closer Look", "What This Shows", "Explore the World of Film", "Timeless Classics", "From [X] to [Y]" construction, "Not just... but...", any sentence that could be reused for a different dataset by swapping the noun.

## final_visible_copy
- Masthead: **1,000 FILMS, 21 GENRES**
- Deck: **Arranged by genre, not rank.**
- Footer (optional): **IMDb user ratings, 1920–2020.**
- Genre labels: source genre names, verbatim, no rewriting.
- Poster hover/select label: `{title} · {year} · {director}`

## caveats that must remain visible (structurally, not as prose)
- Multi-genre reality must be structurally representable (see default_to_avoid) — this is the one piece of Analyst evidence strong enough to matter, but it earns its place through the composition/interaction model, not through a caption. No visible sentence is needed to state it; the system should just not lie by omission.
- ~16% of poster images are broken (Curator finding) — the fallback state (styled title/year/director card, matching the editorial aesthetic) must be visually intentional, not an apology or error message. No "image unavailable" text — the same three-field identity label used everywhere else is sufficient and consistent.
