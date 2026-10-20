/*!
 * batman/polish.js — behaviour for the polished Batman portfolio.
 *
 * Replaces script.js on batman.html (batman-classic.html still uses the untouched script.js).
 * Everything the original script did is kept: loader + quotes, theme toggle (same localStorage key and the same
 * toast lines), mobile menu, active-section nav, See More / See Less, project preview modal, contact-form toast,
 * Konami code, back-to-top. New: scroll progress, header state, scroll reveal, count-up stats, hero parallax and
 * card tilt/spotlight, accessible modal (focus trap), fixed preview images.
 *
 * No dependencies. Every effect is skipped under prefers-reduced-motion. Each init runs in its own try/catch.
 */
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var body = d.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function $(sel, ctx) { return (ctx || d).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }
  function store(kind, key, val) {
    try {
      var s = window[kind];
      if (val === undefined) return s.getItem(key);
      s.setItem(key, val);
    } catch (e) { /* storage blocked */ }
    return null;
  }
  var THEME_KEY = 'dark-knight-theme';

  /* ------------------------------------------------------------------ toast + bat-signal (shared) */
  var toastEl = null, toastTimer = 0, signalEl = null;
  function toast(message) {
    if (!toastEl) {
      toastEl = d.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      body.appendChild(toastEl);
    }
    toastEl.innerHTML = '<svg class="ic fill" aria-hidden="true" focusable="false"><use href="#i-bat"/></svg><span></span>';
    toastEl.lastChild.textContent = message;
    window.clearTimeout(toastTimer);
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('show'); }, 2800);
  }
  function batSignal() {
    if (reduced.matches) return;
    if (!signalEl) {
      signalEl = d.createElement('div');
      signalEl.className = 'signal-fx';
      signalEl.setAttribute('aria-hidden', 'true');
      signalEl.innerHTML = '<svg viewBox="0 0 112 60" width="76" height="41" focusable="false"><use href="#i-bat"/></svg>';
      body.appendChild(signalEl);
    }
    signalEl.classList.remove('go');
    void signalEl.offsetWidth;
    signalEl.classList.add('go');
  }

  /* ------------------------------------------------------------------ loader */
  var loaderDone = false;
  var heroStartCallbacks = [];
  function onLoaderDone(fn) { if (loaderDone) fn(); else heroStartCallbacks.push(fn); }

  function initLoader() {
    var screen = $('#loading-screen');
    function finish() {
      if (loaderDone) return;
      loaderDone = true;
      if (screen) screen.classList.add('loaded');
      body.classList.remove('loading');
      store('sessionStorage', 'bm-seen', '1');
      if (screen) window.setTimeout(function () { if (screen.parentNode) screen.parentNode.removeChild(screen); }, 1100);
      heroStartCallbacks.splice(0).forEach(function (fn) { try { fn(); } catch (e) { /* keep going */ } });
    }
    if (!screen) { finish(); return; }
    var quotes = [
      '"It\'s not who I am underneath, but what I do that defines me."',
      '"Why do we fall? So we can learn to pick ourselves up."',
      '"The night is darkest just before the dawn."'
    ];
    var seen = store('sessionStorage', 'bm-seen') === '1';
    var duration = reduced.matches ? 250 : (seen ? 600 : 1600);
    screen.style.setProperty('--ld-dur', Math.round(duration * .92) + 'ms');
    var quoteEl = $('.loading-quotes', screen);
    var qi = 0, qTimer = 0;
    if (quoteEl && duration > 1200) {
      qTimer = window.setInterval(function () {
        quoteEl.classList.add('swap');
        window.setTimeout(function () { qi = (qi + 1) % quotes.length; quoteEl.textContent = quotes[qi]; quoteEl.classList.remove('swap'); }, 220);
      }, 650);
    }
    window.setTimeout(function () { window.clearInterval(qTimer); finish(); }, duration);
  }

  /* ------------------------------------------------------------------ theme */
  function currentTheme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function applyTheme(theme, announce) {
    var light = theme === 'light';
    root.setAttribute('data-theme', theme);
    store('localStorage', THEME_KEY, theme);
    var label = light ? 'Switch to batmode' : 'Switch to Light Mode';
    $$('#theme-toggle, #mobile-theme-toggle').forEach(function (btn) {
      var l = $('.tt-label', btn);
      if (l) l.textContent = label;
      btn.setAttribute('aria-pressed', light ? 'true' : 'false');
    });
    var mobileIcon = $('#mobile-theme-toggle use');
    if (mobileIcon) mobileIcon.setAttribute('href', light ? '#i-moon' : '#i-sun');
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#f6f3ec' : '#07080c');
    if (announce) {
      batSignal();
      toast(light ? 'The sun rises over Gotham.' : 'Welcome to the shadows, Dark Knight.');
    }
  }
  function initTheme() {
    applyTheme(currentTheme(), false);
    var toggle = $('#theme-toggle');
    var mobile = $('#mobile-theme-toggle');
    function flip() { applyTheme(currentTheme() === 'light' ? 'dark' : 'light', true); }
    if (toggle) toggle.addEventListener('click', flip);
    if (mobile) mobile.addEventListener('click', function () { flip(); closeMobileNav(false); });
  }

  /* ------------------------------------------------------------------ mobile menu */
  var closeMobileNav = function () {};
  function initMobileNav() {
    var toggle = $('#mobile-toggle'), nav = $('#mobile-nav'), closeBtn = $('#mobile-close');
    if (!toggle || !nav) return;
    var lastFocus = null;
    function open() {
      lastFocus = d.activeElement;
      toggle.setAttribute('aria-expanded', 'true');
      nav.setAttribute('aria-hidden', 'false');
      nav.classList.add('open');
      body.classList.add('nav-open');
      window.setTimeout(function () { (closeBtn || nav).focus({ preventScroll: true }); }, 60);
    }
    closeMobileNav = function (restore) {
      if (!nav.classList.contains('open')) return;
      toggle.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-hidden', 'true');
      nav.classList.remove('open');
      body.classList.remove('nav-open');
      if (restore !== false && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    toggle.addEventListener('click', function () { if (nav.classList.contains('open')) closeMobileNav(); else open(); });
    if (closeBtn) closeBtn.addEventListener('click', function () { closeMobileNav(); });
    nav.addEventListener('click', function (e) {
      if (e.target === nav || (e.target.closest && e.target.closest('.mobile-nav-content') === null)) closeMobileNav();
      else if (e.target.closest && e.target.closest('a.mobile-nav-link')) closeMobileNav(false);
    });
    d.addEventListener('keydown', function (e) {
      if (!nav.classList.contains('open')) return;
      if (e.key === 'Escape') { closeMobileNav(); return; }
      if (e.key === 'Tab') {                                   // keep focus inside the open menu
        var f = $$('a[href], button:not([disabled])', nav).filter(function (el) { return el.offsetParent !== null || el === closeBtn; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', function (e) { if (e.matches) closeMobileNav(false); });
  }

  /* ------------------------------------------------------------------ scroll: progress, header, back-to-top, scene parallax */
  function initScroll() {
    var header = $('header');
    var bar = $('.scroll-progress');
    var toTop = $('#to-top');
    var scene = $('.hero-scene');
    var ticking = false;
    var past = false;
    root.classList.add('sw-reveal');   // the floating "Switch universe" pill stays out of the first screen (polish.css); no JS -> it is simply always visible
    function update() {
      ticking = false;
      var y = window.pageYOffset || root.scrollTop || 0;
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, y / max)).toFixed(4);
      var vh = window.innerHeight || 700;
      if (past ? y < vh * 0.12 : y > vh * 0.38) { past = !past; root.classList.toggle('past-hero', past); }   // hysteresis: no flicker around the threshold
      if (bar) bar.style.setProperty('--p', p);
      if (toTop) { toTop.style.setProperty('--p', p); toTop.classList.toggle('show', y > 520); }
      if (header) header.classList.toggle('scrolled', y > 24);
      if (scene && y < 1100 && !reduced.matches) scene.style.setProperty('--sy', Math.min(y, 900));
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
    if (toTop) toTop.addEventListener('click', function () {
      batSignal();
      window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
    });
    // let the hero scene sleep while it is off-screen
    if (scene && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { scene.classList.toggle('scene-off', !en.isIntersecting); });
      }, { rootMargin: '120px' }).observe(scene);
    }
  }

  /* ------------------------------------------------------------------ active section in the nav */
  function initActiveNav() {
    var map = [];
    var hero = $('.hero');
    if (hero) map.push([hero, 'hello']);
    $$('main > section[id]').forEach(function (s) { map.push([s, s.id]); });
    var links = $$('.nav-links a[href^="#"], .mobile-nav-link[href^="#"]');
    function setActive(id) {
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        for (var i = 0; i < map.length; i++) if (map[i][0] === en.target) setActive(map[i][1]);
      });
    }, { rootMargin: '-46% 0px -50% 0px' });
    map.forEach(function (m) { io.observe(m[0]); });
    setActive('hello');
  }

  /* ------------------------------------------------------------------ scroll reveal */
  function initReveal() {
    var items = $$('.section-header, .skill-category, .platforms-section, .stat-card, .card, .cv-card, .contact-card, .see-more-container');
    if (!('IntersectionObserver' in window) || reduced.matches) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (en) { return en.isIntersecting; });
      batch.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; });
      batch.forEach(function (en, i) {
        en.target.style.setProperty('--i', Math.min(i, 6));
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: .08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------ stats count-up (final text is always the original) */
  function initCounters() {
    var nums = $$('.stat h3');
    var parsed = nums.map(function (h) {
      var txt = h.textContent.trim();
      var m = txt.match(/^(\d[\d,]*)(.*)$/);
      return m ? { el: h, final: txt, target: parseInt(m[1].replace(/,/g, ''), 10), suffix: m[2] } : null;
    }).filter(Boolean);
    if (!parsed.length) return;
    parsed.forEach(function (p) { p.el.setAttribute('aria-label', p.final); });
    if (reduced.matches) return;
    function run() {
      var t0 = null, dur = 1500;
      function ease(t) { return 1 - Math.pow(1 - t, 4); }
      function tick(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / dur);
        parsed.forEach(function (p) { p.el.textContent = Math.round(p.target * ease(t)).toLocaleString('en-US').replace(/,/g, p.final.indexOf(',') > -1 ? ',' : '') + p.suffix; });
        if (t < 1) window.requestAnimationFrame(tick);
        else parsed.forEach(function (p) { p.el.textContent = p.final; });
      }
      parsed.forEach(function (p) { p.el.textContent = '0' + p.suffix; });
      window.requestAnimationFrame(tick);
    }
    parsed.forEach(function (p) { p.el.textContent = '0' + p.suffix; });
    onLoaderDone(function () { window.setTimeout(run, 500); });
  }

  /* ------------------------------------------------------------------ hero: pointer parallax + card tilt */
  function initHeroMotion() {
    var hero = $('.hero'), scene = $('.hero-scene'), card = $('.hero-card');
    if (!hero || !scene || reduced.matches || !finePointer.matches) return;
    var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0;
    function frame() {
      cur.x += (target.x - cur.x) * .09;
      cur.y += (target.y - cur.y) * .09;
      scene.style.setProperty('--px', cur.x.toFixed(3));
      scene.style.setProperty('--py', cur.y.toFixed(3));
      if (card) { card.style.setProperty('--ry', (cur.x * 6).toFixed(2) + 'deg'); card.style.setProperty('--rx', (-cur.y * 5).toFixed(2) + 'deg'); }
      raf = (Math.abs(target.x - cur.x) > .002 || Math.abs(target.y - cur.y) > .002) ? window.requestAnimationFrame(frame) : 0;
    }
    function kick() { if (!raf) raf = window.requestAnimationFrame(frame); }
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { target.x = target.y = 0; kick(); });
  }

  /* ------------------------------------------------------------------ cards: spotlight + See More + keyboard */
  function initCards() {
    if (finePointer.matches) {
      var pending = null, ex = 0, ey = 0;
      d.addEventListener('pointermove', function (e) {
        var card = e.target.closest && e.target.closest('.card');
        if (!card) return;
        ex = e.clientX; ey = e.clientY; pending = card;
        window.requestAnimationFrame(function () {
          if (!pending) return;
          var r = pending.getBoundingClientRect();
          pending.style.setProperty('--mx', (ex - r.left).toFixed(0) + 'px');
          pending.style.setProperty('--my', (ey - r.top).toFixed(0) + 'px');
          pending = null;
        });
      }, { passive: true });
    }

    $$('.see-more-btn').forEach(function (btn) {
      var grid = d.getElementById(btn.getAttribute('data-section'));
      if (!grid) return;
      btn.setAttribute('aria-controls', grid.id);
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var text = $('.text', btn);
        var open = grid.classList.toggle('show-all');
        btn.classList.toggle('active', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (text) text.textContent = open ? 'See Less' : 'See More';
        if (open) {
          $$('.card', grid).slice(3).forEach(function (c, i) { c.style.setProperty('--k', i % 9); c.classList.add('in'); });
        } else {
          var section = grid.closest('section');
          if (section) section.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ------------------------------------------------------------------ preview modal */
  function initModal() {
    var modal = $('#modal'), mClose = $('#modal-close');
    if (!modal) return;
    var mImg = $('#modal-img'), mTitle = $('#modal-title'), mDesc = $('#modal-desc'), mLink = $('#modal-link');
    var opener = null, token = 0;

    function open(card, trigger) {
      var data = {};
      try { data = JSON.parse(card.getAttribute('data-project') || '{}'); } catch (e) { /* ignore */ }
      var picture = $('img', card);
      var firstLink = $('a', card);
      var heading = $('h4', card);
      mTitle.textContent = data.title || (heading ? heading.textContent.trim() : 'Project');
      mDesc.textContent = data.desc || ($('p', card) ? $('p', card).textContent.trim() : '');
      mLink.href = data.link || (firstLink ? firstLink.href : '#');
      // The original read data.img, whose file names do not exist for three projects (broken preview).
      // The card's own picture always exists: show the optimised one at once, then swap in the full-size original.
      var mine = ++token;
      if (picture) {
        mImg.alt = picture.alt || mTitle.textContent;
        mImg.src = picture.currentSrc || picture.src;
        var full = picture.getAttribute('src');
        if (full) {
          var big = new Image();
          big.onload = function () { if (mine === token) mImg.src = big.src; };
          big.src = new URL(full, d.baseURI).href;
        }
      } else { mImg.removeAttribute('src'); mImg.alt = ''; }
      opener = trigger || d.activeElement;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      body.classList.add('modal-open');
      window.setTimeout(function () { if (mClose) mClose.focus({ preventScroll: true }); }, 50);
    }
    function close() {
      if (!modal.classList.contains('open')) return;
      token++;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      body.classList.remove('modal-open');
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }

    $$('.card').forEach(function (card) {
      var btn = $('.preview-btn', card);
      if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); open(card, btn); });
      if (!card.hasAttribute('data-project')) return;
      // Enter / Space on the focused CARD opens the preview (links and buttons inside keep their own behaviour)
      card.addEventListener('keydown', function (e) {
        if (e.target !== card) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card, card); }
      });
      // ...and so does a click / tap anywhere else on the card: the hero tip says "click project cards to investigate further",
      // yet the original only reacted to the Preview button (which 8 of the 18 cards do not have) or the keyboard
      card.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('a, button')) return;       // links and buttons keep their own behaviour
        var sel = window.getSelection && window.getSelection();
        if (sel && String(sel).length) return;                                // the visitor is selecting text, not asking for a preview
        open(card, card);
      });
    });
    if (mClose) mClose.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    d.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {                                   // focus trap
        var f = $$('a[href], button:not([disabled])', modal);
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ------------------------------------------------------------------ contact form (unchanged behaviour: a themed confirmation) */
  function initContact() {
    var form = $('#contact-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameField = form.elements.name;
      var name = (nameField && nameField.value.trim()) || 'Citizen of Gotham';
      toast('Signal received, ' + name + '. The Dark Knight will respond within 24 hours.');
      batSignal();
      form.reset();
    });
  }

  /* ------------------------------------------------------------------ Konami easter egg (up up down down left right left right B A) */
  function initKonami() {
    var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var at = 0;
    d.addEventListener('keydown', function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      at = (k === seq[at]) ? at + 1 : (k === seq[0] ? 1 : 0);
      if (at === seq.length) {
        at = 0;
        root.classList.add('batmode');
        toast('BATMAN MODE ACTIVATED');
        batSignal();
        window.setTimeout(function () { root.classList.remove('batmode'); }, 5000);
      }
    });
  }

  /* ------------------------------------------------------------------ small hygiene */
  function initLinks() {
    $$('a[target="_blank"]').forEach(function (a) {
      var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
      if (rel.indexOf('noopener') === -1) rel.push('noopener');
      a.setAttribute('rel', rel.join(' '));
    });
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    [initLoader, initTheme, initMobileNav, initScroll, initActiveNav, initReveal, initCounters,
     initHeroMotion, initCards, initModal, initContact, initKonami, initLinks].forEach(function (fn) {
      try { fn(); } catch (err) { if (window.console) console.error('[batman polish] ' + fn.name + ' failed:', err); }
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
