/* ==============================================================
   BEE MOORE ADVISORY — deals.js
   Renders the Deal Room from /data/deals.json with category filters.

   HARD RULE: the "illustrative structure, not a completed
   transaction" disclaimer is stamped onto every card by this code,
   not by the data file. It cannot be forgotten or edited out of a
   single card by accident.
   ============================================================== */
(function () {
  'use strict';

  var grid    = document.getElementById('deal-grid');
  var filters = document.getElementById('deal-filters');
  if (!grid) return;

  var esc = BMA.esc;
  var LIMIT = parseInt(grid.getAttribute('data-limit') || '0', 10); // 0 = all
  var all = [], meta = {};

  function card(d) {
    var specs = (d.specs || []).map(function (s) {
      return '<div class="deal-spec">' +
               '<dt>' + esc(s.label) + '</dt>' +
               '<dd>' + esc(s.value) + '</dd>' +
             '</div>';
    }).join('');

    var catLabel = (meta.catMap && meta.catMap[d.category]) || d.category || 'Opportunity';

    return '<article class="deal-card reveal" data-cat="' + esc(d.category) + '">' +
             '<div class="deal-top">' +
               '<span class="deal-cat">' + esc(catLabel) + '</span>' +
               '<span class="deal-ref">' + esc(d.ref || '') + '</span>' +
             '</div>' +
             '<div class="deal-body">' +
               '<h3>' + esc(d.title) + '</h3>' +
               '<p class="deal-summary">' + esc(d.summary) + '</p>' +
               '<dl class="deal-specs">' + specs + '</dl>' +
             '</div>' +
             '<div class="deal-foot">' +
               '<div class="illustrative-note">' +
                 '<span aria-hidden="true">⚑</span>' +
                 '<span><strong>Illustrative structure.</strong> ' +
                   esc(meta.disclaimer || 'An executable deal structure, not a completed transaction.') +
                   ' ' + esc(meta.valueDisclaimer || 'Indicative — subject to verification.') +
                 '</span>' +
               '</div>' +
               '<a class="btn btn-gold btn-sm" href="/contact.html?enquiry=' +
                 encodeURIComponent(catLabel) + '&ref=' + encodeURIComponent(d.ref || '') + '">' +
                 'Discuss a structure like this</a>' +
             '</div>' +
           '</article>';
  }

  function render(cat) {
    var list = (cat && cat !== 'all') ? all.filter(function (d) { return d.category === cat; }) : all.slice();
    if (LIMIT > 0) list = list.slice(0, LIMIT);

    if (!list.length) {
      BMA.empty(grid, 'No structures in this category yet. Tell us what you are trying to do and we will build one.');
      return;
    }
    grid.innerHTML = list.map(card).join('');
    BMA.observeReveals(grid);
  }

  BMA.loadJSON('/data/deals.json').then(function (data) {
    if (!data || !Array.isArray(data.deals)) {
      BMA.empty(grid, 'The deal room is temporarily unavailable.');
      return;
    }

    all = data.deals;
    meta.disclaimer = data.disclaimer;
    meta.valueDisclaimer = data.value_disclaimer;
    meta.catMap = {};
    (data.categories || []).forEach(function (c) { meta.catMap[c.id] = c.label; });

    /* Placeholder-price warning — visible until real quotes are attached. */
    var warn = document.getElementById('deal-price-warning');
    if (warn) {
      if (data.price_status !== 'sourced') {
        warn.innerHTML =
          '<p><strong>Structural examples only.</strong> The volumes and values shown below ' +
          'illustrate how a deal is put together. They are not sourced market quotations, and ' +
          'no figure here should be used for pricing. Every live engagement is quoted from ' +
          'current verified supplier and exchange data.</p>';
        warn.style.display = '';
      } else {
        warn.style.display = 'none';
      }
    }

    /* Filters — only render categories that actually have deals. */
    if (filters && data.categories) {
      var present = {};
      all.forEach(function (d) { present[d.category] = true; });
      var usable = data.categories.filter(function (c) { return c.id === 'all' || present[c.id]; });

      filters.innerHTML = usable.map(function (c, i) {
        return '<button type="button" class="filter-btn' + (i === 0 ? ' active' : '') + '" ' +
               'data-cat="' + esc(c.id) + '" aria-pressed="' + (i === 0) + '">' +
               esc(c.label) + '</button>';
      }).join('');

      filters.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filters.querySelectorAll('.filter-btn').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on);
        });
        render(btn.getAttribute('data-cat'));
      });
    }

    render('all');
  });
})();
