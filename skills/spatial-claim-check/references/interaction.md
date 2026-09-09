# Interactive computed-position charts

For check 3 and check 6, when the chart is something the reader operates rather than
only reads. Everything here was learned by getting it wrong first.

## Occlusion is a legibility failure, not a nuisance

A mark you cannot click is a mark that is not in the chart. The usual causes, in
order of frequency:

- an anchor label sitting on top of the marks nearest that anchor, which are exactly
  the marks most likely to be the ones you want;
- marks overlapping each other in the dense region, which is where the interesting
  cluster is;
- a hover card or panel covering the thing it describes.

The first is the cruel one, because the labels crowd the densest part of the field
by construction: the anchor is where its members gather.

## Zoom is the right fix, and the scaling rule matters

Zoom separates crowded marks, but only if you get one detail right.

**Marks must grow more slowly than the field does.** Scale positions by `z` and mark
radius by `z^0.7` or so. Then separation outpaces size, and a mark that was
unclickable at 1× has clear space around it at 3×. Scale the radius linearly and
you have magnified the problem along with the picture: the marks stay exactly as
crowded, just bigger.

Related, once you have zoom:

- **Zoom about the pointer**, keeping whatever is under it pinned there. Zooming
  about the centre makes the field slide out from under the reader.
- **Hit-test in screen space.** Find candidates from the world-space grid, then
  compare against drawn positions, so zoom, pan and any parallax are all accounted
  for. A target that is not where it is drawn is worse than no interaction.
- **A drag is not a click.** Threshold at ~4px or panning will keep opening records.
- **Reset must exist and must be visible once it is needed.** People zoom into a
  corner and cannot find their way back.
- **Sprite-based marks blur when scaled.** If you blit a soft sprite, a magnified
  mark turns into a smudge exactly when the reader has zoomed in to look at it
  properly. Draw a crisp centre above a threshold.

## The scroll conflict

A zoomable field inside a scrolling page is fighting the page for the wheel, and the
naive version — wheel over the canvas always zooms — is genuinely painful. Two
mitigations, and the second is the one that works:

1. **Give the field margins.** Inset it so there is page either side to put the
   pointer on. This is the escape hatch, and it is not sufficient on its own: it does
   nothing about scrolling *through* the field on the way down the page.

2. **Read intent.** A wheel event belongs to the page unless the reader has clearly
   settled on the field. Hand it back when:
   - the page has scrolled in the last ~500ms (they are mid-gesture);
   - the pointer crossed into the field less than ~300ms ago (they are passing over);
   - the zoom is already at either end of its range (so they can always leave).

   Otherwise, zoom. Scrolling past can then never zoom, and deliberately stopping and
   scrolling always does.

Test all four cases explicitly. It is easy to write and easy to get subtly wrong, and
the failure mode is a page that feels hostile without the reader being able to say
why.

## Touch

`touch-action` has to change with state. At rest the page should keep vertical
panning, so a finger drag scrolls past the field as expected. Once zoomed, the field
is a map being explored and takes the gesture. Set `pan-y` at 1× and `none` above it,
and switch it in the same place you change zoom.

Hit radii need to grow for a finger: roughly `max(r + 11, 17)` against
`max(r + 6, 10)` for a mouse. Check `(pointer: coarse)`, not screen width.

## Preview beats commit

Hovering a category to light its members costs nothing to undo, so readers will
explore freely. Clicking to filter is a state change, and they will hesitate. Offer
both, and make the hover version the discoverable one.

Two things this needs:

- **Mirror it.** If the same category exists in a list and in the field, hovering
  either should light both, or they read as two unrelated controls.
- **Say it exists.** A hover-only affordance is invisible. One line in the frame,
  where the eye already is. This is the single most useful feature in most of these
  charts and the one nobody finds.

## Verifying any of this

Animation and lazy loading are driven by `requestAnimationFrame` and
IntersectionObserver, and **neither runs in a window that is not painting**. A
headless or backgrounded browser will show you frozen transitions, unloaded images
and motionless ambient effects that are all perfectly fine. Force a real paint
between samples and re-check before you report anything as broken.
