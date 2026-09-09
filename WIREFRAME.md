# Wireframe & Fidelity Plan — The Constellation (chosen direction)

## Spatial regions
- Full-viewport dark field (single continuous canvas, no page chrome around it beyond masthead).
- Masthead + deck: top-left, small, quiet — does not compete with the field.
- 21 genre cluster labels: positioned at each cluster's centroid, quiet italic, low-opacity until nearby content is focused.
- 1000 poster nodes: distributed by weighted cluster-centroid + jitter, exactly as verified in the options comparison.
- Local hover/focus reveal: appears directly beside the hovered poster (title · year · director), never a remote panel.
- Optional footer colophon: bottom, small, per Narrator's optional_text.

## What must survive from the chosen option
- Weighted-centroid placement (position = average of all a film's genre-cluster centers + jitter) — this is the core mechanism and is non-negotiable; it's what makes multi-genre membership structural rather than captioned.
- Genre cluster labels at centroid positions, quiet/recessed by default.
- Local (not remote) hover reveal.
- Styled fallback card (title/year/director, no error iconography) for the ~16% of posters that won't load.

## What changes going from the 126-film comparison mockup to the full 1000-record build (deliberate refinement, not a dropped mechanism)
**Connector lines become hover/focus-triggered, not persistently rendered.** In the comparison mockup (126 films), always-on connector lines were legible and demonstrated the mechanism clearly. At full scale, ~895 multi-genre films would draw an estimated 1,800–2,200 line segments simultaneously — this would read as a hairball / maximalist chart clutter, not a calm data-art field, and would violate the studio/gallery posture. Fix: lines are drawn only for the currently hovered/focused film, appearing instantly on hover and disappearing on mouse-out. The mechanism (a film is visibly, exactly connected to every genre it belongs to) is fully preserved — it is now discovered through interaction rather than shown all at once. This is disclosed here as a material departure from the comparison mockup's always-on lines, per the fidelity-plan requirement to flag such changes.

## Rendering / library decision
- **Layout computation**: D3-force (`d3-force` module via CDN), run synchronously to convergence (fixed number of ticks, no live physics loop) to produce a stable, deterministic final (x, y) per film. Custom forces: `forceManyBody` (mild repulsion, collision avoidance), a custom per-film attraction force pulling toward the centroid of its genre cluster(s), and `forceCollide` sized to poster footprint to prevent overlap pile-ups. Simulation runs once at load, positions are frozen — no continuous animation loop (keeps CPU usage low and the piece calm/ambient rather than jittery).
- **Rendering the marks**: real DOM `<img>` elements (not Canvas) — required for accessibility (alt text, focus order, lazy loading via `loading="lazy"`), and 1000 absolutely-positioned small images is well within DOM performance limits (verified: the 126-sample mockup rendered smoothly; 1000 is roughly 8x the nodes but each is a simple positioned image, not an animated element).
- **Connector lines**: single SVG overlay, lines added/removed on hover via JS rather than pre-rendered for all records.
- **Genre labels**: plain positioned `<div>` elements, not part of the SVG.

## Interactions
- **Required**: hover/focus reveal (mouse and keyboard — posters are focusable via `tabindex`, revealing the same local label on `:focus` as on `:hover`). Every one of the 1000 records must be reachable this way — no records exist only in hidden data.
- **Optional**: none beyond hover/focus. No filter, no search, no sort — matches the approved "no filter-tab/chip UI" constraint and the minimal-copy, composition-led brief.

## What counts as a material departure requiring a check-in
- Any change to the weighted-centroid placement logic itself (e.g. collapsing to `primary_genre` only, which the Analyst/Critic already ruled out).
- Removing the local hover reveal in favor of a side panel or bottom band.
- Adding filter/search/sort controls.
- Making connector lines always-on again at full scale (reintroduces the density problem this plan exists to avoid).

## Accessibility & responsive notes (to verify after build)
- Alt text = film title on every poster image.
- Keyboard reachability for all 1000 records via focus order.
- `prefers-reduced-motion`: since there's no continuous animation (simulation runs once, freezes), this is largely moot, but any hover transition (scale-up) should still respect reduced-motion by shortening/removing the transition.
- Responsive: the constellation field needs to reflow sensibly at narrow widths — plan is to keep the same radial cluster-center layout but recompute centers/radius from the actual viewport size at load (already how the comparison mockup worked), and verify at 1440 / 1180 / 390 CSS px before signoff.
