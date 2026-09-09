/* Computes every number and coordinate used in the audit write-up and its figures.
   The embedder below is a faithful port of the one in ../../../sky.js — same seed,
   same iteration count, same force law — so the "raw counts" panel is genuinely the
   layout the original build would have produced, not an illustration of one.

     node figures.js > figures.json
*/

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', '..', 'data', 'films.enriched.json');
const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const films = raw.rows.map(r => ({ title: r[0], genres: r[4], rating: r[5] }));

/* --- tallies -------------------------------------------------------------- */

const count = {};
films.forEach(f => f.genres.forEach(g => { count[g] = (count[g] || 0) + 1; }));
const genres = Object.keys(count).sort((a, b) => count[b] - count[a]);
const N = genres.length;
const gi = {}; genres.forEach((g, i) => { gi[g] = i; });

const pair = {};
films.forEach(f => {
  const gs = f.genres;
  for (let a = 0; a < gs.length; a++) {
    for (let b = a + 1; b < gs.length; b++) {
      const k = [gs[a], gs[b]].sort().join('|');
      pair[k] = (pair[k] || 0) + 1;
    }
  }
});

const pairs = Object.entries(pair).map(([k, n]) => {
  const [a, b] = k.split('|');
  return { a, b, raw: n, jaccard: n / (count[a] + count[b] - n) };
});

const byRaw = pairs.slice().sort((x, y) => y.raw - x.raw);
const byJac = pairs.slice().sort((x, y) => y.jaccard - x.jaccard);
const rankRaw = {}, rankJac = {};
byRaw.forEach((p, i) => { rankRaw[p.a + '|' + p.b] = i + 1; });
byJac.forEach((p, i) => { rankJac[p.a + '|' + p.b] = i + 1; });

const TOP = 9;
const shown = new Set();
byRaw.slice(0, TOP).forEach(p => shown.add(p.a + '|' + p.b));
byJac.slice(0, TOP).forEach(p => shown.add(p.a + '|' + p.b));

const slope = Array.from(shown).map(k => {
  const p = pairs.find(q => q.a + '|' + q.b === k);
  return {
    label: p.a + ' + ' + p.b,
    raw: p.raw, jaccard: +p.jaccard.toFixed(3),
    rankRaw: rankRaw[k], rankJac: rankJac[k]
  };
}).sort((x, y) => x.rankRaw - y.rankRaw);

/* --- the embedder, ported from sky.js ------------------------------------- */

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function embed(strength, aspect) {
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
        const s = strength[i][j];
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

function matrix(kind) {
  const M = [];
  for (let i = 0; i < N; i++) M.push(new Float64Array(N));
  let max = 0;
  pairs.forEach(p => {
    const i = gi[p.a], j = gi[p.b];
    const v = kind === 'raw' ? p.raw : p.jaccard;
    M[i][j] = M[j][i] = v;
    if (v > max) max = v;
  });
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) M[i][j] /= max;
  return M;
}

// Normalise to a 0..1 box, preserving aspect, for drawing.
function fit(P) {
  const xs = P.map(p => p.x), ys = P.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = 1 / Math.max(maxX - minX, maxY - minY);
  return P.map((p, i) => ({
    genre: genres[i],
    x: +((p.x - minX) * s).toFixed(4),
    y: +((p.y - minY) * s).toFixed(4)
  }));
}

// How spread out is a layout? Mean distance to nearest other anchor, in the same
// normalised units, so the two panels are directly comparable.
function meanNearest(P) {
  let sum = 0;
  for (let i = 0; i < P.length; i++) {
    let best = Infinity;
    for (let j = 0; j < P.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
      if (d < best) best = d;
    }
    sum += best;
  }
  return +(sum / P.length).toFixed(4);
}

const ASPECT = 1.35;
const rawLayout = fit(embed(matrix('raw'), ASPECT));
const jacLayout = fit(embed(matrix('jaccard'), ASPECT));

console.log(JSON.stringify({
  totals: { films: films.length, genres: N },
  share: genres.map(g => ({
    genre: g, n: count[g], pct: +(count[g] / films.length * 100).toFixed(1)
  })),
  slope,
  layouts: {
    raw: { points: rawLayout, meanNearest: meanNearest(rawLayout) },
    jaccard: { points: jacLayout, meanNearest: meanNearest(jacLayout) }
  },
  topRaw: byRaw.slice(0, 6).map(p => ({ label: p.a + ' + ' + p.b, v: p.raw })),
  topJac: byJac.slice(0, 6).map(p => ({ label: p.a + ' + ' + p.b, v: +p.jaccard.toFixed(3) }))
}, null, 1));
