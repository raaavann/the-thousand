(function () {
  const GENRE_ORDER = ['Drama','Comedy','Crime','Adventure','Action','Thriller','Romance','Biography','Mystery','Animation','Sci-Fi','Fantasy','History','Family','War','Music','Horror','Western','Film-Noir','Sport','Musical'];
  const CENTER_GENRE = 'Drama';
  const MOBILE_BREAKPOINT = 640;

  const field = document.getElementById('field');
  const svg = document.getElementById('connectors');
  const dataEl = document.getElementById('film-data');
  const films = JSON.parse(dataEl.textContent);

  const W = field.clientWidth;
  const isMobile = W <= MOBILE_BREAKPOINT;

  // GENRE_ORDER is by frequency, so the next 5 biggest after Drama (Comedy, Crime,
  // Adventure, Action, Thriller) sit consecutively — used naively they'd bunch together
  // (on the desktop rim, or as consecutive bands on mobile). Interleave big/small genres
  // instead, alternating from both ends of the frequency list.
  const freqRim = GENRE_ORDER.filter(g => g !== CENTER_GENRE);
  const rimGenres = [];
  { let i = 0, j = freqRim.length - 1;
    while (i <= j) { rimGenres.push(freqRim[i++]); if (i <= j) rimGenres.push(freqRim[j--]); } }

  const NS = 'http://www.w3.org/2000/svg';
  function clearLines() { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function drawLinesFor(node, centers) {
    clearLines();
    const pts = node.film.genres.filter(g => centers[g]).map(g => centers[g]);
    if (pts.length <= 1) return;
    pts.forEach(p => {
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', node.x); line.setAttribute('y1', node.y);
      line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
      svg.appendChild(line);
    });
  }

  const revealLabel = document.createElement('div');
  revealLabel.className = 'reveal-label';
  field.appendChild(revealLabel);

  function showLabel(node) {
    revealLabel.textContent = node.film.title + ' · ' + node.film.year + ' · ' + node.film.director;
    revealLabel.classList.add('visible');
    let lx = node.x + 26, ly = node.y - 8;
    if (lx + 220 > W) lx = node.x - 240;
    if (ly < 0) ly = node.y + 26;
    revealLabel.style.left = lx + 'px';
    revealLabel.style.top = ly + 'px';
  }
  function hideLabel() { revealLabel.classList.remove('visible'); clearLines(); }

  // Shared interaction wiring for both breakpoints. `centers` is passed by reference and
  // may still be empty at wire-time (mobile measures band positions after layout) —
  // that's fine, since drawLinesFor/showLabel only read it when a user actually
  // interacts, which is always after the one-time measurement pass below has run.
  // `pinned` lets a tap/click hold the reveal open (no hover to fall back on for touch)
  // until another node is activated or the empty field background is tapped.
  let pinned = null;
  function wire(el, node, centers) {
    const activate = () => { drawLinesFor(node, centers); showLabel(node); };
    el.addEventListener('mouseenter', activate);
    el.addEventListener('mouseleave', () => { if (pinned !== node) hideLabel(); });
    el.addEventListener('focus', activate);
    el.addEventListener('blur', () => { if (pinned !== node) hideLabel(); });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      pinned = (pinned === node) ? null : node;
      if (pinned) activate(); else hideLabel();
    });
  }
  field.addEventListener('click', () => { pinned = null; hideLabel(); });

  function makePoster(node, w, h, centers) {
    const img = document.createElement('img');
    img.className = 'poster';
    img.src = node.film.thumb;
    img.alt = node.film.title;
    img.loading = 'lazy';
    img.tabIndex = 0;
    img.style.width = w + 'px';
    img.style.height = h + 'px';
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', node.film.title + ', ' + node.film.year + ', directed by ' + node.film.director);

    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      const card = document.createElement('div');
      card.className = 'fallback-card';
      card.style.width = w + 'px';
      card.style.height = h + 'px';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', node.film.title + ', ' + node.film.year + ', directed by ' + node.film.director);
      card.textContent = node.film.title;
      wire(card, node, centers);
      img.replaceWith(card);
      node.el = card;
    });
    wire(img, node, centers);
    node.el = img;
    return img;
  }

  if (!isMobile) {
    // ---- Desktop: circular force-cluster constellation (unchanged from verification) ----
    const pad = 40;
    const seedCx = W / 2, seedCy = 1000;
    const seedR = W * 0.42;
    const seedCenters = { [CENTER_GENRE]: { x: seedCx, y: seedCy } };
    rimGenres.forEach((g, i) => {
      const a = (i / rimGenres.length) * Math.PI * 2 - Math.PI / 2;
      seedCenters[g] = { x: seedCx + Math.cos(a) * seedR, y: seedCy + Math.sin(a) * seedR };
    });

    const nodes = films.map(f => {
      const pts = f.genres.filter(g => seedCenters[g]).map(g => seedCenters[g]);
      const tx = pts.length ? pts.reduce((s, p) => s + p.x, 0) / pts.length : seedCx;
      const ty = pts.length ? pts.reduce((s, p) => s + p.y, 0) / pts.length : seedCy;
      return { film: f, tx, ty, x: tx + (Math.random() - 0.5) * 30, y: ty + (Math.random() - 0.5) * 30, r: 13 };
    });

    const sim = d3.forceSimulation(nodes)
      .force('x', d3.forceX(d => d.tx).strength(0.06))
      .force('y', d3.forceY(d => d.ty).strength(0.06))
      .force('collide', d3.forceCollide(d => d.r).iterations(3))
      .stop();
    for (let i = 0; i < 340; i++) sim.tick();

    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const contentW = maxX - minX, contentH = maxY - minY;

    const scale = Math.min(1, (W - pad * 2) / contentW);
    const offX = pad + Math.max(0, (W - pad * 2 - contentW * scale) / 2) - minX * scale;
    const H = contentH * scale + pad * 2;
    const offY = pad - minY * scale;
    field.style.height = H + 'px';

    const fit = (x, y) => ({ x: x * scale + offX, y: y * scale + offY });
    nodes.forEach(n => { const p = fit(n.x, n.y); n.x = p.x; n.y = p.y; });
    const centers = {};
    GENRE_ORDER.forEach(g => { centers[g] = fit(seedCenters[g].x, seedCenters[g].y); });

    GENRE_ORDER.forEach(g => {
      const tag = document.createElement('div');
      tag.className = 'genre-tag';
      tag.textContent = g;
      tag.style.left = centers[g].x + 'px';
      tag.style.top = centers[g].y + 'px';
      field.appendChild(tag);
    });

    // Render scale must match position scale exactly, or images end up larger than the
    // spacing the simulation reserved for them and overlap.
    const posterW = Math.round(22 * scale), posterH = Math.round(32 * scale);

    nodes.forEach(node => {
      const wrap = document.createElement('div');
      wrap.className = 'node';
      wrap.style.left = node.x + 'px';
      wrap.style.top = node.y + 'px';
      wrap.appendChild(makePoster(node, posterW, posterH, centers));
      field.appendChild(wrap);
    });

  } else {
    // ---- Mobile: stacked genre bands, deterministic flex-wrap flow, tap-first ----
    // A circular layout forced into a narrow column crushes 1000 posters to illegible
    // specks (confirmed live: ~8px at 390px width). A tall page has effectively
    // unlimited room, so instead of shrinking the desktop shape, reflow the same
    // genre-driven placement into a vertical sequence of bands — one per genre, Drama
    // first (it's ~36% of the collection), the rest interleaved by size for rhythm.
    // Posters stay near full size. Multi-genre honesty is preserved via the same
    // connector-line mechanism as desktop, now pointing at each band's header instead
    // of a cluster point; positions are measured from real layout (browser flex-wrap),
    // not simulated, since a scrolling column doesn't need collision physics.
    const order = [CENTER_GENRE, ...rimGenres];
    const bandFilms = {};
    order.forEach(g => { bandFilms[g] = []; });
    films.forEach(f => {
      const g = bandFilms[f.genres[0]] ? f.genres[0] : order[0];
      bandFilms[g].push(f);
    });

    const posterW = 20, posterH = 29;
    const centers = {}; // populated after layout below; passed by reference into wire()
    const nodes = [];
    const headerEls = {};

    order.forEach(g => {
      const band = document.createElement('div');
      band.className = 'band';
      const header = document.createElement('div');
      header.className = 'band-header';
      header.textContent = g;
      headerEls[g] = header;
      band.appendChild(header);

      const flow = document.createElement('div');
      flow.className = 'band-flow';
      bandFilms[g].forEach(f => {
        const node = { film: f, x: 0, y: 0 };
        nodes.push(node);
        flow.appendChild(makePoster(node, posterW, posterH, centers));
      });
      band.appendChild(flow);
      field.appendChild(band);
    });

    field.style.height = field.scrollHeight + 'px';

    // One measurement pass now that the real (browser-computed) layout exists.
    const fieldRect = field.getBoundingClientRect();
    order.forEach(g => {
      const r = headerEls[g].getBoundingClientRect();
      centers[g] = { x: r.left - fieldRect.left + r.width / 2, y: r.top - fieldRect.top + r.height / 2 };
    });
    nodes.forEach(node => {
      const r = node.el.getBoundingClientRect();
      node.x = r.left - fieldRect.left + r.width / 2;
      node.y = r.top - fieldRect.top + r.height / 2;
    });
  }
})();
