/*!
 * gateway.js — behaviour for the "Choose Your Universe" page.
 * The featured-world decision itself is made in universe.js and applied to <html> before first
 * paint; this file only adds the exit transition, keyboard hopping and bfcache re-sync.
 * The page never redirects on its own: the visitor always picks.
 */
(function () {
  'use strict';

  var U = window.SPSUniverse;
  var html = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function sync() {
    var s = U.state();
    html.setAttribute('data-featured', s.featured);
    html.setAttribute('data-reason', s.reason);
  }

  // Back/forward can restore this page from the bfcache with a stale "leaving" overlay.
  window.addEventListener('pageshow', function () {
    html.removeAttribute('data-leaving');
    sync();
  });

  var links = Array.prototype.slice.call(document.querySelectorAll('.enter'));
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var world = a.getAttribute('data-world');
      U.choose(world);
      if (reduce) return;                               // plain navigation, no transition
      e.preventDefault();
      html.setAttribute('data-leaving', world);
      window.setTimeout(function () { window.location.href = a.href; }, 420);
    });
  });

  // Left/Right arrows hop between the two worlds. (Up/Down are left alone so the stacked
  // mobile layout can still be scrolled with the keyboard.)
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    var i = e.key === 'ArrowLeft' ? 0 : e.key === 'ArrowRight' ? 1 : -1;
    if (i < 0 || !links[i]) return;
    if (document.activeElement === links[i]) return;
    e.preventDefault();
    links[i].focus();
  });
})();
