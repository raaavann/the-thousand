/* Ablation: which of the three changes actually moved the number?
   ----------------------------------------------------------------------------
   The rebuild changed three things at once — the affinity measure, the centroid
   weighting, and a per-cluster radius cap. Changing three things and reporting one
   improvement is not evidence, so this isolates them.

   The metric is scale-free and states the claim directly:
     "is a film's nearest genre anchor one of the genres it actually belongs to?"
   Random placement scores ~12% (mean 2.54 genres out of 21 anchors).

   Config C is the shipped build. Its output here is checked against the live page
   (window.__spatialAudit) to confirm the port is faithful before A and B are trusted.

     node ablate.js
*/

const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'data', 'films.enriched.json'), 'utf8'));
const films = raw.rows.map(r => ({ title: r[0], genres: r[4], rating: r[5] }));

const RATING_MIN = 7.6, RATING_MAX = 9.3;
const ratingFrac = f => (f.rating - RATING_MIN) / (RATING_MAX - RATING_MIN);

const count = {};
films.forEach(f => f.genres.forEach(g => { count[g] = (count[g] || 0) + 1; }));
const genres = Object.keys(count).sort((a, b) => count[b] - count[a]);
const N = genres.length;
const gi = {}; genres.forEach((g, i) => { gi[g] = i; });

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* --- affinity matrices ---------------------------------------------------- */

function affinity(kind) {
  const M = [];
  for (let i = 0; i < N; i++) M.push(new Float64Array(N));
  const co = [];
  for (let i = 0; i < N; i++) co.push(new Float64Array(N));
  films.forEach(f => {
    const gs = f.genres;
    for (let a = 0; a < gs.length; a++) {
      for (let b = a + 1; b < gs.length; b++) {
        const i = gi[gs[a]], j = gi[gs[b]];
        co[i][j]++; co[j][i]++;
      }
    }
  });
  let max = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const v = kind === 'raw'
        ? co[i][j]
        : (count[genres[i]] + count[genres[j]] - co[i][j] > 0
            ? co[i][j] / (count[genres[i]] + count[genres[j]] - co[i][j]) : 0);
      M[i][j] = M[j][i] = v;
      if (v > max) max = v;
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) M[i][j] /= (max || 1);
  return M;
}

/* --- embedder (port of sky.js computeAnchors) ------------------------------ */

function embed(S_, aspect) {
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
        const s = S_[i][j];
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
  return P;
}

/* --- full layout (port of sky.js layout + relax) --------------------------- */

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function layout(opts) {
  const W = 1265, H = 654;                       // the live stage, for comparability
  const pad = Math.max(58, Math.min(W, H) * 0.11);
  const boxW = W - pad * 2, boxH = H - pad * 2;
  const pts = embed(affinity(opts.measure), boxW / boxH);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(p => {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  });
  const ANISO = opts.aniso ? 1.45 : 1;
  const sx = boxW / ((maxX - minX) || 1), sy = boxH / ((maxY - minY) || 1);
  const base = Math.min(sx, sy);
  const scaleX = Math.min(sx, base * ANISO), scaleY = Math.min(sy, base * ANISO);
  const offX = pad + (boxW - (maxX - minX) * scaleX) / 2 - minX * scaleX;
  const offY = pad + (boxH - (maxY - minY) * scaleY) / 2 - minY * scaleY;

  const anchors = {};
  genres.forEach((g, i) => {
    anchors[g] = { x: pts[i].x * scaleX + offX, y: pts[i].y * scaleY + offY };
  });

  const unit = Math.min(W, H);
  const rBase = Math.max(0.9, unit * 0.0022);
  const spread = Math.max(9, unit * 0.024);
  const gw = {};
  genres.forEach(g => {
    gw[g] = opts.weighted ? Math.pow(Math.max(1, count[g]), -0.22) : 1;
  });

  const combos = new Map();
  films.forEach(f => {
    const key = f.genres.slice().sort().join('');
    let g = combos.get(key);
    if (!g) { g = []; combos.set(key, g); }
    g.push(f);
  });

  const rnd = mulberry32(7748291);
  const stars = [];
  combos.forEach(group => {
    const gs = group[0].genres.filter(g => anchors[g]);
    let cx = 0, cy = 0, tw = 0;
    if (gs.length) {
      gs.forEach(g => { cx += anchors[g].x * gw[g]; cy += anchors[g].y * gw[g]; tw += gw[g]; });
      cx /= tw; cy /= tw;
    } else { cx = W / 2; cy = H / 2; }

    let local = spread;
    if (opts.cap) {
      let foreign = Infinity;
      const own = {}; gs.forEach(g => { own[g] = 1; });
      genres.forEach(g => {
        if (own[g]) return;
        const d = Math.hypot(anchors[g].x - cx, anchors[g].y - cy);
        if (d < foreign) foreign = d;
      });
      const room = isFinite(foreign) ? 0.46 * foreign : spread * Math.sqrt(group.length);
      local = Math.max(spread * 0.3, Math.min(spread, room / Math.sqrt(group.length)));
    }

    const jx = (rnd() - 0.5) * local * (opts.cap ? 0.8 : 1.1);
    const jy = (rnd() - 0.5) * local * (opts.cap ? 0.8 : 1.1);

    group.forEach((f, i) => {
      const ang = i * GOLDEN + rnd() * 0.0001;
      const rad = local * Math.sqrt(i + 0.45);
      stars.push({
        f: f,
        x: cx + jx + Math.cos(ang) * rad,
        y: cy + jy + Math.sin(ang) * rad,
        r: rBase * (1.15 + 2.5 * ratingFrac(f))
      });
    });
  });

  relax(stars, W, H);
  return { anchors, stars };
}

function relax(stars, W, H) {
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
  const m = 6;
  stars.forEach(s => {
    s.x = Math.max(m, Math.min(W - m, s.x));
    s.y = Math.max(m, Math.min(H - m, s.y));
  });
}

/* --- the metric ------------------------------------------------------------ */

function score(L) {
  const A = Object.keys(L.anchors).map(g => ({ g, x: L.anchors[g].x, y: L.anchors[g].y }));
  let hit = 0;
  const by = { 1: [0, 0], 2: [0, 0], 3: [0, 0] };
  L.stars.forEach(s => {
    let best = null, bd = Infinity;
    A.forEach(a => {
      const d = Math.hypot(s.x - a.x, s.y - a.y);
      if (d < bd) { bd = d; best = a.g; }
    });
    const ok = s.f.genres.indexOf(best) !== -1;
    if (ok) hit++;
    const k = s.f.genres.length;
    by[k][1]++; if (ok) by[k][0]++;
  });
  const pc = (a, b) => (a / b * 100).toFixed(1) + '%';
  return {
    overall: pc(hit, L.stars.length),
    g1: pc(by[1][0], by[1][1]),
    g2: pc(by[2][0], by[2][1]),
    g3: pc(by[3][0], by[3][1])
  };
}

const CONFIGS = [
  ['A  raw counts, plain centroid, no cap', { measure: 'raw', weighted: false, cap: false, aniso: false }],
  ['B  + Jaccard affinity               ', { measure: 'jac', weighted: false, cap: false, aniso: false }],
  ['C  + aspect-fill fit                ', { measure: 'jac', weighted: false, cap: false, aniso: true }],
  ['D  + rarity-weighted centroid       ', { measure: 'jac', weighted: true,  cap: false, aniso: true }],
  ['E  + cluster radius cap  (shipped)  ', { measure: 'jac', weighted: true,  cap: true,  aniso: true }]
];

console.log('nearest anchor is one of the film\'s own genres   (random ≈ 12%)\n');
console.log('config                                  overall   1-genre  2-genre  3-genre');
console.log('-'.repeat(78));
CONFIGS.forEach(([label, opts]) => {
  const s = score(layout(opts));
  console.log(label + '  ' +
    s.overall.padStart(6) + '   ' + s.g1.padStart(6) + '   ' +
    s.g2.padStart(6) + '   ' + s.g3.padStart(6));
});
console.log('\nLive page (window.__spatialAudit) reports 69.3% / 100.0% / 61.8% / 67.2%');
console.log('for config E. Agreement there validates the port.');
