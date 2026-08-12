/* ==============================================================
   BEE MOORE ADVISORY — signals.js
   Renders the hero ticker and the Market Signals grid from
   /data/signals.json.

   HARD RULE: a signal without both `source` and `as_of` is not
   rendered. Unsourced numbers are exactly what this firm sells
   against, so the widget enforces it rather than trusting the file.
   ============================================================== */
(function () {
  'use strict';

  var ticker = document.getElementById('ticker-track');
  var grid   = document.getElementById('signal-grid');
  var stamp  = document.querySelectorAll('[data-signals-updated]');
  if (!ticker && !grid) return;

  var esc = BMA.esc, safeUrl = BMA.safeUrl;

  function usable(s) {
    return s && s.name && s.value && s.source && s.as_of;
  }

  function arrow(dir) {
    if (dir === 'up')   return '<span class="tk-up" aria-hidden="true">▲</span>';
    if (dir === 'down') return '<span class="tk-down" aria-hidden="true">▼</span>';
    return '';
  }

  BMA.loadJSON('/data/signals.json').then(function (data) {
    if (!data || !Array.isArray(data.signals)) {
      if (grid) BMA.empty(grid, 'Market signals are temporarily unavailable.');
      if (ticker) ticker.closest('.ticker').style.display = 'none';
      return;
    }

    var signals = data.signals.filter(usable);
    var dropped = data.signals.length - signals.length;
    if (dropped > 0) console.warn('[BMA] ' + dropped + ' signal(s) hidden: missing source or as_of.');

    if (!signals.length) {
      if (grid) BMA.empty(grid, 'No sourced signals available.');
      if (ticker) ticker.closest('.ticker').style.display = 'none';
      return;
    }

    /* ---------- TICKER ---------- */
    if (ticker) {
      var itemHtml = signals.map(function (s) {
        return '<span class="ticker-item">' +
                 '<span class="tk-name">' + esc(s.name) + '</span>' +
                 '<span class="tk-val">' + esc(s.value) + '</span>' +
                 arrow(s.direction) +
                 '<span class="tk-as">' + esc(s.as_of) + '</span>' +
               '</span>';
      }).join('');
      // duplicated once so the CSS -50% translate loops seamlessly
      ticker.innerHTML = itemHtml + itemHtml;
    }

    /* ---------- SIGNAL GRID ---------- */
    if (grid) {
      grid.innerHTML = signals.map(function (s) {
        var url = safeUrl(s.source_url);
        var src = url
          ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(s.source) + '</a>'
          : esc(s.source);
        return '<article class="signal-card">' +
                 '<div class="signal-name">' + esc(s.name) + '</div>' +
                 '<div class="signal-value">' + esc(s.value) + ' ' + arrow(s.direction) + '</div>' +
                 (s.note ? '<p class="signal-note">' + esc(s.note) + '</p>' : '') +
                 '<div class="signal-meta">' +
                   'Source: ' + src + '<br>As of: ' + esc(s.as_of) +
                 '</div>' +
               '</article>';
      }).join('');
    }

    /* ---------- UPDATED STAMP + HONESTY LINE ---------- */
    for (var i = 0; i < stamp.length; i++) {
      stamp[i].textContent = BMA.fmtDate(data.updated) || data.updated || '—';
    }

    var note = document.getElementById('signals-disclaimer');
    if (note && data.disclaimer) note.textContent = data.disclaimer;

    // If the file is ever flagged as unverified, say so loudly.
    var warn = document.getElementById('signals-warning');
    if (warn) {
      if (data.data_status !== 'verified') {
        warn.innerHTML = '<p><strong>Unverified data.</strong> These figures have not been ' +
                         'checked against primary sources. Do not rely on them.</p>';
        warn.style.display = '';
      } else {
        warn.style.display = 'none';
      }
    }
  });
})();
