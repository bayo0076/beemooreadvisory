/* ==============================================================
   BEE MOORE ADVISORY — app.js
   Core site behaviour + shared helpers.
   Loaded on every page. Other modules depend on window.BMA.
   ============================================================== */
(function () {
  'use strict';

  /* ---------- SHARED HELPERS (window.BMA) ---------- */
  var BMA = window.BMA = {};

  /** Escape untrusted strings before they touch innerHTML. */
  BMA.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /** Only allow http(s) and mailto links from data files. */
  BMA.safeUrl = function (u) {
    var s = String(u || '').trim();
    return /^(https?:\/\/|mailto:|\/)/i.test(s) ? s : '';
  };

  /** Fetch a JSON data file. Never throws — returns null on failure. */
  BMA.loadJSON = function (path) {
    return fetch(path, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + path);
        return r.json();
      })
      .catch(function (err) {
        console.warn('[BMA] could not load ' + path, err);
        return null;
      });
  };

  /** Render an empty/error state into a container. */
  BMA.empty = function (el, msg) {
    if (el) el.innerHTML = '<div class="empty-state">' + BMA.esc(msg) + '</div>';
  };

  /** Human date: "2026-08-11" -> "11 Aug 2026" */
  BMA.fmtDate = function (iso) {
    if (!iso) return '';
    var d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /** Re-run reveal observation on nodes injected after first paint. */
  BMA.observeReveals = function (root) {
    var nodes = (root || document).querySelectorAll('.reveal:not(.is-visible)');
    if (!io) { for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('is-visible'); return; }
    for (var j = 0; j < nodes.length; j++) io.observe(nodes[j]);
  };

  /* ---------- THEME ---------- */
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('bma-theme'); } catch (e) {}
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));

  function paintToggle() {
    var isDark = root.getAttribute('data-theme') === 'dark';
    var btns = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < btns.length; i++) {
      btns[i].textContent = isDark ? '☀' : '☾';
      btns[i].setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.theme-toggle');
    if (!t) return;
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('bma-theme', next); } catch (err) {}
    paintToggle();
  });

  /* ---------- NAV STATE ---------- */
  var nav = document.querySelector('.site-nav');
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    var top = document.querySelector('.to-top');
    if (top) top.classList.toggle('show', window.scrollY > 620);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- ACTIVE LINK ---------- */
  function pageKey(path) {
    var last = String(path || '').split('#')[0].split('?')[0].split('/').pop();
    return (!last || last === 'index.html') ? 'home' : last;
  }
  var here = pageKey(location.pathname);
  var links = document.querySelectorAll('.nav-links a, .mobile-drawer a');
  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute('href') || '';
    if (href.charAt(0) === '#' || /^https?:/i.test(href)) continue;
    if (pageKey(href) === here) {
      links[i].classList.add('active');
      links[i].setAttribute('aria-current', 'page');
    }
  }

  /* ---------- MOBILE DRAWER (with focus trap) ---------- */
  var drawer   = document.getElementById('mobileDrawer');
  var backdrop = document.getElementById('drawerBackdrop');
  var burger   = document.getElementById('hamburgerBtn');
  var closeBtn = document.getElementById('drawerClose');
  var lastFocus = null;

  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    if (backdrop) backdrop.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      lastFocus = document.activeElement;
      var first = drawer.querySelector('a, button');
      if (first) first.focus();
    } else if (lastFocus) {
      lastFocus.focus();
    }
  }

  if (burger)   burger.addEventListener('click', function () { setDrawer(true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setDrawer(false); });
  if (backdrop) backdrop.addEventListener('click', function () { setDrawer(false); });
  if (drawer) {
    drawer.addEventListener('click', function (e) { if (e.target.tagName === 'A') setDrawer(false); });
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = drawer.querySelectorAll('a, button');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) setDrawer(false);
  });

  /* ---------- SCROLL REVEAL ---------- */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
  }
  BMA.observeReveals(document);

  /* ---------- BACK TO TOP ---------- */
  var toTop = document.querySelector('.to-top');
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- SERVICE CARD ACCORDION ---------- */
  document.addEventListener('click', function (e) {
    var head = e.target.closest && e.target.closest('.service-head');
    if (!head) return;
    var card = head.closest('.service-card');
    var open = card.classList.toggle('open');
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ---------- FOOTER YEAR ---------- */
  var years = document.querySelectorAll('[data-year]');
  for (var y = 0; y < years.length; y++) years[y].textContent = new Date().getFullYear();

  /* ---------- CV LINK: degrade instead of 404 ---------- */
  var cv = document.querySelector('a[href$="adebayo-olawunmi-cv.pdf"]');
  if (cv && window.fetch) {
    fetch(cv.getAttribute('href'), { method: 'HEAD' })
      .then(function (r) { if (!r.ok) throw new Error('missing'); })
      .catch(function () {
        cv.setAttribute('href',
          'mailto:hello@beemooreadvisory.com?subject=' +
          encodeURIComponent('CV request — Adebayo Olawunmi'));
        cv.removeAttribute('download');
        cv.textContent = 'Request CV by email';
      });
  }

  /* ---------- INIT ---------- */
  paintToggle();
  onScroll();
})();
