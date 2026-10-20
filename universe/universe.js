/*!
 * universe.js — shared "which world am I in?" logic for the dual-universe portfolio.
 *
 * No dependencies. Every URL here is RELATIVE, so it works under the GitHub Pages
 * project path (/Portfolio-Website/) as well as on localhost or any other base.
 *
 * Session model (sessionStorage == one browser-tab session):
 *   spsUniverse:featured   'batman' | 'pirate'   fair coin flip, made once per session
 *   spsUniverse:chosen     'batman' | 'pirate'   the last world the visitor actually entered
 *
 * Batman's own light/dark toggle lives in localStorage ("dark-knight-theme") and is untouched.
 *
 * Usage as a <script> tag:
 *   data-universe="batman"  -> remember this world for the session and mount the switcher
 *   data-universe="pirate"  -> remember this world for the session (pirate has its own HUD)
 *   (no attribute)          -> just expose window.SPSUniverse (used by the gateway page)
 */
(function (root) {
  'use strict';

  var NS = 'spsUniverse:';
  // A "./" link means index.html on a web server, but on a page opened straight from disk (file://) it opens the folder listing.
  var GATEWAY = root.location && root.location.protocol === 'file:' ? 'index.html' : './';
  var PAGES = { batman: 'batman.html', pirate: 'pirate.html', gateway: GATEWAY };
  var NAMES = { batman: 'The Dark Knight', pirate: 'The Lost World' };

  // Old Batman-site anchors (#projects, #cv ...) -> the equivalent pirate destination.
  var LEGACY = {
    hello: 'captains-log', skills: 'arsenal', 'problem-solving': 'arena',
    projects: 'treasure-islands', mygames: 'game-seas', certificates: 'hall-of-honors',
    research: 'research-guild', blogs: 'storytellers-cove', videos: 'broadcast',
    cv: 'dossier', connect: 'message'
  };

  /* ---- storage (falls back to memory if sessionStorage is blocked) ---- */
  var mem = {};
  function read(key) {
    try {
      var v = root.sessionStorage.getItem(NS + key);
      if (v !== null) return v;
    } catch (e) { /* storage blocked */ }
    return mem[key] || null;
  }
  function write(key, value) {
    mem[key] = value;
    try { root.sessionStorage.setItem(NS + key, value); } catch (e) { /* storage blocked */ }
  }
  function valid(w) { return w === 'batman' || w === 'pirate'; }

  /* ---- fair 50/50 ---- */
  function coin() {
    try {
      var a = new Uint8Array(1);
      root.crypto.getRandomValues(a);
      return (a[0] & 1) ? 'pirate' : 'batman';
    } catch (e) {
      return Math.random() < 0.5 ? 'batman' : 'pirate';
    }
  }

  function chosen() {
    var c = read('chosen');
    return valid(c) ? c : null;
  }
  function choose(world) { if (valid(world)) write('chosen', world); }

  /**
   * Which card the gateway should emphasise.
   * - A world the visitor already entered this session wins ("Where you left off").
   * - Otherwise a random pick, made ONCE per session so a refresh never reshuffles it.
   */
  function state() {
    var c = chosen();
    if (c) return { featured: c, reason: 'chosen' };
    var f = read('featured');
    if (!valid(f)) { f = coin(); write('featured', f); }
    return { featured: f, reason: 'random' };
  }

  /**
   * Old links such as /Portfolio-Website/#projects used to open the Batman page.
   * Keep them working: forward to the remembered world (default Batman), hash intact.
   * replace() keeps the gateway out of the history stack. Returns true if it redirected.
   */
  function forwardLegacyHash() {
    var id = decodeURIComponent((root.location.hash || '').slice(1));
    if (!id || !Object.prototype.hasOwnProperty.call(LEGACY, id)) return false;
    var world = chosen() || 'batman';
    var hash = world === 'pirate' ? '#' + LEGACY[id] : '#' + id;
    root.location.replace(PAGES[world] + hash);
    return true;
  }

  /* ---- floating switcher, mounted on the Batman page only ---- */
  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<circle cx="9" cy="12" r="6.2" fill="none" stroke="#ffd700" stroke-width="1.7"/>' +
    '<circle cx="15" cy="12" r="6.2" fill="none" stroke="#3fc1c9" stroke-width="1.7"/></svg>';

  function mountSwitcher(current) {
    if (document.getElementById('universe-switcher')) return;
    var other = current === 'batman' ? 'pirate' : 'batman';
    var wrap = document.createElement('div');
    wrap.id = 'universe-switcher';
    wrap.className = 'us';
    wrap.innerHTML =
      '<button type="button" class="us-btn" aria-expanded="false" aria-controls="us-menu">' +
        ICON + '<span class="us-label">Switch universe</span></button>' +
      '<div class="us-menu" id="us-menu" hidden>' +
        '<a class="us-item us-current" href="' + PAGES[current] + '" aria-current="page">' +
          '<strong>' + NAMES[current] + '</strong><small>You are here</small></a>' +
        '<a class="us-item us-other" data-world="' + other + '" href="' + PAGES[other] + '">' +
          '<strong>' + NAMES[other] + '</strong><small>' + (other === 'pirate' ? 'Set sail' : 'Enter Gotham') + '</small></a>' +
        '<a class="us-item" href="' + PAGES.gateway + '">' +
          '<strong>Universe gateway</strong><small>Back to the choice screen</small></a>' +
      '</div>';
    document.body.appendChild(wrap);

    var btn = wrap.querySelector('.us-btn');
    var menu = wrap.querySelector('.us-menu');
    function setOpen(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.hidden = !open;
    }
    btn.addEventListener('click', function () { setOpen(menu.hidden); });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); }
    });
    wrap.querySelector('.us-other').addEventListener('click', function () { choose(other); });
  }

  // Links written in the HTML as href="./" (e.g. the pirate HUD menu) get the same treatment on file://.
  function fixGatewayLinks() {
    if (GATEWAY === './') return;
    var links = document.querySelectorAll('a[href="./"]');
    for (var i = 0; i < links.length; i++) links[i].setAttribute('href', GATEWAY);
  }

  root.SPSUniverse = {
    pages: PAGES, names: NAMES, legacy: LEGACY,
    state: state, chosen: chosen, choose: choose, forwardLegacyHash: forwardLegacyHash
  };

  /* ---- auto-run when included with data-universe ---- */
  var tag = document.currentScript;
  var world = tag && tag.getAttribute('data-universe');
  if (valid(world)) {
    choose(world);
    fixGatewayLinks();
    if (tag.getAttribute('data-switcher') !== 'none') mountSwitcher(world);
  }
})(window);
