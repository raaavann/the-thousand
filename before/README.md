# `before/` — the original build, reconstructed

This is the state of the visualisation **before** the 2026-09-09 rebuild, kept so the
"before / after" comparison can be re-run rather than only described.

* `data/films.json` is the genuine original file, copied untouched — it was never
  overwritten during the rebuild.
* `index.template.html`, `styles.css`, `script.js` and `build-index.js` were
  **reconstructed verbatim from the working session transcript**, because the rebuild
  overwrote them in place. They are byte-faithful to what was read off disk at the
  start of that session, but they are a reconstruction, not a recovery from backup.

Build it with:

    node build-index.js

Then open `index.html` at a desktop width. What you should see is the failure the
Spatial Claim Check skill exists to catch: a near-empty field, a handful of 22px
posters, and 21 genre labels floating in the dark.
