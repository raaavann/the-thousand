/* ============================================================================
   The Thousand — wall behaviour
   ----------------------------------------------------------------------------
   One data pass, then everything is a re-render of a filtered + grouped view.
   The wall is rebuilt as a single HTML string rather than a thousand DOM calls:
   at 1,000 tiles the difference between the two is the difference between a
   filter that feels instant and one that visibly stutters.
   ========================================================================== */
(function () {
  'use strict';

  /* --- 1. Data -------------------------------------------------------------
     Rows are positional (see prepare-data.js) and arrive pre-sorted by rating
     descending, so a row's index is its rank in the collection and no
     arrangement ever needs a secondary sort — sections inherit that order,
     which is why the rating hairlines shorten steadily across every section. */

  const raw = JSON.parse(document.getElementById('film-data').textContent);
  const POSTER = k => 'https://m.media-amazon.com/images/M/' + k + '._V1_SX300.jpg';
  const POSTER_LG = k => 'https://m.media-amazon.com/images/M/' + k + '._V1_SX600.jpg';

  const films = raw.rows.map(function (r, i) {
    return {
      i: i, rank: i + 1,
      title: r[0], year: r[1], cert: r[2], runtime: r[3], genres: r[4],
      rating: r[5], overview: r[6], meta: r[7], director: r[8], stars: r[9],
      votes: r[10], gross: r[11], key: r[12],
      decade: Math.floor(r[1] / 10) * 10,
      // Pre-flattened haystack: search runs on every keystroke over 1,000 rows,
      // and lowercasing five fields each time is the only part that would show.
      hay: (r[0] + ' ' + r[8] + ' ' + r[9].join(' ') + ' ' + r[4].join(' ') + ' ' + r[1]).toLowerCase()
    };
  });

  const RATING_MIN = 7.6, RATING_MAX = 9.3;
  const ratingFrac = f => (f.rating - RATING_MIN) / (RATING_MAX - RATING_MIN);

  /* --- 2. Formatting -------------------------------------------------------- */

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const nf = new Intl.NumberFormat('en-US');

  function compact(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return Math.round(n / 1e3) + 'K';
    return String(n);
  }
  function hhmm(m) {
    const h = Math.floor(m / 60), r = m % 60;
    return h ? h + 'h ' + (r ? String(r).padStart(2, '0') + 'm' : '00m') : m + 'm';
  }
  const ordinalDecade = d => d + 's';

  /* --- 3. Derived tallies --------------------------------------------------- */

  const genreCounts = {};
  films.forEach(f => f.genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }));
  const genresByFreq = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);

  const decadeCounts = {};
  films.forEach(f => { decadeCounts[f.decade] = (decadeCounts[f.decade] || 0) + 1; });
  const decades = Object.keys(decadeCounts).map(Number).sort((a, b) => a - b);
  const decadeMax = Math.max.apply(null, decades.map(d => decadeCounts[d]));

  const directorCount = new Set(films.map(f => f.director)).size;

  /* --- 4. Arrangements ------------------------------------------------------
     Each returns [{ key, title, note, films }] in display order. `note` is a
     one-line editorial gloss, always derived from the section's own contents so
     it can never drift out of sync with a filter. */

  function highestIn(list) {
    return list.length ? '“' + list[0].title + '” leads at ' + list[0].rating.toFixed(1) : '';
  }

  function bucketBy(list, keyOf, order, titleOf, noteOf) {
    const map = new Map();
    list.forEach(f => {
      const k = keyOf(f);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(f);
    });
    return order(Array.from(map.keys()))
      .filter(k => map.get(k) && map.get(k).length)
      .map(k => ({
        key: String(k),
        title: titleOf(k),
        note: noteOf ? noteOf(k, map.get(k)) : highestIn(map.get(k)),
        films: map.get(k)
      }));
  }

  const ACCLAIM_BANDS = [
    { min: 9.0, title: 'Nine and above', note: 'The summit. A handful of films almost nobody argues with.' },
    { min: 8.7, title: '8.7–8.9',      note: '' },
    { min: 8.4, title: '8.4–8.6',      note: '' },
    { min: 8.2, title: '8.2–8.3',      note: '' },
    { min: 8.0, title: '8.0–8.1',      note: '' },
    { min: 7.8, title: '7.8–7.9',      note: '' },
    { min: 0,   title: '7.6–7.7',      note: 'The threshold. Everything below this simply is not in the collection.' }
  ];

  const RUNTIME_BANDS = [
    { max: 90,   title: 'Under 90 minutes', note: 'Shorts of the feature world. Animation and early comedy live here.' },
    { max: 110,  title: '90–109 minutes', note: '' },
    { max: 130,  title: '110–129 minutes', note: '' },
    { max: 150,  title: '130–149 minutes', note: '' },
    { max: 180,  title: '150–179 minutes', note: '' },
    { max: 1e4,  title: 'Three hours and over', note: 'Epics, and the occasional director nobody could edit.' }
  ];

  const ARRANGEMENTS = {
    acclaim: {
      label: 'Acclaim',
      caption: 'by IMDb user rating',
      run: list => ACCLAIM_BANDS.map(function (b, idx) {
        const hi = idx ? ACCLAIM_BANDS[idx - 1].min : Infinity;
        const sub = list.filter(f => f.rating >= b.min && f.rating < hi);
        return { key: 'r' + b.min, title: b.title, films: sub, note: b.note || highestIn(sub) };
      }).filter(s => s.films.length)
    },
    decade: {
      label: 'Decade',
      caption: 'by release decade',
      run: list => bucketBy(list, f => f.decade, ks => ks.sort((a, b) => a - b),
        k => ordinalDecade(k))
    },
    genre: {
      label: 'Genre',
      caption: 'by first-listed genre',
      run: list => bucketBy(list, f => f.genres[0],
        ks => ks.sort((a, b) => genreCounts[b] - genreCounts[a]), k => k)
    },
    length: {
      label: 'Length',
      caption: 'by running time',
      run: list => RUNTIME_BANDS.map((b, idx) => {
        const lo = idx ? RUNTIME_BANDS[idx - 1].max : 0;
        const sub = list.filter(f => f.runtime >= lo && f.runtime < b.max);
        return { key: 't' + b.max, title: b.title, films: sub, note: b.note || highestIn(sub) };
      }).filter(s => s.films.length)
    }
  };

  /* --- 5. State ------------------------------------------------------------- */

  const state = { view: 'sky', arrange: 'acclaim', genre: null, decade: null, q: '' };
  let view = films;                  // current filtered list, in wall order

  const $ = id => document.getElementById(id);
  const wall = $('wall'), plate = $('plate'), plateBody = $('plate-body'), scrim = $('scrim');
  const skyEl = $('sky'), skyStage = $('sky-stage'), skyEmpty = $('sky-empty');
  plate.inert = true;

  /* --- 6. Chrome: standfirst, spine, controls -------------------------------- */

  $('figures').innerHTML = [
    ['Films', nf.format(films.length)],
    ['Directors', nf.format(directorCount)],
    ['Genres', String(genresByFreq.length)],
    ['Span', films.reduce((m, f) => Math.min(m, f.year), 9999) + '–' +
             films.reduce((m, f) => Math.max(m, f.year), 0)]
  ].map(r => '<div><dt>' + r[0] + '</dt><dd class="tnum">' + r[1] + '</dd></div>').join('');

  $('spine').innerHTML = decades.map(d =>
    '<button class="decade" type="button" data-decade="' + d + '" aria-pressed="false" ' +
    'aria-label="' + ordinalDecade(d) + ', ' + decadeCounts[d] + ' films">' +
      '<span class="decade__track"><i class="decade__bar" style="--h:' +
        Math.max(2, Math.round(decadeCounts[d] / decadeMax * 100)) + '%"></i></span>' +
      // Label only. The bar's height already is the count, and printing the
      // number under it encodes the same fact twice while crowding eleven
      // columns into a strip seven grid-columns wide. The figure surfaces on
      // hover instead, in the readout that has room for it.
      '<span class="decade__foot">' + ordinalDecade(d) + '</span>' +
    '</button>').join('');

  // Hovering a decade names it and its count; leaving restores whatever is
  // actually selected, so the readout is never lying about state.
  $('spine').addEventListener('pointerover', e => {
    const b = e.target.closest('.decade'); if (!b) return;
    const d = +b.dataset.decade;
    $('decade-state').textContent = ordinalDecade(d) + ' · ' + decadeCounts[d] + ' films';
  });
  $('spine').addEventListener('pointerleave', () => {
    $('decade-state').textContent = state.decade === null
      ? 'All years' : ordinalDecade(state.decade) + ' · ' + decadeCounts[state.decade] + ' films';
  });

  $('arrange').innerHTML = Object.keys(ARRANGEMENTS).map(k =>
    '<button type="button" data-arrange="' + k + '" aria-pressed="' +
    (k === state.arrange) + '">' + ARRANGEMENTS[k].label + '</button>').join('');

  $('genres').innerHTML =
    '<button type="button" data-genre="" aria-pressed="true">All genres</button>' +
    genresByFreq.map(g =>
      '<button type="button" data-genre="' + esc(g) + '" aria-pressed="false">' +
      esc(g) + '<sup class="tnum">' + genreCounts[g] + '</sup></button>').join('');

  /* --- 7. Render ------------------------------------------------------------- */

  function filtered() {
    const q = state.q.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : null;
    return films.filter(f => {
      if (state.decade !== null && f.decade !== state.decade) return false;
      if (state.genre && f.genres.indexOf(state.genre) === -1) return false;
      if (terms && !terms.every(t => f.hay.indexOf(t) !== -1)) return false;
      return true;
    });
  }

  function tileHTML(f) {
    const cap = esc(f.title);
    return '<button class="tile" type="button" data-i="' + f.i + '" ' +
        'aria-label="' + cap + ', ' + f.year + ', rated ' + f.rating.toFixed(1) + '">' +
      '<span class="tile__fallback" aria-hidden="true">' + cap + '</span>' +
      '<img src="' + POSTER(f.key) + '" alt="" loading="lazy" decoding="async" ' +
        'width="200" height="300">' +
      '<span class="tile__rank tnum" aria-hidden="true">' + f.rank + '</span>' +
      '<span class="tile__cap" aria-hidden="true"><b>' + cap + '</b>' +
        '<span class="tnum">' + f.year + ' · ' + f.rating.toFixed(1) + '</span></span>' +
      '<i class="tile__rating" style="--w:' +
        (6 + ratingFrac(f) * 94).toFixed(1) + '%"></i>' +
    '</button>';
  }

  function render() {
    view = filtered();

    const n = view.length;
    $('count').textContent = nf.format(n);
    // The grouping rule, named in words, folded into the count readout rather
    // than given chrome of its own. It earns its place on "Genre", where the wall
    // shows 14 sections against a rail of 21 — because a film is shelved under
    // its first-listed genre only, not repeated under all of them. In the sky
    // there is no grouping, so it says nothing.
    $('count-of').textContent = state.view === 'wall'
      ? ' films, ' + ARRANGEMENTS[state.arrange].caption
      : ' films';
    const dirty = !!(state.genre || state.decade !== null || state.q.trim());
    $('reset').hidden = !dirty;
    $('q-clear').hidden = !state.q;

    const isSky = state.view === 'sky';
    skyEl.hidden = !isSky;
    wall.hidden = isSky;
    $('arrange-field').hidden = isSky;   // arranging is a property of the wall only

    if (isSky) {
      // The wall's thousand nodes are dropped while the sky is up rather than
      // left hidden in the document; there is no reason to keep them resident.
      if (wall.innerHTML) wall.innerHTML = '';
      skyEmpty.hidden = n > 0;
      mountSky();
      sky.filter(view);
      return;
    }

    if (!n) {
      wall.innerHTML =
        '<div class="empty"><p>Nothing in the collection matches that.</p>' +
        '<button type="button" data-reset>Clear every filter</button></div>';
      return;
    }

    const sections = ARRANGEMENTS[state.arrange].run(view);
    wall.innerHTML = sections.map(s =>
      '<section class="section">' +
        '<div class="section__head">' +
          '<h2 class="section__title">' + esc(s.title) + '</h2>' +
          '<p class="section__note">' + esc(s.note || '') + '</p>' +
          '<p class="section__count mono tnum">' + nf.format(s.films.length) + '</p>' +
        '</div>' +
        '<div class="tiles">' + s.films.map(tileHTML).join('') + '</div>' +
      '</section>').join('');

    if (current !== null) markCurrent();
  }

  // load/error don't bubble, so both are caught in the capture phase from one
  // listener on the wall rather than 1,000 per-image handlers.
  wall.addEventListener('load', e => {
    if (e.target.tagName === 'IMG') e.target.parentNode.classList.add('is-loaded');
  }, true);
  wall.addEventListener('error', e => {
    if (e.target.tagName === 'IMG') e.target.remove();   // reveals .tile__fallback
  }, true);

  /* --- 7b. The constellation -------------------------------------------------
     Built on first use and kept alive after that: the anchor embedder and the
     phyllotaxis pass are cheap, but there is no sense repeating them every time
     the reader flips back from the wall. */

  let sky = null;

  function mountSky() {
    if (!sky) {
      sky = createSky({
        films: films,
        genres: genresByFreq,
        ratingFrac: ratingFrac,
        stage: skyStage,
        canvas: $('sky-canvas'),
        labels: $('sky-labels'),
        tip: $('sky-tip'),
        posterUrl: f => POSTER(f.key),
        key: $('sky-key-row'),
        onPick: i => openPlate(i, $('sky-canvas')),
        onGenre: g => { setGenre(g); },
        onPreview: g => paintRailPreview(g),
        onZoom: z => {
          $('zoom-read').textContent = z.toFixed(1) + '\u00d7';
          $('zoom-reset').hidden = z <= 1.001;
          $('sky-zoom').querySelector('[data-zoom="in"]').disabled = z >= 6.99;
          $('sky-zoom').querySelector('[data-zoom="out"]').disabled = z <= 1.001;
        },
        onCursor: f => {
          $('sky-live').textContent =
            f.title + ', ' + f.year + ', rated ' + f.rating.toFixed(1) +
            ', ' + f.genres.join(', ');
        }
      });
    }
    sky.mount();
  }

  // Exposed on purpose: the piece states a claim about what distance means, and
  // anyone should be able to pull the coordinates out and test it.
  window.__spatialAudit = () => (sky ? sky.positions() : null);

  /* --- 8. The plate ---------------------------------------------------------- */

  let current = null;        // film index into `films`
  let opener = null;         // tile to return focus to

  function markCurrent() {
    const prev = wall.querySelector('.tile[aria-current="true"]');
    if (prev) prev.removeAttribute('aria-current');
    if (sky) sky.select(current);
    if (current === null) return;
    const el = wall.querySelector('.tile[data-i="' + current + '"]');
    if (el) el.setAttribute('aria-current', 'true');
  }

  function row(label, body) {
    return '<div class="row"><dt>' + label + '</dt><dd>' + body + '</dd></div>';
  }

  function plateHTML(f) {
    const metaRow = f.meta !== null
      ? row('Critics', '<b class="tnum">' + f.meta + '</b> <span style="color:var(--paper-3)">Metascore</span>')
      : '';
    const grossRow = f.gross !== null
      ? row('Box office', '<b class="tnum">$' + compact(f.gross) + '</b> <span style="color:var(--paper-3)">domestic</span>')
      : '';

    const facts = ['<span class="tnum">' + f.year + '</span>'];
    if (f.cert) facts.push('<span>' + esc(f.cert) + '</span>');
    facts.push('<span class="tnum">' + hhmm(f.runtime) + '</span>');

    return '' +
      '<div class="plate__poster">' +
        '<img src="' + POSTER_LG(f.key) + '" alt="Poster for ' + esc(f.title) + '" ' +
          'onerror="this.onerror=null;this.src=\'' + POSTER(f.key) + '\'">' +
      '</div>' +

      '<h2>' + esc(f.title) + '</h2>' +
      '<p class="plate__facts mono">' + facts.join('') + '</p>' +

      '<div class="score">' +
        '<div class="score__big tnum">' + f.rating.toFixed(1) + '</div>' +
        '<div class="score__meta">' +
          '<span class="mono">IMDb · ' + compact(f.votes) + ' votes</span>' +
          '<div class="score__track"><i style="--w:' +
            (ratingFrac(f) * 100).toFixed(1) + '%"></i></div>' +
          '<div class="score__scale"><span>7.6</span>' +
            '<span>within the collection</span><span>9.3</span></div>' +
        '</div>' +
      '</div>' +

      '<p class="plate__quote">' + esc(f.overview) + '</p>' +

      '<dl class="plate__rows">' +
        row('Directed', '<button class="linkish" data-search="' + esc(f.director) + '">' +
              esc(f.director) + '</button>') +
        row('Starring', '<div class="taglist">' + f.stars.map(s =>
              '<button class="linkish" data-search="' + esc(s) + '">' + esc(s) + '</button>')
              .join('<span style="color:var(--paper-4)">/</span>') + '</div>') +
        row('Genre', '<div class="taglist">' + f.genres.map(g =>
              '<button class="linkish" data-genre="' + esc(g) + '">' + esc(g) + '</button>')
              .join('<span style="color:var(--paper-4)">/</span>') + '</div>') +
        row('Rank', '<b class="tnum">' + f.rank + '</b> ' +
              '<span style="color:var(--paper-3)">of 1,000 by rating</span>') +
        metaRow + grossRow +
      '</dl>';
  }

  function openPlate(i, fromEl) {
    current = i;
    const f = films[i];
    plateBody.innerHTML = plateHTML(f);
    plateBody.scrollTop = 0;
    $('plate-no').textContent = 'No. ' + String(f.rank).padStart(4, '0');
    plate.classList.add('is-open');
    plate.setAttribute('aria-hidden', 'false');
    plate.inert = false;
    scrim.classList.add('is-open');
    document.body.classList.add('plate-open');
    if (fromEl) opener = fromEl;
    // Focus moves into the record so a keyboard reader lands on it rather than
    // continuing to tab through the wall behind; closing hands focus back to the
    // poster it came from. preventScroll keeps the wall exactly where it was.
    $('close').focus({ preventScroll: true });

    const pos = view.findIndex(v => v.i === i);
    $('prev').disabled = pos <= 0;
    $('next').disabled = pos === -1 || pos >= view.length - 1;
    markCurrent();
  }

  function closePlate() {
    plate.classList.remove('is-open');
    plate.setAttribute('aria-hidden', 'true');
    // aria-hidden alone would leave the prev/next/close buttons reachable by Tab
    // inside a region screen readers are told to ignore; inert removes them from
    // the tab order and the accessibility tree together.
    plate.inert = true;
    scrim.classList.remove('is-open');
    document.body.classList.remove('plate-open');
    current = null;
    markCurrent();
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }

  // Step through the *current* wall order, not the underlying rank order, so the
  // arrows always follow what the reader can actually see.
  function step(dir) {
    if (current === null) return;
    const pos = view.findIndex(v => v.i === current);
    const nextPos = pos + dir;
    if (pos === -1 || nextPos < 0 || nextPos >= view.length) return;
    const target = view[nextPos];
    openPlate(target.i, null);
    if (state.view === 'wall') {
      const el = wall.querySelector('.tile[data-i="' + target.i + '"]');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /* --- 9. Wiring -------------------------------------------------------------- */

  // The buttons exist because scroll-to-zoom is invisible to anyone who does not
  // already know it is there, and unusable on a trackpad-less machine.
  $('sky-zoom').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !sky) return;
    if (b.dataset.zoom === 'in') sky.zoomBy(1.4);
    else if (b.dataset.zoom === 'out') sky.zoomBy(1 / 1.4);
    else sky.resetView();
  });

  skyEmpty.addEventListener('click', e => {
    if (e.target.closest('[data-reset]')) resetAll();
  });

  wall.addEventListener('click', e => {
    const tile = e.target.closest('.tile');
    if (tile) { openPlate(+tile.dataset.i, tile); return; }
    if (e.target.closest('[data-reset]')) resetAll();
  });

  $('view').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.view === state.view) return;
    state.view = b.dataset.view;
    Array.from($('view').children).forEach(x =>
      x.setAttribute('aria-pressed', String(x === b)));
    render();
  });

  $('arrange').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.arrange = b.dataset.arrange;
    Array.from($('arrange').children).forEach(x =>
      x.setAttribute('aria-pressed', String(x === b)));
    render();
  });

  $('genres').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    setGenre(b.dataset.genre || null);
  });

  function setGenre(g) {
    state.genre = (state.genre === g) ? null : g;
    Array.from($('genres').children).forEach(x =>
      x.setAttribute('aria-pressed', String((x.dataset.genre || null) === state.genre)));
    if (sky) sky.setActiveGenre(state.genre);
    render();
  }

  // Hovering a rail item previews that genre in the sky, and hovering a label in
  // the sky lights the matching rail item. Two controls, one behaviour — a
  // reader who finds either one has found both.
  function paintRailPreview(g) {
    Array.from($('genres').children).forEach(x =>
      x.classList.toggle('is-preview', !!g && x.dataset.genre === g));
  }
  $('genres').addEventListener('pointerover', e => {
    const b = e.target.closest('button[data-genre]');
    if (!b || !sky || state.view !== 'sky') return;
    sky.preview(b.dataset.genre || null);
    paintRailPreview(b.dataset.genre || null);
  });
  $('genres').addEventListener('pointerleave', () => {
    if (!sky) return;
    sky.preview(null);
    paintRailPreview(null);
  });

  $('spine').addEventListener('click', e => {
    const b = e.target.closest('.decade'); if (!b) return;
    const d = +b.dataset.decade;
    state.decade = (state.decade === d) ? null : d;
    Array.from($('spine').children).forEach(x =>
      x.setAttribute('aria-pressed', String(+x.dataset.decade === state.decade)));
    $('decade-state').textContent = state.decade === null
      ? 'All years' : ordinalDecade(state.decade);
    render();
  });

  let qTimer;
  $('q').addEventListener('input', e => {
    const v = e.target.value;
    clearTimeout(qTimer);
    // 1,000 rows re-filter and re-render in a few ms, but coalescing keystrokes
    // keeps fast typists from paying for intermediate states they never read.
    qTimer = setTimeout(() => { state.q = v; render(); }, 120);
  });
  $('q-clear').addEventListener('click', () => {
    $('q').value = ''; state.q = ''; render(); $('q').focus();
  });

  function resetAll() {
    state.genre = null; state.decade = null; state.q = '';
    $('q').value = '';
    Array.from($('genres').children).forEach(x =>
      x.setAttribute('aria-pressed', String(!x.dataset.genre)));
    Array.from($('spine').children).forEach(x => x.setAttribute('aria-pressed', 'false'));
    $('decade-state').textContent = 'All years';
    if (sky) sky.setActiveGenre(null);
    render();
  }
  $('reset').addEventListener('click', resetAll);

  $('close').addEventListener('click', closePlate);
  scrim.addEventListener('click', closePlate);
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));

  // scrollIntoView on the control bar is a no-op once the bar is stuck to the top
  // of the viewport, so the top of the wall is computed directly and offset by the
  // bar's height to keep the first section head clear of it.
  function scrollToWall() {
    const bar = document.querySelector('.controls');
    scrollTo({ top: Math.max(0, wall.offsetTop - bar.offsetHeight - 8), behavior: 'smooth' });
  }

  plateBody.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.genre) {
      state.genre = null;                 // always set, never toggle off, from here
      setGenre(b.dataset.genre);
      closePlate();
      scrollToWall();
    } else if (b.dataset.search) {
      $('q').value = b.dataset.search;
      state.q = b.dataset.search;
      render();
      closePlate();
      scrollToWall();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && current !== null) { closePlate(); return; }
    if (e.key === '/' && document.activeElement !== $('q')) {
      e.preventDefault(); $('q').focus(); return;
    }
    if (current === null) return;
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (typing) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); }
  });

  // Section heads stick just below the control bar; the bar's height depends on
  // wrapping, so it is measured rather than guessed.
  const controls = document.querySelector('.controls');
  const setStick = () => document.documentElement.style
    .setProperty('--stick', controls.offsetHeight + 'px');
  setStick();
  addEventListener('resize', setStick);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setStick);

  render();
})();
