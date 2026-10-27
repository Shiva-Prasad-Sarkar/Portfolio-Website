/*!
 * pirate.js — The Lost Developer's World.
 *
 *  • Hash router.     #<destination>  or  #<destination>/<item>   (e.g. #treasure-islands/hirelocal)
 *                     Plain hash links => refresh, back/forward and deep links work on any static host,
 *                     including under the GitHub Pages sub-path. Old Batman anchors (#projects …) are mapped.
 *  • Chapters.        Rendered from PirateData (parsed from batman.html) with textContent only.
 *  • Atmosphere.      Intro, parallax, ship on the dotted route, optional procedural ocean audio.
 *                     Everything respects prefers-reduced-motion (and the in-page "Still waters" switch).
 */
(function () {
  'use strict';

  var U = window.SPSUniverse;
  var PD = window.PirateData;
  var html = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TITLE = 'The Lost Developer’s World';

  /* ---------------------------------------------------------------- tiny helpers */
  function store(key, val) {
    try {
      if (val === undefined) return window.sessionStorage.getItem('spsPirate:' + key);
      window.sessionStorage.setItem('spsPirate:' + key, val);
    } catch (e) { /* storage blocked */ }
    return null;
  }
  function calm() { return mqReduce.matches || html.getAttribute('data-calm') === '1'; }

  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { append(el, x); });
    else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function ext(a) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); return a; }
  function link(label, href, cls, external) {
    var a = h('a', { class: cls || 'btn', href: href }, label);
    return external ? ext(a) : a;
  }
  function picture(info, alt) {
    if (!info) return null;
    var img = h('img', { src: info.thumb, alt: alt != null ? alt : info.alt, loading: 'lazy', decoding: 'async' });
    if (info.thumb !== info.full) {                  // no thumbnail generated yet -> fall back to the original
      img.addEventListener('error', function once() { img.removeEventListener('error', once); img.src = info.full; });
    }
    return img;
  }
  function chips(list) { return list && list.length ? h('ul', { class: 'chips', 'aria-label': 'Technology' }, list.map(function (t) { return h('li', null, t); })) : null; }
  function reveal(el) { el.classList.add('reveal'); return el; }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* ---------------------------------------------------------------- destinations */
  var DEST = [
    { slug: 'captains-log', roman: 'I', name: 'Captain’s Log', sub: 'About me', render: renderLog },
    { slug: 'arsenal', roman: 'II', name: 'The Arsenal', sub: 'Programming languages, frameworks & tools', render: renderArsenal },
    { slug: 'arena', roman: 'III', name: 'The Challenge Arena', sub: 'Competitive programming & problem solving', render: renderArena },
    { slug: 'treasure-islands', roman: 'IV', name: 'Treasure Islands', sub: 'Software & hardware projects', render: renderProjects, list: 'projects', detail: true, noun: 'Expedition record' },
    { slug: 'game-seas', roman: 'V', name: 'The Game Seas', sub: 'Games', render: renderGames, list: 'games', detail: true, noun: 'Game log' },
    { slug: 'hall-of-honors', roman: 'VI', name: 'The Hall of Honors', sub: 'Achievements & certificates', render: renderCerts, list: 'certificates', detail: true, noun: 'Certificate' },
    { slug: 'research-guild', roman: 'VII', name: 'The Research Guild', sub: 'Research, case studies & academic work', render: renderResearch },
    { slug: 'storytellers-cove', roman: 'VIII', name: 'The Storyteller’s Cove', sub: 'Blogs & articles', render: renderBlogs },
    { slug: 'broadcast', roman: 'IX', name: 'The Ship’s Broadcast', sub: 'Videos & YouTube playlists', render: renderVideos },
    { slug: 'dossier', roman: 'X', name: 'The Captain’s Dossier', sub: 'CV & professional profile', render: renderDossier },
    { slug: 'message', roman: 'XI', name: 'Send a Message', sub: 'Contact information & message', render: renderMessage }
  ];
  var BY = {};
  DEST.forEach(function (d, i) { d.index = i; BY[d.slug] = d; });

  /* ---------------------------------------------------------------- data */
  var data = null;
  function loadData() { return PD.load().then(function (d) { data = d; hydrate(d); return d; }); }
  var dataPromise = loadData();                       // replaced by "Retry" after a failure

  // Take live URLs from the portfolio data instead of repeating them in the markup.
  function hydrate(d) {
    var cv = $('#hud-cv');
    if (cv && d.cv.download) { cv.href = d.cv.download.href; ext(cv); cv.setAttribute('aria-label', 'Download CV (opens in a new tab)'); }
    var pro = d.contact.groups.filter(function (g) { return g.title === 'Professional'; })[0];
    if (pro) pro.links.forEach(function (l) {
      var a = $(l.name === 'GitHub' ? '#quick-github' : l.name === 'LinkedIn' ? '#quick-linkedin' : null);
      if (a) a.href = l.href;
    });
  }

  /* ================================================================ CHAPTER RENDERERS */
  var ARSENAL_TITLES = { 'Web Tech & Database Arsenal': 'Web Technologies & Databases', 'Bat-Cave Tools': 'Software & Tools' };

  function renderLog(d) {
    var p = d.profile;
    var info = {};
    d.contact.info.forEach(function (i) { info[i.label] = i.value; });
    var links = [];
    p.links.forEach(function (l) { links.push(link(l.label === 'CV' ? 'Download CV' : l.label, l.href, l.label === 'CV' ? 'btn gold' : 'btn', true)); });
    return h('div', { class: 'log' },
      reveal(h('figure', { class: 'portrait' }, picture(p.avatar, 'Portrait of ' + p.name), h('figcaption', null, p.name))),
      reveal(h('div', { class: 'log-text' },
        h('p', { class: 'lead dropcap' }, 'Ahoy, traveller. I’m ', h('strong', null, p.name), ', a Computer Science and Engineering undergraduate at ',
          info.University || 'BRAC University', info.Location ? ' in ' + info.Location : '',
          '. This chart maps everything I’ve built, solved, studied and written so far — every island is a real project, game, certificate, study or post.'),
        h('p', null, 'Pick a destination on the map, or follow the dotted route from the very first entry.'),
        h('dl', { class: 'stats' }, p.stats.map(function (s) { return h('div', null, h('dt', null, s.value), h('dd', null, s.label)); })),
        h('h3', { class: 'rule' }, 'Ship’s papers'),
        h('ul', { class: 'papers' }, d.cv.highlights.map(function (t) { return h('li', null, t); })),
        h('div', { class: 'actions' }, links)
      )));
  }

  function renderArsenal(d) {
    return h('div', { class: 'shelf' }, d.skills.map(function (g) {
      return reveal(h('section', null,
        h('h3', { class: 'rule' }, ARSENAL_TITLES[g.title] || g.title),
        h('ul', { class: 'tablets' }, g.items.map(function (n) { return h('li', null, n); }))));
    }));
  }

  function renderArena(d) {
    var solved = d.profile.stats.filter(function (s) { return /problem/i.test(s.label); })[0];
    return h('div', { class: 'shelf' },
      reveal(h('p', { class: 'lead' }, solved ? solved.value + ' problems solved across the platforms below. ' : '', 'Follow me into the arena:')),
      reveal(h('div', { class: 'platforms' }, d.arena.platforms.map(function (p) { return link(p.name, p.href, 'btn', true); }))),
      reveal(h('div', { class: 'slates' }, d.arena.stats.map(function (s) {
        return h('a', { class: 'slate', href: s.href, target: '_blank', rel: 'noopener noreferrer', 'aria-label': s.alt + ' (opens in a new tab)' },
          h('img', { src: s.src, alt: s.alt, loading: 'lazy', decoding: 'async' }));
      }))));
  }

  /* ---- generic entry card ---- */
  function entryCard(it, i, dest, o) {
    o = o || {};
    var href = '#' + dest.slug + '/' + it.slug;
    var stamp = h('span', { class: 'stamp', 'aria-hidden': 'true' }, '№ ' + pad(i + 1));
    var thumb = null;
    if (it.image && !o.compact) {
      thumb = dest.detail
        ? h('a', { class: 'entry-thumb' + (o.contain ? ' contain' : ''), href: href, 'aria-hidden': 'true', tabindex: '-1' }, picture(it.image, ''), stamp)
        : h('div', { class: 'entry-thumb' + (o.contain ? ' contain' : '') }, picture(it.image), stamp);
    }
    var title = dest.detail ? h('a', { href: href }, it.title) : it.title;
    var actions = it.links.map(function (l, n) {
      return link(l.label, l.href, l.kind === 'live' ? 'btn gold' : n === 0 ? 'btn' : 'btn alt', l.newTab);
    });
    if (dest.detail) actions.push(link('Details', href, 'btn alt'));
    return reveal(h('article', { class: 'entry' + (o.compact ? ' compact' : ''), 'data-hardware': it.hardware ? '1' : '0' },
      o.source ? h('div', { class: 'source' }, picture(it.image, ''), o.source) : null,
      thumb,
      h('div', { class: 'entry-body' },
        h('h3', { class: 'entry-title' }, title),
        h('p', { class: 'entry-desc' }, it.desc),
        o.tech === false ? null : chips(it.tech),
        h('div', { class: 'entry-actions' }, actions))));
  }

  function renderProjects(d, dest) {
    var items = d.projects;
    var hw = items.filter(function (p) { return p.hardware; }).length;
    var grid = h('div', { class: 'grid' }, items.map(function (it, i) { return entryCard(it, i, dest); }));
    var note = h('p', { class: 'count-note', 'aria-live': 'polite' });
    var buttons = [];
    function setFilter(kind) {
      var shown = 0;
      $$('.entry', grid).forEach(function (card) {
        var isHw = card.getAttribute('data-hardware') === '1';
        var ok = kind === 'all' || (kind === 'hardware' ? isHw : !isHw);
        card.hidden = !ok;
        if (ok) shown++;
      });
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-kind') === kind ? 'true' : 'false'); });
      note.textContent = 'Showing ' + shown + ' of ' + items.length + ' islands';
    }
    [['all', 'All', items.length], ['software', 'Software', items.length - hw], ['hardware', 'Hardware & electronics', hw]].forEach(function (f) {
      var b = h('button', { type: 'button', class: 'filter', 'data-kind': f[0], 'aria-pressed': 'false' }, f[1], h('small', null, '(' + f[2] + ')'));
      b.addEventListener('click', function () { setFilter(f[0]); });
      buttons.push(b);
    });
    setFilter('all');
    return h('div', { class: 'shelf' },
      reveal(h('p', { class: 'lead' }, 'Every project I’ve built, software and hardware alike. Open an island for the full expedition record — description, technology, source code and live demo where one exists.')),
      h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter projects' }, buttons, note),
      grid);
  }
  function renderGames(d, dest) {
    return h('div', { class: 'shelf' },
      reveal(h('p', { class: 'lead' }, 'Games built along the way — mostly Python and OpenGL.')),
      h('div', { class: 'grid' }, d.games.map(function (it, i) { return entryCard(it, i, dest); })));
  }
  function renderCerts(d, dest) {
    return h('div', { class: 'shelf' },
      reveal(h('p', { class: 'lead' }, 'Certificates and course achievements. Open one for a larger view and the link to the original.')),
      h('div', { class: 'grid' }, d.certificates.map(function (it, i) { return entryCard(it, i, dest, { contain: true, tech: false }); })));
  }
  function renderResearch(d) {
    return h('div', { class: 'shelf' },
      reveal(h('p', { class: 'lead' }, 'Case studies and analytical write-ups. Each opens the full document in a new tab.')),
      h('div', { class: 'grid' }, d.research.map(function (it, i) {
        var card = entryCard(it, i, { slug: 'research-guild' }, { compact: true, tech: false });
        card.querySelector('.entry-body').insertBefore(h('p', { class: 'eyebrow' }, 'Journal entry ' + ['I', 'II', 'III', 'IV', 'V', 'VI'][i]), card.querySelector('.entry-title'));
        return card;
      })));
  }
  function renderBlogs(d) {
    return h('div', { class: 'shelf' },
      reveal(h('p', { class: 'lead' }, 'Articles from my blog — on cryptography, Arduino, robotics and more.')),
      h('div', { class: 'grid' }, d.blogs.map(function (it, i) { return entryCard(it, i, { slug: 'storytellers-cove' }, { compact: true, tech: false, source: 'Blog post' }); })));
  }
  function renderVideos(d) {
    var yt = d.profile.links.filter(function (l) { return l.kind === 'youtube'; })[0];
    return h('div', { class: 'shelf' },
      reveal(h('p', { class: 'lead' }, 'Tutorials and project walk-throughs, grouped into playlists.')),
      h('div', { class: 'grid' }, d.videos.map(function (it, i) { return entryCard(it, i, { slug: 'broadcast' }, { tech: false }); })),
      yt ? h('div', { class: 'actions' }, link('Visit the YouTube channel', yt.href, 'btn gold', true)) : null);
  }

  function renderDossier(d) {
    var alt = d.contact.info.filter(function (i) { return /second copy/i.test(i.label); })[0];
    var pro = d.contact.groups.filter(function (g) { return g.title === 'Professional'; })[0];
    var dl = d.cv.download;
    return h('div', { class: 'dossier' },
      reveal(h('div', null,
        h('p', { class: 'lead' }, d.cv.about),
        h('h3', { class: 'rule' }, 'At a glance'),
        h('ul', { class: 'papers' }, d.cv.highlights.map(function (t) { return h('li', null, t); })),
        pro ? h('div', { class: 'actions' }, pro.links.map(function (l) { return link(l.name, l.href, 'btn alt', true); })) : null)),
      reveal(h('div', { class: 'seal-card' },
        h('div', { class: 'wax', 'aria-hidden': 'true' }, 'CV'),
        h('h3', null, 'Download the CV'),
        h('p', null, 'The complete professional profile, hosted on Google Drive.'),
        dl ? link('Download CV', dl.href, 'btn gold', true) : null,
        alt && alt.href ? link('Second copy', alt.href, 'btn alt', true) : null)));
  }

  function renderMessage(d) {
    var email = d.contact.email;
    var note = h('p', { class: 'form-note', role: 'status', 'aria-live': 'polite' });
    function field(id, label, type) {
      var control = type === 'textarea' ? h('textarea', { id: 'f-' + id, name: id, rows: '6', required: true }) : h('input', { id: 'f-' + id, name: id, type: type, required: true, autocomplete: id === 'name' ? 'name' : 'email' });
      return h('div', { class: 'field' }, h('label', { for: 'f-' + id }, label), control);
    }
    var form = h('form', { class: 'form', 'aria-label': 'Contact form' },
      field('name', 'Your name', 'text'), field('email', 'Your email', 'email'), field('message', 'Message', 'textarea'),
      h('div', { class: 'actions' },
        h('button', { type: 'submit', class: 'btn gold' }, 'Write the message'),
        email ? link('Email directly', 'mailto:' + email, 'btn alt') : null),
      note);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      var body = f.message.value.trim() + '\n\n— ' + f.name.value.trim() + ' (' + f.email.value.trim() + ')';
      note.textContent = 'Opening your email app with the message ready to send… (nothing is sent from this page; if no app opens, write to ' + email + ').';
      window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Message from ' + f.name.value.trim() + ' via your portfolio') + '&body=' + encodeURIComponent(body);
    });
    return h('div', { class: 'contact' },
      reveal(h('div', null, h('h3', { class: 'rule' }, 'Write to me'), form)),
      reveal(h('div', { class: 'shelf' },
        h('h3', { class: 'rule' }, 'Find me elsewhere'),
        d.contact.groups.map(function (g) {
          return h('div', null, h('p', { class: 'eyebrow' }, g.title), h('div', { class: 'pills' }, g.links.map(function (l) { return ext(h('a', { class: 'pill', href: l.href }, l.name)); })));
        }),
        h('dl', { class: 'facts' }, d.contact.info.map(function (i) {
          var v = i.href ? ext(h('a', { href: i.href }, i.value)) : /@/.test(i.value) ? h('a', { href: 'mailto:' + i.value }, i.value) : i.value;
          return h('div', null, h('dt', null, i.label), h('dd', null, v));
        })))));
  }

  /* ---- project / game / certificate detail ("expedition record") ---- */
  function renderRecord(dest, d, slug) {
    var list = d[dest.list];
    var idx = -1;
    list.forEach(function (it, i) { if (it.slug === slug) idx = i; });
    var back = h('a', { class: 'back btn alt', href: '#' + dest.slug }, '← Back to ' + dest.name);
    if (idx < 0) return h('div', { class: 'record' }, h('p', { class: 'error-note' }, 'That record isn’t on the chart.'), back);
    var it = list[idx];
    var prev = list[(idx + list.length - 1) % list.length], next = list[(idx + 1) % list.length];
    var img = picture(it.image);
    if (img && it.image.full !== it.image.thumb) {                 // swap to the full-resolution picture once it has loaded
      var big = new Image();
      big.onload = function () { img.src = it.image.full; };
      big.src = it.image.full;
    }
    return h('div', { class: 'record' },
      back,
      h('div', null, h('p', { class: 'eyebrow' }, dest.noun + ' № ' + pad(idx + 1)),
        h('h3', { id: 'record-title', class: 'record-title', tabindex: '-1' }, it.title)),
      h('div', { class: 'record-grid' },
        img ? h('figure', { class: 'record-figure' }, img) : null,
        h('div', { class: 'record-text' },
          h('p', { class: 'lead' }, it.desc),
          it.tech.length ? h('dl', null, h('div', null, h('dt', null, 'Technology'), h('dd', null, chips(it.tech)))) : null,
          h('div', { class: 'actions' }, it.links.map(function (l, n) { return link(l.label, l.href, l.kind === 'live' ? 'btn gold' : n === 0 ? 'btn' : 'btn alt', l.newTab); })))),
      h('nav', { class: 'record-nav', 'aria-label': 'Other records' },
        link('← ' + prev.title, '#' + dest.slug + '/' + prev.slug, 'btn alt'),
        link(next.title + ' →', '#' + dest.slug + '/' + next.slug, 'btn alt')));
  }

  /* ================================================================ JOURNAL (chapter overlay) */
  var stage = $('#stage'), journal = $('#journal');
  var page, head, body, pagerLinks, toolPrev, toolNext, footPrev, footNext, eyebrowEl, titleEl, subEl;
  var isOpen = false, closeTimer = 0, lastFocus = null, renderToken = 0, io = null;
  var current = { dest: '', item: '' };
  var origin = null;

  function buildJournal() {
    if (page) return;
    var pager = h('ol', { class: 'pager', 'aria-label': 'Destinations' }, DEST.map(function (d) {
      return h('li', null, h('a', { href: '#' + d.slug, 'aria-label': d.name, title: d.name }, d.roman));
    }));
    eyebrowEl = h('p', { class: 'eyebrow' });
    titleEl = h('h2', { id: 'chapter-title', tabindex: '-1' });
    subEl = h('p', { class: 'page-sub' });
    toolPrev = h('a', { class: 'tool', href: '#', 'aria-label': 'Previous destination' }, '‹');
    toolNext = h('a', { class: 'tool', href: '#', 'aria-label': 'Next destination' }, '›');
    var close = h('button', { type: 'button', class: 'tool close', 'aria-label': 'Back to the map', title: 'Back to the map (Esc)' }, '✕');
    close.addEventListener('click', goMap);
    head = h('header', { class: 'page-head' }, h('div', null, eyebrowEl, titleEl, subEl), h('div', { class: 'page-tools' }, toolPrev, toolNext, close), pager);
    body = h('div', { class: 'page-body' });
    footPrev = h('a', { class: 'btn alt', href: '#' });
    footNext = h('a', { class: 'btn alt', href: '#' });
    var foot = h('footer', { class: 'page-foot' }, footPrev, h('button', { type: 'button', class: 'btn alt', onclick: goMap }, 'Back to the map'), footNext);
    page = h('article', { class: 'page', 'aria-labelledby': 'chapter-title' }, head, body, foot);
    pagerLinks = $$('a', pager);
    var scrim = h('div', { class: 'journal-scrim' });
    scrim.addEventListener('click', goMap);
    journal.appendChild(scrim);
    journal.appendChild(page);
  }

  function parseHash() {
    var raw = window.location.hash.replace(/^#/, '');
    try { raw = decodeURIComponent(raw); } catch (e) { /* keep raw */ }
    var parts = raw.split('/');
    var key = parts[0];
    var legacy = Object.prototype.hasOwnProperty.call(U.legacy, key);
    if (legacy) key = U.legacy[key];
    return { dest: BY[key] ? key : '', item: BY[key] ? (parts[1] || '') : '', legacy: legacy };
  }

  function route() {
    var r = parseHash();
    if (r.legacy && r.dest) {                         // tidy an old #projects style URL into the canonical one
      try { window.history.replaceState(null, '', window.location.pathname + window.location.search + '#' + r.dest); } catch (e) { /* ignore */ }
    }
    if (!r.dest) { closeJournal(); return; }
    if (isOpen && r.dest === current.dest && r.item === current.item) return;
    openChapter(r.dest, r.item);
  }

  function goMap() {
    if (window.location.hash) {
      try { window.history.pushState(null, '', window.location.pathname + window.location.search); } catch (e) { window.location.hash = ''; }
    }
    route();
  }

  function setOrigin(px, py) {
    var r = page.getBoundingClientRect();
    var x = px == null ? r.width / 2 : px - r.left, y = py == null ? r.height * .4 : py - r.top;
    page.style.setProperty('--ox', Math.max(0, Math.min(100, x / r.width * 100)) + '%');
    page.style.setProperty('--oy', Math.max(0, Math.min(100, y / r.height * 100)) + '%');
  }

  function openChapter(slug, item) {
    buildJournal();
    var dest = BY[slug];
    var wasOpen = isOpen;
    current = { dest: slug, item: item };
    window.clearTimeout(closeTimer);
    closeDrawer();
    if (!wasOpen) {
      lastFocus = document.activeElement;
      isOpen = true;
      journal.hidden = false;
      journal.classList.remove('closing');
      stage.inert = true;
      html.classList.add('chapter-open');
      mapMotion(false);
      setOrigin(origin && origin.x, origin && origin.y);
      origin = null;
      void journal.offsetWidth;                         // commit the closed state so the open transition runs
      window.requestAnimationFrame(function () { journal.classList.add('open'); });
    }
    // chrome
    eyebrowEl.textContent = 'Chapter ' + dest.roman + ' of XI';
    titleEl.textContent = dest.name;
    subEl.textContent = dest.sub;
    pagerLinks.forEach(function (a, i) { if (i === dest.index) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var prev = DEST[(dest.index + DEST.length - 1) % DEST.length], next = DEST[(dest.index + 1) % DEST.length];
    [toolPrev, footPrev].forEach(function (a) { a.href = '#' + prev.slug; });
    [toolNext, footNext].forEach(function (a) { a.href = '#' + next.slug; });
    footPrev.textContent = '← ' + prev.name;
    footNext.textContent = next.name + ' →';
    document.title = dest.name + ' — ' + TITLE;

    // content
    var token = ++renderToken;
    body.setAttribute('aria-busy', 'true');
    body.replaceChildren(h('p', { class: 'loading-note' }, 'Unrolling the chart…'));
    dataPromise.then(function (d) {
      if (token !== renderToken) return;
      var out = item && dest.detail ? renderRecord(dest, d, item) : dest.render(d, dest);
      body.replaceChildren(out);
      body.removeAttribute('aria-busy');
      page.scrollTop = 0;
      observeReveals();
      var target = item && dest.detail ? $('#record-title', body) : titleEl;
      if (!wasOpen || (item && dest.detail)) window.setTimeout(function () { if (isOpen && target) target.focus({ preventScroll: true }); }, wasOpen ? 0 : 120);
    }).catch(function () {
      if (token !== renderToken) return;
      var fromDisk = window.location.protocol === 'file:';
      body.replaceChildren(h('div', { class: 'error-note' },
        h('p', null, 'The chart couldn’t be unrolled — the portfolio data failed to load.'),
        fromDisk ? h('p', { class: 'error-hint' }, 'This page was opened straight from disk, where browsers will not read other files. ' +
          'Run “python tools/make-thumbs.py” once (it writes pirate/batman-snapshot.js), or serve the folder with “python -m http.server”.') : null,
        h('p', null, link('Open the Dark Knight portfolio instead', 'batman.html', 'btn'), ' ',
          h('a', { class: 'btn alt', href: '#' + slug, onclick: function (e) {        // the hash is already this chapter, so a plain link would do nothing
            e.preventDefault(); dataPromise = loadData(); openChapter(slug, item);
          } }, 'Retry'))));
      body.removeAttribute('aria-busy');
    });
  }

  function closeJournal() {
    if (!isOpen) { document.title = TITLE + ' | Shiva Prasad Sarkar'; return; }
    isOpen = false;
    renderToken++;
    var closed = current.dest;
    current = { dest: '', item: '' };
    journal.classList.remove('open');
    journal.classList.add('closing');
    stage.inert = false;
    html.classList.remove('chapter-open');
    mapMotion(true);
    document.title = TITLE + ' | Shiva Prasad Sarkar';
    var done = function () { if (!isOpen) { journal.hidden = true; journal.classList.remove('closing'); } };
    closeTimer = window.setTimeout(done, calm() ? 0 : 520);
    var back = (lastFocus && document.contains(lastFocus) && lastFocus !== document.body && !lastFocus.closest('#journal')) ? lastFocus : $('#link-' + islandId(closed));
    window.setTimeout(function () { if (!isOpen && back && back.focus) back.focus({ preventScroll: true }); }, 30);
  }
  function islandId(slug) { return { 'captains-log': 'log', 'arsenal': 'arsenal', 'arena': 'arena', 'treasure-islands': 'treasure', 'game-seas': 'games', 'hall-of-honors': 'honors', 'research-guild': 'research', 'storytellers-cove': 'cove', 'broadcast': 'broadcast', 'dossier': 'dossier', 'message': 'message' }[slug] || ''; }

  function observeReveals() {
    if (io) io.disconnect();
    var els = $$('.reveal', page);
    if (calm() || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { root: page, rootMargin: '0px 0px -5% 0px', threshold: .06 });
    els.forEach(function (e, i) { e.style.setProperty('--d', String(i % 6)); io.observe(e); });
  }

  // Remember where a click came from so the page can grow out of that island.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.isle, a.order, #hud-cv[href="#dossier"]');
    if (!a) return;
    if (e.clientX === 0 && e.clientY === 0) {                           // keyboard-triggered click: use the element's centre
      var r = a.getBoundingClientRect();
      origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    } else origin = { x: e.clientX, y: e.clientY };
  }, true);

  /* ================================================================ HUD: voyage drawer, universe menu, sound, calm */
  var voyageBtn = $('#btn-voyage'), orders = $('#orders');
  function drawerMode() { return window.matchMedia('(min-width: 900px) and (min-height: 560px)').matches; }
  function toggleDrawer(force) {
    if (!drawerMode()) { orders.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' }); return; }
    var open = force == null ? !orders.classList.contains('open') : force;
    orders.classList.toggle('open', open);
    voyageBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { var first = $('.order', orders); if (first) window.setTimeout(function () { first.focus(); }, 60); }
  }
  function closeDrawer() { if (orders.classList.contains('open')) { orders.classList.remove('open'); voyageBtn.setAttribute('aria-expanded', 'false'); } }
  voyageBtn.addEventListener('click', function () { toggleDrawer(); });
  $$('[data-action="voyage"]').forEach(function (b) { b.addEventListener('click', function () { toggleDrawer(); }); });
  $$('[data-action="map"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); if (isOpen) goMap(); else window.scrollTo(0, 0); }); });
  orders.addEventListener('click', function (e) { if (e.target.closest('a.order')) closeDrawer(); });
  document.addEventListener('click', function (e) {
    if (orders.classList.contains('open') && !orders.contains(e.target) && !voyageBtn.contains(e.target) && !e.target.closest('[data-action="voyage"]')) closeDrawer();
  });

  var uniBtn = $('#btn-universe'), uniMenu = $('#universe-menu');
  function setUni(open) { uniBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); uniMenu.hidden = !open; }
  uniBtn.addEventListener('click', function () { setUni(uniMenu.hidden); });
  document.addEventListener('click', function (e) { if (!uniMenu.hidden && !uniMenu.contains(e.target) && !uniBtn.contains(e.target)) setUni(false); });
  $('[data-world="batman"]', uniMenu).addEventListener('click', function () { U.choose('batman'); });

  var calmBox = $('#calm-toggle');
  function setCalm(on, persist) {
    if (on) html.setAttribute('data-calm', '1'); else html.removeAttribute('data-calm');
    if (calmBox) calmBox.checked = on;
    if (persist) store('calm', on ? '1' : '0');
    applyMotionPrefs();
  }
  if (calmBox) calmBox.addEventListener('change', function () { setCalm(calmBox.checked, true); });
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', applyMotionPrefs);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (html.classList.contains('intro-play')) { endIntro(); return; }
    if (!uniMenu.hidden) { setUni(false); uniBtn.focus(); return; }
    if (orders.classList.contains('open')) { closeDrawer(); voyageBtn.focus(); return; }
    if (isOpen) {
      if (current.item) window.location.hash = '#' + current.dest;       // record -> its list
      else goMap();                                                       // list -> map
    }
  });

  /* ================================================================ INTRO */
  var introTimer = 0;
  function startIntro() {
    if (calm() || window.location.hash || store('intro') === '1') return;
    store('intro', '1');
    html.classList.add('intro-play');
    introTimer = window.setTimeout(endIntro, 5200);
  }
  function endIntro() {
    window.clearTimeout(introTimer);
    if (!html.classList.contains('intro-play')) return;
    html.classList.remove('intro-play');                // base CSS is the final state => this is an instant, safe skip
  }
  $('#skip-intro').addEventListener('click', endIntro);

  /* ================================================================ PARALLAX (fine pointers only; uses the individual `translate` property so it never fights transform animations) */
  var PARALLAX = [['.o-sky', 2], ['.o-moon', 3], ['.o-cloud', 6], ['.o-horizon', 8], ['.o-sea', 10], ['.o-wave.w1', 12], ['.o-wave.w2', 16], ['.o-wave.w3', 22], ['.o-wave.w4', 28], ['.o-fog', 30], ['.map-wrap', -7], ['.motes', 26]]
    .map(function (p) { return { els: $$(p[0]), k: p[1] }; });
  var px = 0, py = 0, cx = 0, cy = 0, praf = 0;
  var canParallax = 'translate' in document.documentElement.style && window.matchMedia('(pointer: fine)').matches;
  function paintParallax() {
    PARALLAX.forEach(function (l) { l.els.forEach(function (el) { el.style.translate = (cx * l.k).toFixed(2) + 'px ' + (cy * l.k * .6).toFixed(2) + 'px'; }); });
  }
  function stepParallax() {
    cx += (px - cx) * .08; cy += (py - cy) * .08;
    paintParallax();
    praf = (Math.abs(px - cx) > .002 || Math.abs(py - cy) > .002) ? window.requestAnimationFrame(stepParallax) : 0;
  }
  function parallaxOn() { return canParallax && !calm() && !isOpen; }
  window.addEventListener('pointermove', function (e) {
    if (!parallaxOn() || e.pointerType === 'touch') return;
    px = e.clientX / window.innerWidth * 2 - 1; py = e.clientY / window.innerHeight * 2 - 1;
    if (!praf) praf = window.requestAnimationFrame(stepParallax);
  }, { passive: true });
  function resetParallax() { if (praf) { window.cancelAnimationFrame(praf); praf = 0; } px = py = cx = cy = 0; PARALLAX.forEach(function (l) { l.els.forEach(function (el) { el.style.translate = ''; }); }); }

  /* ================================================================ SHIP SAILING THE DOTTED ROUTE */
  var routeEl = $('#route'), shipEl = $('#map-ship');
  var ship = { len: 0, pos: 0, last: 0, sx: 1, raf: 0, running: false, t: 0 };
  function placeShip(now) {
    var p = routeEl.getPointAtLength(ship.pos);
    var a = routeEl.getPointAtLength(Math.max(0, ship.pos - 6)), b = routeEl.getPointAtLength(Math.min(ship.len, ship.pos + 6));
    var dx = b.x - a.x;
    var target = dx >= 0 ? 1 : -1;
    var dt = Math.min(.1, (now - ship.last) / 1000);
    ship.sx += (target - ship.sx) * Math.min(1, dt * 3.2);
    var bob = Math.sin(ship.t * 1.7) * 1.6, tilt = Math.sin(ship.t * 1.3) * 2.2;
    var edge = Math.min(ship.pos, ship.len - ship.pos);
    shipEl.setAttribute('opacity', Math.max(0, Math.min(1, edge / 70)).toFixed(2));
    shipEl.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + (p.y + bob).toFixed(1) + ') rotate(' + tilt.toFixed(1) + ') scale(' + (ship.sx || .01).toFixed(3) + ' 1)');
  }
  function shipFrame(now) {
    var dt = Math.min(.1, (now - ship.last) / 1000);
    ship.t += dt;
    ship.pos += dt * 30;
    if (ship.pos >= ship.len) ship.pos = 0;
    placeShip(now);
    ship.last = now;
    ship.raf = ship.running ? window.requestAnimationFrame(shipFrame) : 0;
  }
  var mapWrap = $('#map-wrap');
  // Small screens: the map keeps a readable size inside a frame that scrolls sideways (see .map-pan in pirate.css); large screens ignore the frame.
  if (mapWrap && mapWrap.parentNode) {
    var pan = document.createElement('div');
    pan.className = 'map-pan'; pan.id = 'map-pan';
    mapWrap.parentNode.insertBefore(pan, mapWrap); pan.appendChild(mapWrap);
    var panTip = document.createElement('p');
    panTip.className = 'map-pan-hint'; panTip.textContent = 'Drag the map sideways · tap an island';
    pan.parentNode.insertBefore(panTip, pan.nextSibling);
    var dragged = false;
    var lastW = -1;
    var centerMap = function () {                       // only when the WIDTH changes: phones fire resize whenever the address bar slides in or out
      if (dragged || pan.clientWidth === lastW) return;
      lastW = pan.clientWidth; pan.scrollLeft = Math.max(0, (pan.scrollWidth - pan.clientWidth) / 2);
    };
    ['touchstart', 'mousedown', 'wheel'].forEach(function (ev) { pan.addEventListener(ev, function () { dragged = true; }, { passive: true }); });
    centerMap(); window.addEventListener('resize', centerMap);
  }
  function mapVisible() { return !!(mapWrap && mapWrap.offsetParent !== null); }
  function shipStart() {
    if (!routeEl || !shipEl || ship.running || calm() || isOpen || !mapVisible() || !ship.len) return;
    ship.running = true; ship.last = performance.now();
    ship.raf = window.requestAnimationFrame(shipFrame);
  }
  function shipStop() { ship.running = false; if (ship.raf) window.cancelAnimationFrame(ship.raf); ship.raf = 0; }
  function initShip() {
    if (!routeEl || !shipEl) return;
    try { ship.len = routeEl.getTotalLength(); } catch (e) { ship.len = 0; }
    if (!ship.len) return;
    ship.pos = ship.len * .045;
    ship.last = performance.now();
    placeShip(ship.last);
    shipStart();
  }

  // Pause the map's motion while a chapter is open (nothing behind the page needs to animate).
  function mapMotion(on) {
    html.classList.toggle('map-paused', !on);           // CSS pauses every looping animation
    if (on) shipStart(); else { shipStop(); resetParallax(); }
  }
  function applyMotionPrefs() {
    if (calm()) { shipStop(); resetParallax(); if (ship.len) { ship.pos = ship.len * .045; placeShip(performance.now()); } endIntro(); }
    else if (!isOpen) { if (ship.len) shipStart(); }
  }
  // crossing between the map layout and the list layout starts/stops the ship
  window.matchMedia('(min-width: 900px) and (min-height: 560px)').addEventListener('change', function () {
    if (mapVisible()) { if (!ship.len) initShip(); else shipStart(); } else shipStop();
  });

  /* ================================================================ OCEAN AUDIO (procedural Web Audio; off by default; no files) */
  var snd = { ctx: null, master: null, on: false };
  var soundBtn = $('#btn-sound'), soundLabel = $('.sound-label', soundBtn);
  function buildOcean() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    var ctx = snd.ctx = new AC();
    var master = snd.master = ctx.createGain();
    master.gain.value = 0; master.connect(ctx.destination);
    var len = ctx.sampleRate * 6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {                       // brown noise = the body of a distant sea
      var d = buf.getChannelData(ch), last = 0;
      for (var i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    }
    function layer(type, freq, q, lfoHz, lfoDepth, base) {
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      var g = ctx.createGain(); g.gain.value = base;
      var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = lfoHz; lg.gain.value = lfoDepth;
      lfo.connect(lg); lg.connect(g.gain);                 // slow swell
      src.connect(f); f.connect(g); g.connect(master); src.start(); lfo.start();
    }
    layer('lowpass', 380, .7, .09, .22, .38);              // deep swell
    layer('bandpass', 900, .5, .13, .12, .16);             // surf wash
    layer('highpass', 3200, .8, .11, .05, .035);           // foam hiss
    return true;
  }
  function setSound(on) {
    if (on && !snd.ctx && !buildOcean()) { soundLabel.textContent = 'No audio'; return; }
    snd.on = on;
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.title = on ? 'Ocean sounds (on)' : 'Ocean sounds (off)';
    soundLabel.textContent = on ? 'Sound on' : 'Sound off';
    if (on) { snd.ctx.resume(); snd.master.gain.setTargetAtTime(.55, snd.ctx.currentTime, .6); }
    else if (snd.ctx) { snd.master.gain.setTargetAtTime(0, snd.ctx.currentTime, .25); window.setTimeout(function () { if (!snd.on) snd.ctx.suspend(); }, 900); }
  }
  soundBtn.addEventListener('click', function () { setSound(!snd.on); });

  /* ================================================================ BOOT */
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  initShip();
  if (store('calm') === '1') setCalm(true, false);   // after everything it touches exists
  startIntro();
  route();
  html.classList.remove('no-js');
})();
