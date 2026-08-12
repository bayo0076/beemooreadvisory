/* ==============================================================
   BEE MOORE ADVISORY — opportunities.js
   Renders the Opportunity Radar from /data/opportunities.json.

   HARD RULE: while data_status !== 'live' the module shows a loud
   sample warning and stamps SAMPLE on every row. If "enabled" is
   false the entire section is removed from the page — so the radar
   can never quietly present fabricated demand as real deal flow.
   ============================================================== */
(function () {
  'use strict';

  var list = document.getElementById('radar-list');
  if (!list) return;

  var esc = BMA.esc;
  var LIMIT = parseInt(list.getAttribute('data-limit') || '0', 10);
  var section = list.closest('section');

  function statusClass(s) {
    if (s === 'open') return '';
    if (s === 'in-progress') return 'warm';
    return 'cool';
  }
  function statusLabel(s) {
    if (s === 'open') return 'Open';
    if (s === 'in-progress') return 'In progress';
    if (s === 'closed') return 'Closed';
    return s || '—';
  }

  BMA.loadJSON('/data/opportunities.json').then(function (data) {
    if (!data) { BMA.empty(list, 'The radar is temporarily unavailable.'); return; }

    /* Kill switch — hide the whole section. */
    if (data.enabled === false) {
      if (section) section.remove();
      document.querySelectorAll('[data-radar-link]').forEach(function (n) { n.remove(); });
      return;
    }

    var isSample = data.data_status !== 'live';

    /* Sample warning banner */
    var warn = document.getElementById('radar-warning');
    if (warn) {
      if (isSample) {
        warn.innerHTML = '<p><strong>Sample data.</strong> ' +
          esc(data.sample_warning || 'These rows illustrate the format only — they are not live enquiries.') +
          ' Replace them with genuine anonymised enquiries, or switch the section off, before launch.</p>';
        warn.style.display = '';
      } else {
        warn.style.display = 'none';
      }
    }

    var note = document.getElementById('radar-note');
    if (note && !isSample && data.live_note) note.textContent = data.live_note;

    var items = Array.isArray(data.items) ? data.items.slice() : [];
    items.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    if (LIMIT > 0) items = items.slice(0, LIMIT);

    if (!items.length) {
      BMA.empty(list, 'No open requirements listed right now. Send yours and it becomes the next one.');
      return;
    }

    list.innerHTML = items.map(function (o) {
      return '<article class="radar-row reveal">' +
               '<span class="radar-flag">' + esc(o.type || 'Enquiry') + '</span>' +
               '<div class="radar-main">' +
                 '<h4>' + esc(o.headline) + '</h4>' +
                 (o.requirement ? '<p style="font-size:.85rem;color:var(--muted);margin-top:5px;">' +
                    esc(o.requirement) + '</p>' : '') +
                 '<div class="radar-meta">' +
                   '<span>' + esc(o.region || '—') + '</span>' +
                   '<span>' + esc(o.sector || '—') + '</span>' +
                   '<span>' + esc(BMA.fmtDate(o.date)) + '</span>' +
                   '<span class="radar-status">' +
                     '<span class="status-dot ' + statusClass(o.status) + '"></span>' +
                     esc(statusLabel(o.status)) +
                   '</span>' +
                   (isSample ? '<span style="color:var(--amber);font-weight:700;">Sample</span>' : '') +
                 '</div>' +
               '</div>' +
               '<a class="btn btn-outline btn-sm" href="/contact.html?enquiry=' +
                 encodeURIComponent(o.type || '') + '&ref=' + encodeURIComponent(o.id || '') + '">' +
                 'Ask us to pursue this</a>' +
             '</article>';
    }).join('');

    BMA.observeReveals(list);
  });
})();
