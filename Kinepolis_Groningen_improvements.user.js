// ==UserScript==
// @name         Kinepolis Groningen – vandaag, speelduur & scores
// @namespace    kinepolis-wgrn
// @version      1.6.1
// @description  Redirect naar "vandaag", verbergt smartbanner en reclameslider, kiest Kinepolis Groningen (WGRN) en toont per film speelduur + IMDb / Rotten Tomatoes / Metacritic.
// @match        https://kinepolis.nl/*
// @match        https://www.kinepolis.nl/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      www.omdbapi.com
// @connect      api.graphql.imdb.com
// @connect      www.imdb.com
// ==/UserScript==

(function () {
  'use strict';

  const CINEMA = 'WGRN';
  const CACHE_KEY = 'kx_cache_v3';   // nieuwe sleutel: "geen match"-resultaten van oudere versies worden genegeerd
  const TTL_HIT = 3 * 864e5;         // gevonden scores: 3 dagen
  const TTL_MISS = 1 * 864e5;        // niet gevonden: 1 dag, daarna opnieuw proberen
  const TTL_IMDB = 12 * 36e5;        // live IMDb-score: 12 uur (verandert bij nieuwe films snel)

  /* ---------- Debug-instelling (aan/uit via het Tampermonkey-menu) ---------- */
  const DEBUG = GM_getValue('debug', false) === true;
  GM_registerMenuCommand(
    DEBUG ? 'Debug-logging: AAN (klik om uit te zetten)' : 'Debug-logging: UIT (klik om aan te zetten)',
    () => { GM_setValue('debug', !DEBUG); location.reload(); }
  );

  // Verzamelt per tegel alle stappen en print ze aan het eind als één inklapbare groep,
  // zodat logregels van verschillende films niet door elkaar lopen.
  // Logregels worden platte tekst (makkelijk te kopiëren); DOM-elementen worden apart gelogd.
  function makeLog(label) {
    if (!DEBUG) return { add() {}, flush() {} };
    const lines = [];
    const elements = [];
    const t0 = performance.now();
    const str = v => {
      if (v instanceof Element) { elements.push(v); return `<${v.tagName.toLowerCase()}.${[...v.classList].join('.')}>`; }
      if (v instanceof Error) return `${v.name}: ${v.message}`;
      if (v && typeof v === 'object') { try { return JSON.stringify(v); } catch (_) { return String(v); } }
      return String(v);
    };
    return {
      add(...a) { lines.push(`+${Math.round(performance.now() - t0)}ms  ` + a.map(str).join(' ')); },
      flush(outcome) {
        console.groupCollapsed(`%c[kx]%c ${label} → ${outcome}`, 'color:#c79a00;font-weight:bold', 'font-weight:normal');
        console.log(`[kx] ${label} → ${outcome}\n` + lines.join('\n'));
        elements.forEach(el => console.log(el));
        console.groupEnd();
      },
    };
  }
  const NOLOG = { add() {}, flush() {} };

  /* ---------- 1. Redirect naar ?main_section=vandaag ---------- */
  const here = new URL(location.href);
  if (here.pathname.replace(/\/+$/, '') === '' && here.searchParams.get('main_section') !== 'vandaag') {
    here.searchParams.set('main_section', 'vandaag');
    location.replace(here.href);
    return;
  }

  /* ---------- 1b. Automatisch inloggen (één keer, met afkoelperiode tegen lussen) ---------- */
  const AUTO_LOGIN = GM_getValue('autoLogin', true) !== false;
  const LOGIN_COOLDOWN = 15 * 60e3;   // niet vaker dan eens per 15 minuten proberen
  GM_registerMenuCommand(
    AUTO_LOGIN ? 'Automatisch inloggen: AAN (klik om uit te zetten)' : 'Automatisch inloggen: UIT (klik om aan te zetten)',
    () => { GM_setValue('autoLogin', !AUTO_LOGIN); location.reload(); }
  );
  let loginChecked = false;
  function autoLogin() {
    if (loginChecked || !AUTO_LOGIN || window.top !== window.self) return;
    const btn = document.querySelector('#edit-openid-connect-client-kinepolis-login, #kinepolis-identity-server-login-form input[type="submit"]');
    if (!btn) {
      // knop (nog) niet gevonden: na het laden van de pagina concluderen we dat je al bent ingelogd
      if (document.readyState !== 'loading') loginChecked = true;
      return;
    }
    loginChecked = true;
    const last = GM_getValue('lastAutoLogin', 0);
    if (Date.now() - last < LOGIN_COOLDOWN) {
      if (DEBUG) console.log(`[kx] niet ingelogd, maar automatisch inloggen is ${Math.round((Date.now() - last) / 60e3)} min geleden al geprobeerd → overgeslagen`);
      return;
    }
    GM_setValue('lastAutoLogin', Date.now());
    if (DEBUG) console.log('[kx] niet ingelogd → Login-knop wordt aangeklikt');
    btn.click();   // via click() gaat de naam/waarde van de knop mee, zoals Drupal verwacht
  }
  document.addEventListener('DOMContentLoaded', autoLogin);

  /* ---------- 2. Smartbanner verbergen + stijl voor de info-balk ---------- */
  GM_addStyle(`
    div.smartbanner, .block-kinepolis-slider { display: none !important; }
    html.smartbanner-show, html.smartbanner-margin-top { margin-top: 0 !important; }

    .kx-info { display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
               margin: 6px 0; font: 600 13px/1.2 system-ui, -apple-system, Segoe UI, sans-serif; }
    .kx-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 7px;
               border-radius: 4px; background: #2b2b2b; color: #fff !important;
               text-decoration: none !important; white-space: nowrap; }
    .kx-dim  { opacity: .65; font-weight: 500; }
    .kx-imdb { background: #f5c518; color: #000 !important; }
    .kx-imdb.kx-low { background: #b9a14a; }
    .kx-rt.kx-fresh  { background: #2e7d32; }
    .kx-rt.kx-rotten { background: #8d2a1f; }
    .kx-mc.kx-hi  { background: #2e7d32; }
    .kx-mc.kx-mid { background: #b58900; }
    .kx-mc.kx-lo  { background: #8d2a1f; }
    .kx-setup { background: #555; cursor: pointer; }
  `);

  /* ---------- Opslag / cache ---------- */
  let cache = GM_getValue(CACHE_KEY, {});
  function centry(k) {
    const e = cache[k];
    if (!e) return undefined;
    if (Date.now() > e.exp) { delete cache[k]; return undefined; }
    return e;
  }
  function cset(k, v, ttl) {
    cache[k] = { v, exp: Date.now() + ttl };
    GM_setValue(CACHE_KEY, cache);
  }
  const getKey = () => (GM_getValue('omdbKey', '') || '').trim();
  function askKey() {
    const k = prompt(
      'OMDb API-sleutel (gratis aan te vragen op https://www.omdbapi.com/apikey.aspx):',
      getKey()
    );
    if (k !== null) {
      GM_setValue('omdbKey', k.trim());
      cache = {}; GM_setValue(CACHE_KEY, cache);
      location.reload();
    }
  }
  GM_registerMenuCommand('OMDb API-sleutel instellen', askKey);
  GM_registerMenuCommand('Score-cache legen', () => { cache = {}; GM_setValue(CACHE_KEY, cache); location.reload(); });

  /* ---------- Hulpfuncties ---------- */
  function limiter(n) {
    let active = 0; const q = [];
    const next = () => {
      if (active >= n || !q.length) return;
      active++;
      const { fn, res, rej } = q.shift();
      Promise.resolve().then(fn).then(res, rej).finally(() => { active--; next(); });
    };
    return fn => new Promise((res, rej) => { q.push({ fn, res, rej }); next(); });
  }
  const detailQ = limiter(3);
  const omdbQ = limiter(3);
  const inflight = new Map();

  function parseMinutes(text) {
    if (!text) return undefined;
    let m = text.match(/\b([1-4])\s*(?:u|uur|h)\s*([0-5]?\d)\s*(?:m|min|minuten)\b/i);
    if (m) return +m[1] * 60 + +m[2];
    m = text.match(/\b(\d{2,3})\s*(?:min(?:uten|\.)?|')(?![a-z])/i);
    if (m && +m[1] >= 40 && +m[1] <= 300) return +m[1];
    return undefined;
  }
  function isoMinutes(s) {
    const m = String(s).match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
    return m && (m[1] || m[2]) ? (+(m[1] || 0)) * 60 + +(m[2] || 0) : undefined;
  }
  const fmtMin = m => `${Math.floor(m / 60)}u ${String(m % 60).padStart(2, '0')}m`;

  function cleanTitle(t) {
    return (t || '')
      .replace(/\s+/g, ' ')
      .replace(/^(?:ladies at the movies|kids? matinee|voorpremi[eè]re|premi[eè]re|sneak preview|special)\s*[:\-–]\s*/i, '')
      .replace(/\((?:OV|NL|ENG?|VO|ST|2D|3D|IMAX|4DX|ScreenX|Dolby[^)]*|Laser[^)]*)\)/gi, '')
      .replace(/\b(?:2D|3D|IMAX|4DX|ScreenX|Dolby Atmos|Laser ULTRA)\b/gi, '')
      .replace(/\s+[-–]\s*(?:OV|NL)$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  function slugTitle(href) {
    if (!href) return null;
    // /movies/detail/35287/HO00007070/0/spider-man-brand-new-day  of  /films/<slug>
    const m = href.match(/\/movies\/detail\/(?:[^/]+\/){3}([^/?#]+)/i) || href.match(/\/films?\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]).replace(/[-_]+/g, ' ').replace(/\b\d{4,}\b$/, '').trim() : null;
  }
  const uniq = arr => [...new Map(arr.map(x => [x.toLowerCase(), x])).values()];

  // Zoekt in een document naar "Label: waarde"-paren (dt/dd, th/td, span+span, ...)
  function labelValue(doc, re) {
    const loose = new RegExp(re.source.replace(/\$$/, '').replace(/^\^/, '').replace(/\\s\*:\?$/, '') + '\\s*:\\s*(.+)$', 'i');
    for (const el of doc.querySelectorAll('dt, th, strong, b, span, div, li, p, h4, h5, label')) {
      const own = el.textContent.trim();
      if (own.length > 40) continue;
      if (re.test(own)) {
        const sib = el.nextElementSibling;
        if (sib && sib.textContent.trim()) return sib.textContent.trim();
        const rest = (el.parentElement?.textContent || '').replace(own, '').trim();
        if (rest && rest.length < 120) return rest;
      }
      const m = own.match(loose);
      if (m) return m[1].trim();
    }
    return undefined;
  }

  /* ---------- Filmpagina van Kinepolis uitlezen (duur, originele titel, jaar, IMDb-id) ---------- */
  async function fetchDetail(href, log = NOLOG) {
    const key = 'd:' + href;
    const c = centry(key);
    if (c) { log.add('filmpagina uit cache:', c.v); return c.v; }
    const info = {};
    try {
      log.add('filmpagina ophalen:', href);
      const r = await fetch(href, { credentials: 'same-origin' });
      log.add('filmpagina HTTP-status:', r.status);
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');

      const walk = o => {
        if (!o || typeof o !== 'object') return;
        if (Array.isArray(o)) return o.forEach(walk);
        if (o['@graph']) walk(o['@graph']);
        const types = [].concat(o['@type'] || []);
        if (types.includes('Movie')) {
          if (o.duration) info.minutes ??= isoMinutes(o.duration);
          if (o.name) info.name ??= o.name;
          if (o.alternateName) info.original ??= [].concat(o.alternateName)[0];
          const d = o.datePublished || o.dateCreated;
          if (d) info.year ??= parseInt(String(d).slice(0, 4), 10) || undefined;
          const tt = [].concat(o.sameAs || []).join(' ').match(/tt\d{7,}/);
          if (tt) info.imdbId ??= tt[0];
        }
      };
      const ld = doc.querySelectorAll('script[type="application/ld+json"]');
      log.add(`filmpagina: ${ld.length} JSON-LD-blok(ken)`);
      ld.forEach(s => { try { walk(JSON.parse(s.textContent)); } catch (_) { /* negeren */ } });

      const imdbA = doc.querySelector('a[href*="imdb.com/title/tt"]');
      if (imdbA) info.imdbId ??= imdbA.href.match(/tt\d+/)[0];

      const durTxt = labelValue(doc, /^(?:speelduur|duur|lengte|duration)\s*:?$/i);
      log.add('filmpagina: label "duur" →', durTxt);
      info.minutes ??= parseMinutes(durTxt) ?? parseMinutes(doc.body?.textContent.replace(/\s+/g, ' '));

      const orig = labelValue(doc, /^(?:originele titel|original title)\s*:?$/i);
      log.add('filmpagina: label "originele titel" →', orig);
      if (orig) info.original ??= orig;

      const rel = labelValue(doc, /^(?:release(?:datum)?|releasedatum|jaar|year)\s*:?$/i);
      log.add('filmpagina: label "release/jaar" →', rel);
      const y = rel && rel.match(/\b(19|20)\d{2}\b/);
      if (y) info.year ??= +y[0];

      log.add('filmpagina-info:', { ...info });
      cset(key, info, TTL_HIT);
    } catch (e) {
      log.add('filmpagina ophalen mislukt:', e);
      console.warn('[kx] filmpagina ophalen mislukt', href, e);
    }
    return info;
  }

  /* ---------- OMDb (IMDb, Rotten Tomatoes, Metacritic, runtime) ---------- */
  class KeyError extends Error {}
  function summarize(d) {
    if (!d) return 'geen/ongeldige JSON';
    if (d.Response !== 'True') return 'Error: ' + d.Error;
    if (d.Search) return d.Search.slice(0, 8).map(x => `${x.Title} (${x.Year}) ${x.imdbID}`);
    return `${d.Title} (${d.Year}) ${d.imdbID} · IMDb ${d.imdbRating} · ${d.Runtime}`;
  }
  function omdbRaw(params, log = NOLOG) {
    return omdbQ(() => new Promise((resolve, reject) => {
      const qs = new URLSearchParams({ apikey: getKey(), ...params });
      log.add('OMDb →', params);
      GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://www.omdbapi.com/?' + qs,
        responseType: 'json',
        timeout: 15000,
        onload: r => {
          let d = r.response;
          if (typeof d === 'string') { try { d = JSON.parse(d); } catch (_) { d = null; } }
          if (!d && r.responseText) { try { d = JSON.parse(r.responseText); } catch (_) { /* negeren */ } }
          log.add('OMDb ←', r.status, summarize(d));
          if (d && /api key/i.test(d.Error || '')) return reject(new KeyError(d.Error));
          if (d && /limit/i.test(d.Error || '')) return reject(new Error(d.Error));
          resolve(d);
        },
        onerror: e => { log.add('OMDb netwerkfout', e); reject(new Error('netwerkfout')); },
        ontimeout: () => { log.add('OMDb timeout'); reject(new Error('timeout')); },
      });
    }));
  }
  async function omdb(params, log) {
    const d = await omdbRaw(params, log);
    return d && d.Response === 'True' ? d : null;
  }
  async function findMovie(titles, year, imdbId, log = NOLOG) {
    if (imdbId) {
      log.add('zoeken op IMDb-id', imdbId);
      const r = await omdb({ i: imdbId }, log);
      if (r) return r;
    }
    const cur = new Date().getFullYear();
    const target = year || cur;
    // Jaar onbekend? Dan is het vrijwel altijd een film van dit of vorig jaar (of een voorpremière van volgend jaar).
    const years = year ? [year, year - 1, year + 1] : [cur, cur - 1, cur + 1];
    const dist = y => Math.abs((parseInt(y, 10) || 0) - target);
    const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    log.add(`zoeken op titel(s) ${JSON.stringify(titles)}, jaren ${years.join('/')}${year ? '' : ' (jaar onbekend → rond huidig jaar)'}`);

    for (const t of titles) {
      // 1. exacte titel + jaar
      for (const y of years) {
        const r = await omdb({ t, y, type: 'movie' }, log);
        if (r) return r;
      }
      // 2. zoeken; exacte titel-match met dichtstbijzijnde jaar gaat voor
      const s = await omdb({ s: t, type: 'movie' }, log);
      if (s?.Search?.length) {
        const best = s.Search
          .map(x => ({ x, d: dist(x.Year), exact: norm(x.Title) === norm(t) }))
          .sort((a, b) => (b.exact - a.exact) || (a.d - b.d))[0];
        if (best.d <= 2) {
          log.add(`gekozen uit zoekresultaten: ${best.x.Title} (${best.x.Year})`);
          return omdb({ i: best.x.imdbID }, log);
        }
        log.add(`zoekresultaten afgewezen: beste kandidaat ${best.x.Title} (${best.x.Year}) ligt > 2 jaar van ${target}`);
      }
    }
    // 3. laatste redmiddel: titel zonder jaar (bv. heruitgave van een klassieker).
    //    Bij onbekend jaar accepteren we dit; het jaar wordt dan zichtbaar in het IMDb-chipje.
    for (const t of titles) {
      const r = await omdb({ t, type: 'movie' }, log);
      if (r && (!year || dist(r.Year) <= 2)) {
        log.add(`laatste redmiddel: titel zonder jaar → ${r.Title} (${r.Year})`);
        return r;
      }
      if (r) log.add(`titel-match "${r.Title}" (${r.Year}) afgewezen: jaar past niet`);
    }
    return null;
  }
  function pick(r) {
    if (!r) return null;
    const rating = src => r.Ratings?.find(x => x.Source === src)?.Value;
    const num = v => (v && v !== 'N/A' ? v : undefined);
    return {
      id: r.imdbID,
      title: r.Title,
      year: r.Year,
      runtime: parseInt(r.Runtime, 10) || undefined,
      imdb: num(r.imdbRating),
      votes: num(r.imdbVotes),
      rt: rating('Rotten Tomatoes'),
      mc: num(r.Metascore),
    };
  }
  /* ---------- Live IMDb-score (OMDb loopt bij nieuwe films vaak dagen/weken achter) ---------- */
  function gmRequest(opts) {
    return new Promise((resolve, reject) => GM_xmlhttpRequest({
      timeout: 15000, ...opts,
      onload: resolve,
      onerror: () => reject(new Error('netwerkfout')),
      ontimeout: () => reject(new Error('timeout')),
    }));
  }
  async function imdbGraphQL(id, log) {
    const query = `query { title(id: "${id}") { ratingsSummary { aggregateRating voteCount } runtime { seconds } } }`;
    log.add('IMDb GraphQL →', id);
    const r = await gmRequest({
      method: 'POST',
      url: 'https://api.graphql.imdb.com/',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      data: JSON.stringify({ query }),
    });
    const d = JSON.parse(r.responseText || 'null');
    const t = d?.data?.title;
    log.add('IMDb GraphQL ←', r.status, t ?? (d?.errors ? d.errors.map(e => e.message).join('; ') : 'leeg antwoord'));
    if (!t) throw new Error('GraphQL zonder resultaat (status ' + r.status + ')');
    return {
      rating: t.ratingsSummary?.aggregateRating ?? undefined,
      votes: t.ratingsSummary?.voteCount ?? undefined,
      runtime: t.runtime?.seconds ? Math.round(t.runtime.seconds / 60) : undefined,
    };
  }
  async function imdbPage(id, log) {
    log.add('IMDb-pagina →', id);
    const r = await gmRequest({ method: 'GET', url: `https://www.imdb.com/title/${id}/`, headers: { 'Accept-Language': 'en-US,en;q=0.8' } });
    const doc = new DOMParser().parseFromString(r.responseText || '', 'text/html');
    let out = null;
    for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const j = JSON.parse(s.textContent);
        if (j.aggregateRating || j.duration) {
          out = {
            rating: j.aggregateRating?.ratingValue ?? undefined,
            votes: j.aggregateRating?.ratingCount ?? undefined,
            runtime: j.duration ? isoMinutes(j.duration) : undefined,
          };
          break;
        }
      } catch (_) { /* negeren */ }
    }
    log.add('IMDb-pagina ←', r.status, out ?? 'geen JSON-LD met score gevonden');
    if (!out) throw new Error('IMDb-pagina zonder score (status ' + r.status + ')');
    return out;
  }
  async function liveImdb(id, log = NOLOG) {
    const k = 'i:' + id;
    const c = centry(k);
    if (c) { log.add('live IMDb-score uit cache:', c.v); return c.v; }
    let v = null;
    for (const fn of [imdbGraphQL, imdbPage]) {
      try { v = await fn(id, log); break; } catch (e) { log.add('mislukt:', e); }
    }
    if (v) cset(k, v, TTL_IMDB);
    return v;
  }

  function lookup(titles, year, imdbId, log = NOLOG) {
    const k = 'm:' + (imdbId || titles.join('|').toLowerCase() + '|' + (year || ''));
    const c = centry(k);
    if (c) {
      log.add(`OMDb-resultaat uit cache (geldig tot ${new Date(c.exp).toLocaleString('nl-NL')}):`, c.v,
        c.v ? '' : '— "Score-cache legen" in het menu forceert een nieuwe zoekopdracht');
      return Promise.resolve(c.v);
    }
    if (inflight.has(k)) {
      log.add('wacht op een lopende zoekopdracht voor dezelfde film (details staan in die tegel)');
    } else {
      inflight.set(k, findMovie(titles, year, imdbId, log)
        .then(r => { const p = pick(r); cset(k, p, p ? TTL_HIT : TTL_MISS); return p; })
        .finally(() => inflight.delete(k)));
    }
    return inflight.get(k);
  }

  /* ---------- Weergave ---------- */
  function chip(text, cls, href, title) {
    const el = document.createElement(href ? 'a' : 'span');
    el.className = 'kx-chip ' + (cls || '');
    el.textContent = text;
    if (href) { el.href = href; el.target = '_blank'; el.rel = 'noopener'; }
    if (title) el.title = title;
    el.addEventListener('click', e => e.stopPropagation());
    return el;
  }
  function badgeAnchor(container) {
    const bar = container.querySelector('.title-bar-wrapper');
    if (bar) return bar;
    const t = container.querySelector('.movie-overview-title, h1, h2, h3, h4');
    if (!t) return null;
    const a = t.closest('a');
    return a && container.contains(a) ? a : t;
  }
  function ensureBadge(container) {
    let b = container.querySelector('.kx-info');
    if (b) return b;
    b = document.createElement('div');
    b.className = 'kx-info';
    const anchor = badgeAnchor(container);
    if (anchor && anchor !== container) anchor.insertAdjacentElement('afterend', b);
    else container.appendChild(b);
    return b;
  }
  function render(badge, minutes, m, state) {
    badge.replaceChildren();
    if (minutes) badge.append(chip('⏱ ' + fmtMin(minutes)));
    if (state === 'loading') badge.append(chip('scores laden…', 'kx-dim'));
    else if (state === 'nokey') {
      const s = chip('⚙ OMDb-sleutel instellen voor scores', 'kx-setup');
      s.addEventListener('click', e => { e.preventDefault(); askKey(); });
      badge.append(s);
    } else if (state === 'badkey') badge.append(chip('OMDb-sleutel ongeldig', 'kx-setup'));
    else if (state === 'error') badge.append(chip('scores niet beschikbaar', 'kx-dim'));
    else if (!m) badge.append(chip('geen scores gevonden', 'kx-dim', null, DEBUG ? 'Zie de console (F12) voor details' : undefined));
    else {
      const tip = `${m.title} (${m.year})`;
      // Oudere film (heruitgave of mogelijk verkeerde match)? Toon het jaar erbij.
      const old = parseInt(m.year, 10) < new Date().getFullYear() - 1 ? ` (${parseInt(m.year, 10)})` : '';
      if (m.imdb) {
        const v = parseFloat(m.imdb);
        badge.append(chip(`IMDb ${m.imdb}${old}${m.votes ? ' · ' + shortVotes(m.votes) : ''}`,
          'kx-imdb' + (v < 6.5 ? ' kx-low' : ''), `https://www.imdb.com/title/${m.id}/`,
          tip + (m.live ? ' – score live van IMDb' : ' – score via OMDb (kan achterlopen)')));
      } else {
        badge.append(chip(`IMDb –${old}`, 'kx-imdb kx-low', `https://www.imdb.com/title/${m.id}/`, tip + ' – nog geen IMDb-score'));
      }
      if (m.rt) {
        const v = parseInt(m.rt, 10);
        badge.append(chip(`🍅 ${m.rt}`, 'kx-rt ' + (v >= 60 ? 'kx-fresh' : 'kx-rotten'), null, 'Rotten Tomatoes – ' + tip));
      }
      if (m.mc) {
        const v = +m.mc;
        badge.append(chip(`MC ${m.mc}`, 'kx-mc ' + (v >= 61 ? 'kx-hi' : v >= 40 ? 'kx-mid' : 'kx-lo'), null, 'Metacritic – ' + tip));
      }
    }
  }
  function shortVotes(v) {
    const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
    if (!n) return v;
    return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
  }

  /* ---------- Per film ---------- */
  // Titelbronnen in volgorde van betrouwbaarheid (gebaseerd op de echte Kinepolis-HTML)
  const TITLE_SOURCES = [
    ['.movie-overview-title', el => el.textContent],
    ['[data-title]', el => el.getAttribute('data-title')],
    ['.movie-container-image img[alt]', el => el.getAttribute('alt')],
    ['h1, h2, h3, h4', el => el.textContent],
  ];
  function getTitle(container) {
    for (const [sel, get] of TITLE_SOURCES) {
      const el = container.querySelector(sel);
      const t = el && (get(el) || '').replace(/\s+/g, ' ').trim();
      if (t && t.length < 120) return { title: t, source: sel };
    }
    return { title: '', source: null };
  }
  function textWithoutBadge(container) {
    const clone = container.cloneNode(true);
    clone.querySelectorAll('.kx-info, svg').forEach(n => n.remove());
    return clone.textContent.replace(/\s+/g, ' ');
  }

  const pending = new WeakSet();
  async function enrich(container) {
    pending.add(container);
    const { title: rawTitle, source: titleSource } = getTitle(container);
    const log = makeLog(rawTitle || '(titel onbekend)');
    let outcome = '?';
    try {
      log.add('tegel:', container);
      const link = container.querySelector('a[href*="/movies/detail/"], a[href*="/film"]') ||
                   container.querySelector('a[href]:not(.megatix-click-handler)');
      const href = link ? new URL(link.getAttribute('href'), location.href).href : null;
      const title = cleanTitle(rawTitle);
      log.add(`titel "${rawTitle}" (bron: ${titleSource}) → opgeschoond "${title}"`);
      log.add('filmlink:', href);

      let minutes = parseMinutes(textWithoutBadge(container));
      log.add('speelduur in tegel:', minutes ?? 'niet gevonden');

      const badge = ensureBadge(container);
      render(badge, minutes, null, 'loading');

      let detail = {};
      if (href && href.startsWith(location.origin) && href !== location.href) {
        detail = await detailQ(() => fetchDetail(href, log));
      }
      if (minutes == null && detail.minutes) log.add('speelduur van filmpagina:', detail.minutes);
      minutes ??= detail.minutes;

      if (!getKey()) { render(badge, minutes, null, 'nokey'); outcome = 'geen OMDb-sleutel'; return; }
      render(badge, minutes, null, 'loading');

      const titles = uniq([detail.original, title, detail.name, slugTitle(href)]
        .filter(Boolean).map(cleanTitle).filter(Boolean));
      if (!titles.length && !detail.imdbId) { render(badge, minutes, null); outcome = 'geen titel om op te zoeken'; return; }

      let m;
      try {
        m = await lookup(titles, detail.year, detail.imdbId, log);
      } catch (e) {
        render(badge, minutes, null, e instanceof KeyError ? 'badkey' : 'error');
        outcome = 'fout: ' + e.message;
        console.warn('[kx] OMDb', e);
        return;
      }
      if (m?.id) {
        log.add(`OMDb-match: ${m.title} (${m.year}) ${m.id} · OMDb-score ${m.imdb ?? 'N/A'}`);
        const live = await liveImdb(m.id, log);
        if (live?.rating != null) {
          m = { ...m, imdb: Number(live.rating).toFixed(1), votes: live.votes != null ? String(live.votes) : m.votes, live: true };
        }
        if (minutes == null && live?.runtime) { minutes = live.runtime; log.add('speelduur van IMDb:', minutes); }
      }
      if (minutes == null && m?.runtime) log.add('speelduur van OMDb:', m.runtime);
      minutes ??= m?.runtime;
      // badge kan intussen door de site vervangen zijn
      render(container.contains(badge) ? badge : ensureBadge(container), minutes, m);
      outcome = m
        ? `${m.title} (${m.year}) · IMDb ${m.imdb ?? '–'}${m.rt ? ' · RT ' + m.rt : ''}${m.mc ? ' · MC ' + m.mc : ''}${minutes ? ' · ' + fmtMin(minutes) : ''}`
        : 'geen match';
    } catch (e) {
      outcome = 'onverwachte fout: ' + e.message;
      log.add(e);
    } finally {
      pending.delete(container);
      log.flush(outcome);
    }
  }

  /* ---------- 3. Bioscoop WGRN kiezen ---------- */
  // Het is één <select id="cinema_filters">, opgemaakt met de jQuery-plugin SumoSelect.
  //  - mobiel: SumoSelect gebruikt de native select → waarde zetten + change-event werkt
  //  - desktop: SumoSelect tekent een eigen lijst (.optWrapper li.opt) en verstopt de select;
  //    de site koppelt haar change-handler pas na het laden en zet de waarde dan soms terug.
  // Daarom: wachten tot de pagina klaar is, kiezen zoals een gebruiker dat zou doen, en een paar
  // seconden controleren of de keuze blijft staan. Zodra jij zelf iets kiest, stopt het script.
  const clog = (...a) => { if (DEBUG) console.log('[kx] bioscoop:', ...a); };
  let userPickedCinema = false;
  const isCinemaUI = t => t instanceof Element &&
    !!(t.closest('.cinema-filter') || t.closest('.SumoSelect')?.querySelector('#cinema_filters'));
  ['click', 'keydown', 'change'].forEach(type => document.addEventListener(type, e => {
    if (e.isTrusted && !userPickedCinema && isCinemaUI(e.target)) {
      userPickedCinema = true;
      clog(`je bediende zelf de bioscoopkeuze (${type}); het script laat hem nu met rust`);
    }
  }, true));

  const cinemaSelect = () => document.querySelector('select#cinema_filters') ||
    document.querySelector(`select option[value="${CINEMA}"]`)?.closest('select');
  const caption = sel => sel.closest('.SumoSelect')?.querySelector('.CaptionCont')?.textContent.trim();
  const cinemaOk = sel => sel.value === CINEMA &&
    (!sel.closest('.SumoSelect') || /groningen/i.test(caption(sel) || ''));

  function applyCinema(sel) {
    const idx = [...sel.options].findIndex(o => o.value === CINEMA);
    if (idx < 0) return 'optie WGRN niet gevonden';
    const wrap = sel.closest('.SumoSelect');

    // 1. SumoSelect-API (alleen bereikbaar als het script in de paginacontext draait, of via Firefox' wrappedJSObject)
    try {
      const sumo = (sel.wrappedJSObject || sel).sumo;
      if (sumo && typeof sumo.selectItem === 'function') { sumo.selectItem(CINEMA); return 'SumoSelect-API'; }
    } catch (_) { /* niet bereikbaar → volgende methode */ }

    // 2. Desktop: de SumoSelect-lijst aanklikken, zoals een gebruiker
    const li = wrap?.querySelectorAll('.optWrapper li.opt')[idx];
    if (li) {
      wrap.querySelector('.CaptionCont')?.click();   // lijst openen
      li.click();                                    // Groningen kiezen
      if (wrap.classList.contains('open')) wrap.querySelector('.CaptionCont')?.click();
      if (sel.value === CINEMA) return 'klik in SumoSelect-lijst';
    }

    // 3. Mobiel / geen plugin: native waarde + change-event (jQuery-handlers reageren hier ook op)
    sel.selectedIndex = idx;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return 'native change-event';
  }

  let cinemaStarted = false;
  function startCinema() {
    if (cinemaStarted) return;
    cinemaStarted = true;
    const deadline = Date.now() + 10000;   // 10 s bewaken of de keuze blijft staan
    let attempts = 0;
    const iv = setInterval(() => {
      if (userPickedCinema || Date.now() > deadline) {
        clearInterval(iv);
        const sel = cinemaSelect();
        if (!userPickedCinema) clog(sel ? `klaar; waarde=${sel.value}, getoond="${caption(sel) ?? '–'}"` : 'geen bioscoopkeuze gevonden op deze pagina');
        return;
      }
      const sel = cinemaSelect();
      if (!sel || cinemaOk(sel)) return;
      if (attempts >= 3) return;          // niet blijven vechten met de site
      attempts++;
      const how = applyCinema(sel);
      clog(`poging ${attempts} via ${how} → waarde=${sel.value}, getoond="${caption(sel) ?? '–'}"`);
    }, 700);
  }
  // pas starten als alle scripts van de site gedraaid hebben (handlers gekoppeld, SumoSelect geïnitialiseerd)
  if (document.readyState === 'complete') setTimeout(startCinema, 300);
  else window.addEventListener('load', () => setTimeout(startCinema, 300));

  /* ---------- 4. Alles aan elkaar ---------- */
  function tick() {
    autoLogin();
    document.querySelectorAll('.movie-container-wrapper-full').forEach(c => {
      if (!pending.has(c) && !c.querySelector('.kx-info')) enrich(c);
    });
  }
  let timer = null;
  new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; tick(); }, 150);
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', tick);
  if (DEBUG) console.log('[kx] userscript actief, debug-logging AAN');
})();
