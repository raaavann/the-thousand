// Re-derives the page dataset from the Curator's full curated set.
//
// The previous build shipped only 6 of the 17 curated fields (title/year/director/
// genres/thumb), which left the *ratings* — the reason this collection exists at all —
// entirely off the page. This keeps everything the gallery actually reads.
//
// Records are emitted as positional arrays rather than objects: 1,000 records with
// 14 keys each costs ~55KB of repeated key names in a file that gets inlined into
// index.html. FIELDS below is the contract, mirrored in script.js.
//
//   node prepare-data.js

const fs = require('fs');
const path = require('path');

// The Curator's full curated set, vendored into the repo so the pipeline is
// reproducible by anyone who clones it rather than only on the machine it was
// written on.
const SRC = path.join(__dirname, 'data', 'source', 'films.curated.json');
const OUT = path.join(__dirname, 'data', 'films.enriched.json');

// Every curated poster_url_thumb is exactly
//   https://m.media-amazon.com/images/M/<KEY>._V1_SX300.jpg
// (verified: 0 of 1000 deviate), so only <KEY> is stored and script.js rebuilds the
// URL at whatever width it needs — SX300 for the wall, SX600 for the detail plate.
const POSTER_RE = /^https:\/\/m\.media-amazon\.com\/images\/M\/(.+)\._V1_SX300\.jpg$/;

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const FIELDS = ['title', 'year', 'cert', 'runtime', 'genres', 'rating',
                'overview', 'meta', 'director', 'stars', 'votes', 'gross', 'poster'];

const rows = src.map(f => {
  const m = POSTER_RE.exec(f.poster_url_thumb);
  if (!m) throw new Error('Unexpected poster URL for ' + f.title);
  return [
    f.title,
    f.released_year,
    f.certificate,          // null for 101 films — the page omits the slot, never prints "null"
    f.runtime_min,
    f.genres,
    f.imdb_rating,
    f.overview,
    f.meta_score,           // null for 157
    f.director,
    f.stars,
    f.num_votes,
    f.gross_usd,            // null for 169
    m[1],
  ];
});

// Sorted by rating desc so the default "by acclaim" arrangement needs no client sort,
// and so a record's index is its rank in the collection.
rows.sort((a, b) => b[5] - a[5] || b[10] - a[10]);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ fields: FIELDS, rows }));
console.log('Wrote ' + OUT + ' — ' + rows.length + ' films, ' +
  (fs.statSync(OUT).size / 1024).toFixed(0) + 'KB');
