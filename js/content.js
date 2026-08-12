/* ==============================================================
   BEE MOORE ADVISORY — content.js
   Renders Insights (/data/posts.json) and Digital Products
   (/data/products.json).

   Products with no checkout_url fall back to the enquiry form with
   the product pre-selected, so a button never leads to a dead
   checkout page.
   ============================================================== */
(function () {
  'use strict';

  var esc = BMA.esc, safeUrl = BMA.safeUrl;

  /* ---------- INSIGHTS ---------- */
  var postGrid = document.getElementById('post-grid');
  if (postGrid) {
    var pLimit  = parseInt(postGrid.getAttribute('data-limit') || '0', 10);
    var pFilters = document.getElementById('post-filters');
    var posts = [];

    var TYPE_LABEL = {
      linkedin: 'LinkedIn', substack: 'Newsletter', brief: 'Market brief',
      carousel: 'Carousel', video: 'Video'
    };

    function postCard(p) {
      var url = safeUrl(p.url);
      var tags = (p.tags || []).map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join('');
      return '<article class="insight-card reveal">' +
               '<div class="insight-meta">' +
                 '<span>' + esc(TYPE_LABEL[p.type] || p.type || 'Note') + '</span>' +
                 '<span aria-hidden="true">•</span>' +
                 '<span>' + esc(BMA.fmtDate(p.date)) + '</span>' +
               '</div>' +
               '<h3>' + esc(p.title) + '</h3>' +
               '<p>' + esc(p.excerpt) + '</p>' +
               (tags ? '<div class="insight-tags">' + tags + '</div>' : '') +
               (url
                 ? '<a class="link-arrow" href="' + esc(url) + '" target="_blank" rel="noopener">Read in full <span>→</span></a>'
                 : '<span style="font-size:.78rem;color:var(--muted);">Available on request</span>') +
             '</article>';
    }

    function renderPosts(topic) {
      var list = topic && topic !== 'all'
        ? posts.filter(function (p) { return (p.tags || []).indexOf(topic) > -1 || p.topic === topic; })
        : posts.slice();
      list.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
      if (pLimit > 0) list = list.slice(0, pLimit);
      if (!list.length) { BMA.empty(postGrid, 'Nothing published under this topic yet.'); return; }
      postGrid.innerHTML = list.map(postCard).join('');
      BMA.observeReveals(postGrid);
    }

    BMA.loadJSON('/data/posts.json').then(function (data) {
      if (!data || !Array.isArray(data.items)) {
        BMA.empty(postGrid, 'Insights are temporarily unavailable.');
        return;
      }
      posts = data.items;

      if (pFilters) {
        var topics = {};
        posts.forEach(function (p) { (p.tags || []).forEach(function (t) { topics[t] = true; }); });
        var keys = Object.keys(topics).sort();
        pFilters.innerHTML =
          '<button type="button" class="filter-btn active" data-topic="all" aria-pressed="true">All</button>' +
          keys.map(function (t) {
            return '<button type="button" class="filter-btn" data-topic="' + esc(t) +
                   '" aria-pressed="false">' + esc(t) + '</button>';
          }).join('');

        pFilters.addEventListener('click', function (e) {
          var b = e.target.closest('.filter-btn');
          if (!b) return;
          pFilters.querySelectorAll('.filter-btn').forEach(function (x) {
            var on = x === b;
            x.classList.toggle('active', on);
            x.setAttribute('aria-pressed', on);
          });
          renderPosts(b.getAttribute('data-topic'));
        });
      }

      renderPosts('all');
    });
  }

  /* ---------- PRODUCTS ---------- */
  var prodGrid = document.getElementById('product-grid');
  if (prodGrid) {
    BMA.loadJSON('/data/products.json').then(function (data) {
      if (!data || !Array.isArray(data.products)) {
        BMA.empty(prodGrid, 'Resources are temporarily unavailable.');
        return;
      }

      var pdLimit = parseInt(prodGrid.getAttribute('data-limit') || '0', 10);
      var products = pdLimit > 0 ? data.products.slice(0, pdLimit) : data.products;

      prodGrid.innerHTML = products.map(function (p) {
        var url = safeUrl(p.checkout_url);
        var href = url || ('/contact.html?enquiry=' + encodeURIComponent('Reports & resources') +
                           '&ref=' + encodeURIComponent(p.title));
        var ext = url ? ' target="_blank" rel="noopener"' : '';
        var badge = p.badge
          ? '<span class="badge badge-' + esc(p.badge_style || 'gold') + '">' + esc(p.badge) + '</span>'
          : '';
        var cover = esc(p.cover_line || p.title).replace(/\n/g, '<br>');
        var dim = p.available === false ? ' style="opacity:.55;pointer-events:none;"' : '';

        return '<article class="product-card reveal"' + dim + '>' +
                 '<div class="product-cover"><span>' + cover + '</span></div>' +
                 '<div class="product-body">' +
                   badge +
                   '<h3>' + esc(p.title) + '</h3>' +
                   '<p>' + esc(p.description) + '</p>' +
                   '<div class="source-line">' + esc(p.format || '') + '</div>' +
                   '<div class="price">' + esc(p.price) +
                     (p.price_note ? ' <small>— ' + esc(p.price_note) + '</small>' : '') +
                   '</div>' +
                   '<a class="btn ' + (p.price === 'Free' ? 'btn-gold' : 'btn-outline') +
                     '" href="' + esc(href) + '"' + ext + '>' + esc(p.cta || 'Enquire') + '</a>' +
                 '</div>' +
               '</article>';
      }).join('');

      BMA.observeReveals(prodGrid);
    });
  }
})();
