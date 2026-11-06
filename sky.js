/* ============================================================================
   THE THOUSAND — the constellation
   ----------------------------------------------------------------------------
   The layout maths below is unchanged and deliberately so: it was measured, and
   69.3% of films sit nearest a genre they actually belong to against 12% for
   random placement. What changed is how it is *rendered* and *operated*.

   THREE IDEAS IN THE LAYOUT

   1. Genre anchors come from the real co-occurrence graph, measured as Jaccard
      rather than raw counts — Drama is 72% of the collection, so by raw counts it
      is the closest neighbour of nearly every genre and the whole field collapses
      onto it.
   2. Each film sits between its own genres' anchors, pulled hardest by its
      rarest, so what distinguishes a film decides where it sits.
   3. A cluster may grow to at most 0.46× the distance to the nearest anchor it
      does NOT belong to. Past that midpoint its outer stars would be closer to a
      foreign genre than their own, and the chart would contradict its caption.

   TWO IDEAS IN THE RENDERING

   4. DEPTH IS RATING. A film's rating sets how near it sits: near stars are
      larger, brighter and focused; far ones dissolve into wide, dim bokeh. So the
      third dimension is carrying data, not decorating. Parallax on pointer scales
      with the same depth — near things move more, which is what makes the field
      read as space rather than as a picture of space.
   5. The reference frame stays still. Anchors and labels never move under the
      pointer, because a label that drifts is a label you have to chase; only the
      stars parallax against them.
   ========================================================================== */

(function (global) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  /* ── Rating classes ───────────────────────────────────────────────────────
     Graduated symbols, not a continuous scale. Cleveland and McGill put area
     and lightness near the bottom of the accuracy ranking, so a continuous ramp
     invites a reading nobody can actually perform: you cannot see 8.1 against
     8.3 in a dot's area. Five fixed sizes you *can* match against a legend.

     The breaks follow the real distribution, which is severely right-skewed —
     805 of 1,000 films sit between 7.6 and 8.1 — so the classes tighten as they
     climb. Equal-width classes would have put four fifths of the collection in
     one bucket and left the top three nearly empty.

     Colour carries depth by aerial perspective, not blur: as things recede they
     lose contrast and shift cool, which is how distance actually looks. Blur
     would hide detail and, worse, make small targets harder to hit. Every star
     stays sharp at every class.

     lo is inclusive, hi exclusive, except for the last class. */
  const CLASSES = [
    { lo: 7.6, hi: 7.9, label: '7.6–7.8', n: 431, r: 1.00, ink: [166, 146, 110], a: 0.58, glow: 0.16 },
    { lo: 7.9, hi: 8.2, label: '7.9–8.1', n: 374, r: 1.34, ink: [199, 180, 137], a: 0.70, glow: 0.23 },
    { lo: 8.2, hi: 8.5, label: '8.2–8.4', n: 142, r: 1.76, ink: [226, 210, 168], a: 0.82, glow: 0.31 },
    { lo: 8.5, hi: 8.8, label: '8.5–8.7', n:  40, r: 2.26, ink: [243, 233, 203], a: 0.93, glow: 0.40 },
    { lo: 8.8, hi: 9.4, label: '8.8–9.3', n:  13, r: 2.86, ink: [255, 250, 232], a: 1.00, glow: 0.50 }
  ];
  function classOf(rating) {
    for (let i = CLASSES.length - 1; i >= 0; i--) if (rating >= CLASSES[i].lo) return i;
    return 0;
  }
  const PARALLAX = 13;          // px at the extreme corner, for the nearest star

  function createSky(opts) {
    const films = opts.films;
    const genres = opts.genres;
    const ratingFrac = opts.ratingFrac;
    const posterUrl = opts.posterUrl;
    const onPick = opts.onPick;
    const onGenre = opts.onGenre;
    const onPreview = opts.onPreview;      // (genre|null) — mirrors into the rail
    const onCursor = opts.onCursor;
    const onHint = opts.onHint;              // (kind) => void, first-use coaching
    const onCrowd = opts.onCrowd;            // (films[]|null) => void, dense picks
    const onZoom = opts.onZoom;

    const stage = opts.stage;
    const canvas = opts.canvas;
    const labelLayer = opts.labels;
    const tip = opts.tip;
    const keyEl = opts.key;
    const ctx = canvas.getContext('2d', { alpha: true });

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(pointer: coarse)');

    /* --- affinity ---------------------------------------------------------- */

    const gi = {};
    genres.forEach((g, i) => { gi[g] = i; });
    const N = genres.length;

    const size = new Float64Array(N);
    const rawCo = [];
    for (let i = 0; i < N; i++) rawCo.push(new Float64Array(N));
    films.forEach(f => {
      const gs = f.genres;
      gs.forEach(g => { if (gi[g] !== undefined) size[gi[g]]++; });
      for (let a = 0; a < gs.length; a++) {
        for (let b = a + 1; b < gs.length; b++) {
          const i = gi[gs[a]], j = gi[gs[b]];
          if (i === undefined || j === undefined) continue;
          rawCo[i][j]++; rawCo[j][i]++;
        }
      }
    });

    const co = [];
    for (let i = 0; i < N; i++) co.push(new Float64Array(N));
    let maxCo = 0;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const union = size[i] + size[j] - rawCo[i][j];
        const v = union > 0 ? rawCo[i][j] / union : 0;
        co[i][j] = co[j][i] = v;
        if (v > maxCo) maxCo = v;
      }
    }

    const links = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const s = maxCo ? co[i][j] / maxCo : 0;
        if (s >= 0.33) links.push({ a: genres[i], b: genres[j], s: s });
      }
    }

    /* --- anchors ----------------------------------------------------------- */

    const anchorCache = {};

    function computeAnchors(aspect) {
      const key = aspect.toFixed(2);
      if (anchorCache[key]) return anchorCache[key];
      const A = aspect, S = Math.sqrt(A);
      const MINLEN = 0.17 * S, MAXLEN = 0.92 * S;
      const rnd = mulberry32(19341027);
      const P = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        P.push({
          x: A / 2 + Math.cos(a) * 0.40 * A + (rnd() - 0.5) * 0.03,
          y: 0.5 + Math.sin(a) * 0.40 + (rnd() - 0.5) * 0.03
        });
      }
      const ITER = 1200;
      for (let it = 0; it < ITER; it++) {
        const k = 0.055 * (1 - it / ITER) + 0.006;
        for (let i = 0; i < N; i++) {
          for (let j = i + 1; j < N; j++) {
            const s = maxCo ? co[i][j] / maxCo : 0;
            const ideal = MAXLEN - (MAXLEN - MINLEN) * Math.sqrt(s);
            let dx = P[j].x - P[i].x, dy = P[j].y - P[i].y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
            if (s === 0 && d >= ideal) continue;
            const w = s > 0 ? (0.3 + 0.7 * s) : 1;
            const f = (d - ideal) * k * w / d;
            dx *= f; dy *= f;
            P[i].x += dx; P[i].y += dy;
            P[j].x -= dx; P[j].y -= dy;
          }
        }
      }
      anchorCache[key] = P.map(p => ({ x: p.x, y: p.y }));
      return anchorCache[key];
    }

    /* --- state ------------------------------------------------------------- */

    let W = 0, H = 0, dpr = 1;
    let anchors = null, labelBoxes = [];
    let stars = [];
    let cells = null, cellSize = 30, cols = 0, rows = 0;
    let hover = null, cursor = null, currentIdx = null, preview = null;
    let raf = 0, parX = 0, parY = 0, tParX = 0, tParY = 0;

    // View transform. World coordinates are what the layout produced and never
    // change; zoom and pan are a lens over them, so nothing about the claim the
    // chart makes depends on where the reader happens to be looking.
    let zoom = 1, panX = 0, panY = 0;
    // Zoom is eased, so there is a target and a rendered value. Pan is derived
    // from the anchor rather than eased separately: easing the two independently
    // lets the point under the cursor drift during the animation, which is the
    // thing that makes a zoom feel loose.
    let tZoom = 1;
    let anchorSX = 0, anchorSY = 0;   // screen point to hold still
    let anchorWX = 0, anchorWY = 0;   // world point under it
    const MINZ = 1, MAXZ = 7;
    let dragFrom = null, dragged = false;
    let lastPageScroll = 0, pointerSettledAt = 0;
    const pointers = new Map();
    let pinchFrom = 0, pinchZoom = 1;
    let halo = null, core = null;
    let lastVisible = null;

    // Background dust: 220 specks that are not films and encode nothing. This is
    // where the sky gets to feel alive. Because they carry no value, they are
    // free to twinkle and to parallax, and because they sit behind the data at a
    // fraction of its brightness they read as depth without competing with it.
    // The stars themselves stay fixed and steady.
    let dust = [];
    function buildDust() {
      const rnd = mulberry32(90210);
      dust = [];
      for (let i = 0; i < 430; i++) {
        const depth = rnd();                       // 0 far … 1 near
        const warm = rnd();
        dust.push({
          x: rnd() * W, y: rnd() * H,
          r: 0.3 + depth * 0.95,
          a: 0.05 + depth * 0.17,
          par: 0.25 + depth * 1.45,                // near dust moves most
          ph: rnd() * Math.PI * 2,
          sp: 0.4 + rnd() * 1.0,
          // Mostly warm, a few cool, like any real field of faint stars.
          c: warm < 0.72 ? '#f2dcae' : (warm < 0.9 ? '#fff3d6' : '#bcc8e0')
        });
      }
    }

    function sprite(px, stops) {
      const c = document.createElement('canvas');
      c.width = c.height = px;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
      stops.forEach(s => grad.addColorStop(s[0], s[1]));
      g.fillStyle = grad; g.fillRect(0, 0, px, px);
      return c;
    }

    function buildSprites() {
      // Two sprites, blitted per star, rather than a gradient built per frame:
      // a thousand createRadialGradient calls is the difference between a 3ms
      // repaint and a 200ms one. The halo is wide and soft, the core tight —
      // mixing them by depth is what produces the focus falloff.
      halo = sprite(128, [
        [0,    'rgba(255,236,190,0.82)'],
        [0.13, 'rgba(255,222,160,0.38)'],
        [0.34, 'rgba(248,204,132,0.12)'],
        [1,    'rgba(242,196,124,0)']
      ]);
      core = sprite(64, [
        [0,    'rgba(255,252,246,1)'],
        [0.40, 'rgba(255,248,236,0.94)'],
        [0.70, 'rgba(255,240,218,0.26)'],
        [1,    'rgba(255,238,214,0)']
      ]);
    }

    /* --- layout ------------------------------------------------------------ */

    function layout() {
      const pad = Math.max(44, Math.min(W, H) * 0.085);
      const boxW = W - pad * 2, boxH = H - pad * 2;

      // ONE solve, at a fixed reference aspect, cached for the life of the page.
      const REF_ASPECT = 1.6;
      let pts = computeAnchors(REF_ASPECT).map(p => ({ x: p.x, y: p.y }));

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
      });

      // Turn the solution a quarter if that aligns its long axis with the
      // frame's. Every distance is preserved, so this is the same map either
      // way — a desktop and a phone get one arrangement, not two.
      const graphLandscape = (maxX - minX) >= (maxY - minY);
      const frameLandscape = boxW >= boxH;
      if (graphLandscape !== frameLandscape) {
        pts = pts.map(p => ({ x: maxY - p.y, y: p.x - minX }));
        const w = maxY - minY, h = maxX - minX;
        minX = 0; maxX = w; minY = 0; maxY = h;
      }

      // Uniform scale, both axes. Stretching one axis would distort exactly the
      // distances the layout exists to communicate; empty margin is the honest
      // trade and reads as sky.
      const spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1;
      const scale = Math.min(boxW / spanX, boxH / spanY);
      const offX = pad + (boxW - spanX * scale) / 2 - minX * scale;
      const offY = pad + (boxH - spanY * scale) / 2 - minY * scale;

      anchors = {};
      genres.forEach((g, i) => {
        anchors[g] = { x: pts[i].x * scale + offX, y: pts[i].y * scale + offY };
      });

      const unit = Math.min(W, H);
      const rBase = Math.max(1, unit * 0.0026);
      const spread = Math.max(9, unit * 0.024);

      const gw = {};
      genres.forEach(g => { gw[g] = Math.pow(Math.max(1, size[gi[g]]), -0.22); });

      const combos = new Map();
      films.forEach(f => {
        const key = f.genres.slice().sort().join('');
        let g = combos.get(key);
        if (!g) { g = []; combos.set(key, g); }
        g.push(f);
      });

      const rnd = mulberry32(7748291);
      stars = [];
      combos.forEach(group => {
        const gs = group[0].genres.filter(g => anchors[g]);
        let cx = 0, cy = 0, tw = 0;
        if (gs.length) {
          gs.forEach(g => { cx += anchors[g].x * gw[g]; cy += anchors[g].y * gw[g]; tw += gw[g]; });
          cx /= tw; cy /= tw;
        } else { cx = W / 2; cy = H / 2; }

        let foreign = Infinity;
        const own = {};
        gs.forEach(g => { own[g] = 1; });
        genres.forEach(g => {
          if (own[g] || !anchors[g]) return;
          const d = Math.hypot(anchors[g].x - cx, anchors[g].y - cy);
          if (d < foreign) foreign = d;
        });
        const room = isFinite(foreign) ? 0.46 * foreign : spread * Math.sqrt(group.length);
        const local = Math.max(spread * 0.3, Math.min(spread, room / Math.sqrt(group.length)));

        const jx = (rnd() - 0.5) * local * 0.8;
        const jy = (rnd() - 0.5) * local * 0.8;

        group.forEach((f, i) => {
          const ang = i * GOLDEN + rnd() * 0.0001;
          const rad = local * Math.sqrt(i + 0.45);
          const ci = classOf(f.rating);
          const C = CLASSES[ci];
          stars.push({
            f: f,
            x: cx + jx + Math.cos(ang) * rad,
            y: cy + jy + Math.sin(ang) * rad,
            cls: ci,
            z: ci / (CLASSES.length - 1),       // 0 far … 1 near, by class
            r: rBase * C.r,
            ink: C.ink,
            // A floor, not a ramp to zero. The faintest class is 431 films —
            // the largest single group in the collection — so it has to stay
            // clearly visible against the sky rather than fading to a smudge.
            base: C.a,
            glow: C.glow,
            ph: rnd() * Math.PI * 2,            // twinkle phase, glow only
            sp: 0.5 + rnd() * 0.8,
            a: 0, ta: 0, on: true
          });
        });
      });

      relax();
      buildGrid();
    }

    function relax() {
      const cs = 26;
      const nc = Math.ceil(W / cs) + 1, nr = Math.ceil(H / cs) + 1;
      for (let pass = 0; pass < 4; pass++) {
        const buckets = new Map();
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const k = Math.max(0, Math.min(nr - 1, (s.y / cs) | 0)) * nc +
                    Math.max(0, Math.min(nc - 1, (s.x / cs) | 0));
          let b = buckets.get(k); if (!b) { b = []; buckets.set(k, b); }
          b.push(i);
        }
        buckets.forEach((list, k) => {
          const cy0 = (k / nc) | 0, cx0 = k % nc;
          for (let dy = 0; dy <= 1; dy++) {
            for (let dx = (dy ? -1 : 0); dx <= 1; dx++) {
              const other = buckets.get((cy0 + dy) * nc + (cx0 + dx));
              if (!other) continue;
              for (let ii = 0; ii < list.length; ii++) {
                for (let jj = 0; jj < other.length; jj++) {
                  const A = stars[list[ii]], B = stars[other[jj]];
                  if (A === B) continue;
                  const min = A.r + B.r + 1.7;
                  let dxx = B.x - A.x, dyy = B.y - A.y;
                  const d2 = dxx * dxx + dyy * dyy;
                  if (d2 >= min * min || d2 === 0) continue;
                  const d = Math.sqrt(d2);
                  const push = (min - d) / d * 0.5;
                  dxx *= push; dyy *= push;
                  A.x -= dxx; A.y -= dyy; B.x += dxx; B.y += dyy;
                }
              }
            }
          }
        });
      }
      const m = 8;
      stars.forEach(s => {
        s.x = Math.max(m, Math.min(W - m, s.x));
        s.y = Math.max(m, Math.min(H - m, s.y));
      });
    }

    function buildGrid() {
      cellSize = 30;
      cols = Math.ceil(W / cellSize) + 1;
      rows = Math.ceil(H / cellSize) + 1;
      cells = new Map();
      stars.forEach((s, i) => {
        const k = Math.max(0, Math.min(rows - 1, (s.y / cellSize) | 0)) * cols +
                  Math.max(0, Math.min(cols - 1, (s.x / cellSize) | 0));
        let b = cells.get(k); if (!b) { b = []; cells.set(k, b); }
        b.push(i);
      });
    }

    // world -> screen. Parallax is applied after the zoom, in screen pixels, so
    // the depth effect stays the same size however far in the reader has gone.
    // Hit-testing calls exactly these, so a target is never where it isn't.
    const SX = wx => wx * zoom + panX;
    const SY = wy => wy * zoom + panY;
    // Position encodes genre, so shifting a star under the pointer shifts its
    // meaning — and moves the thing the reader is trying to click. Stars are
    // fixed; only the dust parallaxes, which is enough to read as depth.
    const px_ = s => SX(s.x);
    const py_ = s => SY(s.y);

    // Stars grow more slowly than the field does. Separation therefore outpaces
    // size as you zoom, which is the whole point: a star that was unclickable
    // beneath a label at 1x has clear space around it at 3x.
    const rz = () => Math.pow(zoom, 0.72);
    const rzGlow = () => Math.pow(zoom, 0.40);

    function clampPan() {
      const cw = W * zoom, ch = H * zoom;
      panX = cw <= W ? (W - cw) / 2 : Math.min(0, Math.max(W - cw, panX));
      panY = ch <= H ? (H - ch) / 2 : Math.min(0, Math.max(H - ch, panY));
    }

    // Zoom about a point, keeping whatever sits under it pinned there for the
    // whole of the animation, not just at its end. The world point under the
    // cursor is captured once against the *rendered* transform; every eased frame
    // then re-derives pan from it, so the thing you aimed at stays put.
    //
    // Successive wheel ticks multiply the target, not the rendered value, so a
    // fast scroll accumulates properly instead of fighting its own easing.
    function zoomAt(mx, my, factor) {
      const nz = Math.max(MINZ, Math.min(MAXZ, tZoom * factor));
      if (Math.abs(nz - tZoom) < 1e-4) return false;
      anchorSX = mx; anchorSY = my;
      anchorWX = (mx - panX) / zoom;
      anchorWY = (my - panY) / zoom;
      tZoom = nz;
      setTouchAction();
      if (onZoom) onZoom(tZoom);
      if (reduced.matches) { zoom = tZoom; applyAnchor(); }
      return true;
    }

    // Pan that keeps the anchor pinned under its screen point at the current zoom.
    function applyAnchor() {
      panX = anchorSX - anchorWX * zoom;
      panY = anchorSY - anchorWY * zoom;
      clampPan();
    }

    // On touch, the browser and this field both want the same gesture. At 1x the
    // page keeps vertical panning, so a finger drag scrolls the page as it should.
    // Once zoomed the field is a map being explored, and takes the gesture.
    function setTouchAction() {
      canvas.style.touchAction = tZoom > 1.001 ? 'none' : 'pan-y';
    }

    // Everything inside the pick radius, nearest first. One is a pick; several
    // is an ambiguity the reader should get to resolve.
    function starsAt(mx, my, limit) {
      if (!cells) return [];
      const found = [];
      const cz = Math.max(1, cellSize * zoom);
      const cx = Math.max(0, Math.min(cols - 1, ((mx - panX) / zoom / cellSize) | 0));
      const cy = Math.max(0, Math.min(rows - 1, ((my - panY) / zoom / cellSize) | 0));
      const span = cz < 26 ? 2 : 1;
      for (let dy = -span; dy <= span; dy++) {
        for (let dx = -span; dx <= span; dx++) {
          const b = cells.get((cy + dy) * cols + (cx + dx));
          if (!b) continue;
          for (let i = 0; i < b.length; i++) {
            const st = stars[b[i]];
            if (st.a < 0.2) continue;
            const d = Math.hypot(px_(st) - mx, py_(st) - my);
            const hit = coarse.matches ? Math.max(st.r * rz() + 12, 18)
                                       : Math.max(st.r * rz() + 8, 12);
            if (d < hit) found.push({ s: st, d: d });
          }
        }
      }
      found.sort((a, b) => a.d - b.d);
      return found.slice(0, limit || 6).map(o => o.s);
    }

    function starAt(mx, my) {
      if (!cells) return null;
      // Candidates come from the world-space grid; the comparison happens in
      // screen space, so zoom, pan and parallax are all accounted for.
      const wx = (mx - panX) / zoom, wy = (my - panY) / zoom;
      const reach = Math.max(1, Math.ceil((((coarse.matches ? 18 : 12) + PARALLAX) / zoom) / cellSize));
      const cx = Math.max(0, Math.min(cols - 1, (wx / cellSize) | 0));
      const cy = Math.max(0, Math.min(rows - 1, (wy / cellSize) | 0));
      const k = rz();
      let best = null, bestD = Infinity;
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const b = cells.get((cy + dy) * cols + (cx + dx));
          if (!b) continue;
          for (let i = 0; i < b.length; i++) {
            const s = stars[b[i]];
            if (s.a < 0.2) continue;                 // dimmed stars aren't targets
            const d = Math.hypot(px_(s) - mx, py_(s) - my);
            const r = s.r * k;
            const hit = coarse.matches ? Math.max(r + 11, 17) : Math.max(r + 6, 10);
            if (d < hit && d < bestD) { bestD = d; best = s; }
          }
        }
      }
      return best;
    }

    /* --- labels ------------------------------------------------------------ */

    // Cartographic label placement. Twenty-one names over a field whose middle
    // is crowded will collide, and "Romance" printed through "Biography" was
    // exactly the reported failure. The labels are relaxed apart like a small
    // force layout: each is pulled toward its own anchor and pushed off any label
    // it overlaps, along whichever axis it overlaps least. Anything displaced
    // gets a hairline leader back to its anchor, which is how an atlas has always
    // solved this. The name moves; the tie to the point does not.
    //
    // Because the anchors now move under zoom and pan, the relaxation runs every
    // frame from the previous positions rather than once from scratch. A warm
    // start converges in a handful of iterations, so this costs about 1,700
    // operations a frame and the labels never jump.
    let labelState = [];

    function buildLabels() {
      // Three size steps by genre size. Thresholds sit at natural gaps in the
      // distribution: 21 genres run from Drama at 724 down to Musical at 17.
      const tier = g => {
        const n = size[gi[g]];
        return n >= 180 ? 'lg' : (n >= 60 ? 'md' : 'sm');
      };
      labelLayer.innerHTML = genres.map(g =>
        '<button type="button" class="sky__label" data-tier="' + tier(g) +
        '" data-genre="' + g + '">' + g + '</button>').join('');
      labelState = Array.from(labelLayer.children).map(el => {
        const r = el.getBoundingClientRect();
        const g = el.dataset.genre;
        return {
          genre: g, el: el, w: r.width, h: r.height,
          x: SX(anchors[g].x), y: SY(anchors[g].y) - 13
        };
      });
      relaxLabels(90);
    }

    function relaxLabels(iters) {
      if (!labelState.length || !anchors) return;
      const PAD = 5, M = 6, BOTTOM = 48;   // reserved for the key and zoom controls
      for (let it = 0; it < iters; it++) {
        for (let i = 0; i < labelState.length; i++) {
          for (let j = i + 1; j < labelState.length; j++) {
            const A = labelState[i], B = labelState[j];
            const ox = (A.w + B.w) / 2 + PAD - Math.abs(A.x - B.x);
            const oy = (A.h + B.h) / 2 + PAD - Math.abs(A.y - B.y);
            if (ox <= 0 || oy <= 0) continue;
            // Separate along the axis of least overlap; going the long way round
            // would fling a label clear across the field.
            if (ox < oy) {
              const push = (A.x < B.x ? -1 : 1) * ox * 0.5;
              A.x += push; B.x -= push;
            } else {
              const push = (A.y < B.y ? -1 : 1) * oy * 0.5;
              A.y += push; B.y -= push;
            }
          }
        }
        for (let i = 0; i < labelState.length; i++) {
          const b = labelState[i], a = anchors[b.genre];
          const tx = SX(a.x), ty = SY(a.y) - 13;
          b.x += (tx - b.x) * 0.14;
          b.y += (ty - b.y) * 0.14;
          b.x = Math.max(M + b.w / 2, Math.min(W - M - b.w / 2, b.x));
          b.y = Math.max(M + b.h / 2, Math.min(H - BOTTOM - b.h / 2, b.y));
        }
      }

      labelBoxes = labelState.map(b => {
        const a = anchors[b.genre];
        const ax = SX(a.x), ay = SY(a.y);
        b.el.style.transform =
          'translate(' + (b.x - b.w / 2).toFixed(1) + 'px,' + (b.y - b.h / 2).toFixed(1) + 'px)';
        return {
          genre: b.genre, x: b.x, y: b.y, w: b.w, h: b.h,
          ax: ax, ay: ay,
          lead: Math.hypot(b.x - ax, b.y - ay) > 26
        };
      });
    }

    function paintLabelStates() {
      Array.from(labelLayer.children).forEach(b => {
        const g = b.dataset.genre;
        const on = preview === g || (activeGenre && activeGenre === g);
        b.dataset.on = String(!!on);
        b.dataset.muted = String(!!(preview && preview !== g));
      });
    }

    let activeGenre = null;

    /* --- drawing ------------------------------------------------------------ */

    // Brightness encodes rating, so modulating a star's brightness modulates its
    // value: a film would look better or worse from one moment to the next. The
    // twinkle moves to the dust layer below, which carries no data and is free
    // to shimmer as much as it likes.
    let clock = 0, ambient = false;

    function draw() {
      relaxLabels(8);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // 0 — dust. Not data: it is the only thing in the frame allowed to move.
      if (dust.length) {
        for (let i = 0; i < dust.length; i++) {
          const d = dust[i];
          const tw = ambient
            ? 1 + 0.62 * (Math.sin(clock * d.sp + d.ph) * 0.6 +
                          Math.sin(clock * d.sp * 1.7 + d.ph * 2.3) * 0.4)
            : 1;
          const x = d.x + parX * d.par, y = d.y + parY * d.par;
          ctx.globalAlpha = Math.max(0, Math.min(0.34, d.a * tw));
          ctx.fillStyle = d.c;
          ctx.beginPath();
          ctx.arc(x, y, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // 1 — the co-occurrence graph, as the faintest possible structure.
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 1;
      links.forEach(l => {
        const A = anchors[l.a], B = anchors[l.b];
        ctx.strokeStyle = 'rgba(203,167,108,' + (0.030 + 0.075 * l.s).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(SX(A.x), SY(A.y)); ctx.lineTo(SX(B.x), SY(B.y)); ctx.stroke();
      });

      // 2 — anchor marks: a small open ring, not a crosshair. Musical and Sport
      // sit in open sky because no film is purely either, so the ring says
      // "this is the anchor" rather than "stars missing".
      genres.forEach(g => {
        const A = anchors[g];
        ctx.strokeStyle = 'rgba(244,239,230,.22)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(SX(A.x), SY(A.y), 3.2, 0, Math.PI * 2); ctx.stroke();
      });

      // 3 — the field, far classes first so near ones sit on top.
      ctx.globalCompositeOperation = 'source-over';
      const k = rz();
      // Normal blending with a capped opacity, NOT additive. Where 724 Drama
      // films overlap, 'lighter' sums to flat white and the densest, most
      // interesting part of the collection becomes the one part you cannot read.
      // Overdraw hides outliers and erases the shape of the data; capped
      // source-over keeps a dense knot dark-edged and countable.
      //
      // Each star is drawn as a disc, not a sprite, so it stays crisp at every
      // zoom level. The faint halo behind the two brightest classes is the only
      // soft element left, and it is capped too.
      for (let i = 0; i < order.length; i++) {
        const s = order[i];
        if (s.a < 0.012) continue;
        const x = px_(s), y = py_(s);
        if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
        const rr = Math.max(0.8, s.r * k);
        const ink = s.ink;

        // The glow shimmers. Independent phase per star, so the field never
        // pulses in unison — and it is only ever the halo, so the measured
        // value underneath is untouched.
        if (s.glow > 0) {
          const tw = ambient
            ? 1 + 0.46 * (Math.sin(clock * s.sp + s.ph) * 0.62 +
                          Math.sin(clock * s.sp * 1.71 + s.ph * 2.3) * 0.38)
            : 1;
          const R = rr * 6.4;
          ctx.globalAlpha = Math.max(0, Math.min(0.55, s.a * s.glow * tw));
          ctx.drawImage(halo, x - R, y - R, R * 2, R * 2);
        }

        // The disc is the datum. Fixed opacity, always.
        ctx.globalAlpha = Math.min(0.96, s.a);
        ctx.fillStyle = 'rgb(' + ink[0] + ',' + ink[1] + ',' + ink[2] + ')';
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 4 — leaders for any label the relaxation had to move, then scrims.
      ctx.lineWidth = 1;
      labelBoxes.forEach(b => {
        if (!b.lead) return;
        const dx = b.ax - b.x, dy = b.ay - b.y;
        const len = Math.hypot(dx, dy) || 1;
        // Stop the line at the edge of the text, not at its centre.
        const t = Math.min(1, (b.w / 2 + 7) / len);
        ctx.strokeStyle = 'rgba(244,239,230,.24)';
        ctx.beginPath();
        ctx.moveTo(b.x + dx * t, b.y + dy * t);
        ctx.lineTo(b.ax, b.ay);
        ctx.stroke();
      });

      labelBoxes.forEach(b => {
        const rx = b.w * 0.85, ry = b.h * 1.5;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(rx, ry));
        g.addColorStop(0, 'rgba(10,12,16,.92)');
        g.addColorStop(0.55, 'rgba(10,12,16,.62)');
        g.addColorStop(1, 'rgba(10,12,16,0)');
        ctx.save();
        ctx.translate(b.x, b.y); ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
        ctx.translate(-b.x, -b.y);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(rx, ry), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // 5 — membership lines for the focused film. The one moment the claim
      // "this film belongs to three genres at once" is shown rather than said.
      const focus = hover || cursor;
      if (focus) {
        const fx = px_(focus), fy = py_(focus);
        ctx.lineWidth = 1;
        focus.f.genres.forEach(g => {
          const A = anchors[g];
          if (!A) return;
          ctx.strokeStyle = 'rgba(203,167,108,.66)';
          ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(SX(A.x), SY(A.y)); ctx.stroke();
          ctx.fillStyle = 'rgba(203,167,108,.9)';
          ctx.beginPath(); ctx.arc(SX(A.x), SY(A.y), 3.2, 0, Math.PI * 2); ctx.fill();
        });

        ctx.globalCompositeOperation = 'lighter';
        const FR = focus.r * 10 * rz();
        ctx.globalAlpha = .42;
        ctx.drawImage(halo, fx - FR, fy - FR, FR * 2, FR * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        ring(fx, fy, focus.r * 3.6 * rz() + 6, 'rgba(255,250,240,.92)');
      }

      // The ring on whatever the next click would take, drawn before the click.
      if (hover && hover !== cursor) {
        const hx = px_(hover), hy = py_(hover);
        ctx.strokeStyle = 'rgba(203,167,108,.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.arc(hx, hy, Math.max(12, hover.r * rz() + 9), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (currentIdx !== null) {
        const cur = stars.find(s => s.f.i === currentIdx);
        if (cur && cur !== focus) ring(px_(cur), py_(cur), cur.r * 3.6 * rz() + 6, 'rgba(203,167,108,.9)');
      }
    }

    function ring(x, y, r, stroke) {
      ctx.strokeStyle = stroke; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }

    // Painter's order, computed once per layout: far stars first.
    let order = [];
    function sortOrder() { order = stars.slice().sort((a, b) => a.z - b.z); }

    /* --- animation ---------------------------------------------------------- */

    let half = false;
    function tick(ts) {
      clock = (ts || 0) / 1000;
      let moving = false;

      const pe = 0.12;
      if (Math.abs(tParX - parX) > 0.05 || Math.abs(tParY - parY) > 0.05) {
        parX += (tParX - parX) * pe;
        parY += (tParY - parY) * pe;
        moving = true;
      } else { parX = tParX; parY = tParY; }

      // Zoom eases in log space. Linear easing of a multiplicative quantity
      // crawls at the top of the range and lurches at the bottom; in log space a
      // constant rate reads as a constant rate at every magnification.
      if (Math.abs(Math.log(tZoom) - Math.log(zoom)) > 0.0015) {
        const lz = Math.log(zoom);
        zoom = Math.exp(lz + (Math.log(tZoom) - lz) * 0.2);
        applyAnchor();
        moving = true;
        if (hover || cursor) showTip(hover || cursor);   // the card follows its star
      } else if (zoom !== tZoom) {
        zoom = tZoom;
        applyAnchor();
        moving = true;
      }

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i], d = s.ta - s.a;
        if (Math.abs(d) > 0.005) { s.a += d * 0.16; moving = true; }
        else s.a = s.ta;
      }

      // Full rate while something is actually moving; half rate for the twinkle
      // alone, which is imperceptible at 7% amplitude and halves the cost.
      half = !half;
      if (moving || !ambient || half) draw();

      if (moving || ambient) raf = requestAnimationFrame(tick);
      else raf = 0;
    }

    function run() {
      if (reduced.matches) {
        stars.forEach(s => { s.a = s.ta; });
        parX = tParX; parY = tParY;
        draw();
        return;
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }

    // Nothing animates off screen. An idle background loop repainting a thousand
    // sprites for a field nobody is looking at is just heat.
    if (global.IntersectionObserver) {
      new IntersectionObserver(entries => {
        const vis = entries[0].isIntersecting && !reduced.matches;
        if (vis === ambient) return;
        ambient = vis;
        if (ambient) run(); else draw();
      }, { threshold: 0.01 }).observe(stage);
    }

    /* --- target alpha ------------------------------------------------------- */

    // Preview (hovering a genre) is a temporary lens over whatever filter is
    // committed. It never changes state, so exploring costs nothing to undo —
    // which is the whole reason it is hover and not click.
    function retarget() {
      const keep = lastVisible ? new Set(lastVisible.map(f => f.i)) : null;
      const all = !keep || keep.size === films.length;
      stars.forEach(s => {
        const inFilter = keep ? keep.has(s.f.i) : true;
        const inPreview = preview ? s.f.genres.indexOf(preview) !== -1 : true;
        s.on = inFilter && inPreview;
        if (!inFilter) s.ta = all ? s.base : 0.05;
        else if (!inPreview) s.ta = 0.07;
        else s.ta = s.base;
      });
      if (cursor && !cursor.on) { cursor = null; showTip(hover); }
      run();
    }

    /* --- tooltip ------------------------------------------------------------ */

    const esc = s => String(s).replace(/[&<>"]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function showTip(s) {
      if (!s) { tip.hidden = true; return; }
      const f = s.f;
      // The poster is the fastest way a person recognises a film — far faster
      // than reading the title — so the preview carries one. The box is a fixed
      // size whether or not the image arrives, so nothing jumps.
      tip.innerHTML =
        '<img alt="" src="' + posterUrl(f) + '" onerror="this.style.visibility=\'hidden\'">' +
        '<span class="sky__tip-b">' +
          '<b>' + esc(f.title) + '</b>' +
          '<span>' + f.year + ' &nbsp;·&nbsp; <i class="r">' + f.rating.toFixed(1) + '</i></span>' +
          '<span class="g">' + esc(f.genres.join(' · ')) + '</span>' +
        '</span>';
      tip.hidden = false;
      const bw = tip.offsetWidth, bh = tip.offsetHeight;
      let x = px_(s) + 20, y = py_(s) - bh - 14;
      if (x + bw > W - 10) x = px_(s) - bw - 20;
      if (y < 10) y = py_(s) + 22;
      if (x < 10) x = 10;
      tip.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    }

    /* --- the key ------------------------------------------------------------ */

    function paintKey() {
      if (!keyEl) return;
      const unit = Math.min(W, H);
      const rBase = Math.max(1, unit * 0.0026);
      keyEl.innerHTML = CLASSES.map(C => {
        const d = Math.max(4, Math.round(rBase * C.r * 2));
        const ink = 'rgb(' + C.ink.join(',') + ')';
        return '<span class="sky__key-item">' +
          '<i class="sky__key-dot" style="width:' + d + 'px;height:' + d + 'px;' +
            'background:' + ink + ';opacity:' + C.a.toFixed(2) + '"></i>' +
          '<b>' + C.label + '</b>' +
          '<span class="sky__key-n">' + C.n + '</span>' +
        '</span>';
      }).join('');
    }

    /* --- sizing -------------------------------------------------------------- */

    function resize() {
      const rect = stage.getBoundingClientRect();
      const w = Math.max(280, Math.round(rect.width));
      const h = Math.max(320, Math.round(rect.height));
      if (w === W && h === H && stars.length) return false;
      W = w; H = h;
      dpr = Math.min(2, global.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      if (!halo) buildSprites();
      buildDust();
      zoom = 1; tZoom = 1; panX = 0; panY = 0;
      anchorSX = anchorSY = anchorWX = anchorWY = 0;
      setTouchAction();
      if (onZoom) onZoom(zoom);
      layout();
      sortOrder();
      buildLabels();
      paintKey();
      return true;
    }

    /* --- events -------------------------------------------------------------- */

    function setParallaxFromPointer(mx, my) {
      if (reduced.matches) return;
      tParX = -((mx / W) - 0.5) * 2 * PARALLAX;
      tParY = -((my / H) - 0.5) * 2 * PARALLAX;
    }

    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      setParallaxFromPointer(mx, my);
      const near = starsAt(mx, my, 5);
      const s = near[0] || null;
      if (s !== hover) {
        hover = s;
        canvas.style.cursor = s ? 'pointer' : (zoom > 1 ? 'grab' : 'default');
        showTip(s || cursor);
      } else if (s) showTip(s);
      // Two or more films inside the pick radius is an ambiguity, and taking the
      // nearest silently is a coin toss the reader cannot see. Offer the set.
      if (onCrowd) onCrowd(near.length > 1 ? near.map(st => st.f) : null);
      run();
    });

    canvas.addEventListener('mouseleave', () => {
      hover = null;
      if (onCrowd) onCrowd(null);
      tParX = 0; tParY = 0;
      showTip(cursor);
      run();
    });

    canvas.addEventListener('click', e => {
      if (dragged) { dragged = false; return; }      // a pan is not a selection
      const r = canvas.getBoundingClientRect();
      const s = starAt(e.clientX - r.left, e.clientY - r.top);
      if (s) onPick(s.f.i);
    });

    // Intent tracking. A wheel event is only a zoom if the pointer has settled
    // here; otherwise it is part of a page scroll and belongs to the document.
    global.addEventListener('scroll', () => { lastPageScroll = performance.now(); }, { passive: true });
    stage.addEventListener('pointerenter', () => { pointerSettledAt = performance.now() + 320; });
    stage.addEventListener('pointerleave', () => { pointerSettledAt = 0; });

    canvas.addEventListener('wheel', e => {
      // A trackpad pinch arrives as ctrlKey+wheel, so this covers pinch-to-zoom
      // on a laptop as well as the explicit modifier on a mouse.
      if (!e.ctrlKey && !e.metaKey) {
        if (onHint) onHint('zoom');     // tell them how, once
        return;                          // the page keeps the wheel
      }
      const dy = e.deltaY;
      if ((tZoom <= MINZ + 1e-4 && dy > 0) || (tZoom >= MAXZ - 1e-4 && dy < 0)) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      if (zoomAt(mx, my, Math.exp(-dy * 0.0022))) {
        setParallaxFromPointer(mx, my);
        run();
      }
    }, { passive: false });

    canvas.addEventListener('pointerdown', e => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        dragFrom = { x: e.clientX, y: e.clientY, panX: panX, panY: panY };
        dragged = false;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        if (zoom > 1) canvas.style.cursor = 'grabbing';
      } else if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        pinchFrom = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        pinchZoom = zoom;
        dragFrom = null;
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = canvas.getBoundingClientRect();

      if (pointers.size === 2 && pinchFrom) {
        const pts = Array.from(pointers.values());
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const cx = (pts[0].x + pts[1].x) / 2 - r.left;
        const cy = (pts[0].y + pts[1].y) / 2 - r.top;
        const target = pinchZoom * (d / pinchFrom);
        dragged = true;
        if (zoomAt(cx, cy, target / tZoom)) run();
        return;
      }

      if (dragFrom) {
        const dx = e.clientX - dragFrom.x, dy = e.clientY - dragFrom.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragged = true;
        if (zoom > 1 && dragged) {
          // A drag has to track the pointer exactly, so it is applied directly
          // rather than eased, and it stops any zoom still in flight. Panning
          // that lags behind the finger feels broken in a way zoom does not.
          tZoom = zoom;
          panX = dragFrom.panX + dx;
          panY = dragFrom.panY + dy;
          clampPan();
          // Re-seat the anchor on the pointer so a zoom straight after a drag
          // still pins the right point.
          anchorSX = e.clientX - r.left; anchorSY = e.clientY - r.top;
          anchorWX = (anchorSX - panX) / zoom;
          anchorWY = (anchorSY - panY) / zoom;
          showTip(hover || cursor);
          draw();
        }
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchFrom = 0;
      if (pointers.size === 0) {
        dragFrom = null;
        canvas.style.cursor = hover ? 'pointer' : (zoom > 1 ? 'grab' : 'default');
      }
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    // Hovering a genre label previews that genre across the whole field, and
    // mirrors into the rail so the two controls read as one thing.
    labelLayer.addEventListener('pointerover', e => {
      const b = e.target.closest('[data-genre]');
      if (!b || coarse.matches) return;
      api.preview(b.dataset.genre);
      if (onPreview) onPreview(b.dataset.genre);
    });
    labelLayer.addEventListener('pointerout', e => {
      const b = e.target.closest('[data-genre]');
      if (!b || coarse.matches) return;
      if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-genre]')) return;
      api.preview(null);
      if (onPreview) onPreview(null);
    });
    labelLayer.addEventListener('click', e => {
      const b = e.target.closest('[data-genre]');
      if (b) onGenre(b.dataset.genre);
    });

    canvas.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); api.step(e.key === 'ArrowRight' ? 1 : -1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault(); api.zoomBy(1.35);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault(); api.zoomBy(1 / 1.35);
      } else if (e.key === '0') {
        e.preventDefault(); api.resetView();
      } else if ((e.key === 'Enter' || e.key === ' ') && cursor) {
        e.preventDefault(); onPick(cursor.f.i);
      }
    });
    canvas.addEventListener('blur', () => {
      if (!cursor) return;
      cursor = null; showTip(hover); run();
    });

    // Label relaxation measures rendered text, so it has to run again once the
    // webfont swaps in — otherwise the whole arrangement is solved against
    // fallback metrics and quietly wrong on every cold load.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (stars.length && anchors) { buildLabels(); draw(); }
      });
    }

    let rt = 0;
    const remeasure = () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (!stage.getBoundingClientRect().width) return;
        if (resize()) { retarget(); }
      }, 140);
    };
    if (global.ResizeObserver) new ResizeObserver(remeasure).observe(stage);
    global.addEventListener('resize', remeasure);

    /* --- public --------------------------------------------------------------- */

    const api = {
      filter: function (visible, immediate) {
        if (!visible) return;
        lastVisible = visible;
        if (!stars.length) return;
        retarget();
        if (immediate) { stars.forEach(s => { s.a = s.ta; }); draw(); }
      },

      preview: function (g) {
        if (preview === g) return;
        preview = g;
        paintLabelStates();
        retarget();
      },

      setActiveGenre: function (g) { activeGenre = g; paintLabelStates(); },

      mount: function () {
        if (!stage.getBoundingClientRect().width) return false;
        const changed = resize();
        if (!changed) draw();
        return changed;
      },

      select: function (filmIndex) {
        currentIdx = filmIndex;
        if (filmIndex !== null) {
          const s = stars.find(x => x.f.i === filmIndex);
          if (s) { cursor = s; showTip(s); }
        }
        run();
      },

      step: function (dir) {
        if (!lastVisible || !lastVisible.length) return null;
        let pos = cursor ? lastVisible.findIndex(f => f.i === cursor.f.i) : -1;
        pos = pos === -1 ? (dir > 0 ? 0 : lastVisible.length - 1) : pos + dir;
        if (pos < 0 || pos >= lastVisible.length) return null;
        const target = lastVisible[pos];
        const s = stars.find(x => x.f.i === target.i);
        if (!s) return null;
        cursor = s;
        showTip(s);
        run();
        if (onCursor) onCursor(target);
        return target;
      },

      zoomBy: function (f) {
        if (zoomAt(W / 2, H / 2, f)) run();
      },

      resetView: function () {
        // Glide home rather than snap, using the centre as the anchor so the
        // field settles symmetrically.
        anchorSX = W / 2; anchorSY = H / 2;
        anchorWX = (anchorSX - panX) / zoom;
        anchorWY = (anchorSY - panY) / zoom;
        tZoom = 1;
        setTouchAction();
        if (onZoom) onZoom(tZoom);
        if (reduced.matches) { zoom = 1; panX = 0; panY = 0; clampPan(); draw(); }
        else run();
      },

      getZoom: function () { return tZoom; },

      cursorFilm: function () { return cursor ? cursor.f : null; },

      // A computed-position chart should be able to hand over its coordinates so
      // the claim it makes about distance can be checked rather than trusted.
      positions: function () {
        return {
          size: { w: W, h: H },
          // The lens, so a reader checking coordinates can map world to screen.
          view: { zoom: zoom, targetZoom: tZoom, panX: panX, panY: panY },
          anchors: Object.keys(anchors).map(g => ({ genre: g, x: anchors[g].x, y: anchors[g].y })),
          stars: stars.map(s => ({ x: s.x, y: s.y, r: s.r, z: s.z, genres: s.f.genres, title: s.f.title }))
        };
      }
    };

    return api;
  }

  global.createSky = createSky;
})(window);
