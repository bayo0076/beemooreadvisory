/* ==============================================================
   BEE MOORE ADVISORY — calculators.js
   1. Market Entry Cost & Timeline Calculator
   2. eCCI / profit-repatriation explainer

   Everything here is INDICATIVE. The only hard number used is the
   0.75% stamp duty on share capital, which is a stable statutory
   rate. Agency fees vary and are deliberately shown as requirements
   and ranges rather than invented precise figures.
   ============================================================== */
(function () {
  'use strict';

  /* ============================================================
     1. MARKET ENTRY CALCULATOR
     ============================================================ */
  var calc = document.getElementById('entry-calc');
  if (calc) {
    var elSector    = document.getElementById('calc-sector');
    var elCapital   = document.getElementById('calc-capital');
    var elCapitalOut= document.getElementById('calc-capital-out');
    var elForeign   = document.getElementById('calc-foreign');
    var elRegulated = document.getElementById('calc-regulated');
    var elStaff     = document.getElementById('calc-staff');
    var elExpat     = document.getElementById('calc-expat');

    var outHero   = document.getElementById('calc-timeline');
    var outRows   = document.getElementById('calc-rows');
    var outSteps  = document.getElementById('calc-steps');

    var SHARE_CAPITAL_FLOOR_NGN = 100000000;   // ₦100m — foreign participation
    var STAMP_DUTY_RATE         = 0.0075;      // 0.75% of share capital
    var FX = 1375;                             // fallback; replaced from signals.json
    var fxSource = 'CBN, July 2026';

    // Reuse the sourced FX rate rather than hard-coding a second one.
    BMA.loadJSON('/data/signals.json').then(function (d) {
      if (!d || !d.signals) return;
      var s = d.signals.filter(function (x) { return x.id === 'usdngn'; })[0];
      if (!s) return;
      var n = parseFloat(String(s.value).replace(/[^\d.]/g, ''));
      if (n > 0) { FX = n; fxSource = s.source + ', ' + s.as_of; }
      run();
    });

    function ngn(n) {
      return '₦' + Math.round(n).toLocaleString('en-NG');
    }
    function usd(n) {
      return '$' + Math.round(n).toLocaleString('en-US');
    }

    function toggle(el) {
      if (!el) return;
      el.addEventListener('click', function () {
        var on = el.getAttribute('aria-checked') === 'true';
        el.setAttribute('aria-checked', on ? 'false' : 'true');
        run();
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); el.click(); }
      });
    }
    toggle(elForeign); toggle(elRegulated); toggle(elExpat);

    function run() {
      var foreign   = elForeign   && elForeign.getAttribute('aria-checked') === 'true';
      var regulated = elRegulated && elRegulated.getAttribute('aria-checked') === 'true';
      var expat     = elExpat     && elExpat.getAttribute('aria-checked') === 'true';
      var sector    = elSector ? elSector.value : 'General trading';
      var staff     = elStaff ? Math.max(0, parseInt(elStaff.value || '0', 10)) : 0;
      var capUsd    = elCapital ? parseInt(elCapital.value || '0', 10) : 0;

      if (elCapitalOut) elCapitalOut.textContent = usd(capUsd);

      /* --- share capital position --- */
      var capNgn = capUsd * FX;
      var requiredNgn = foreign ? SHARE_CAPITAL_FLOOR_NGN : 1000000;
      var shareCapNgn = Math.max(capNgn, requiredNgn);
      var stampDuty = shareCapNgn * STAMP_DUTY_RATE;
      var shortfall = requiredNgn - capNgn;

      /* --- timeline --- */
      var days = 30;                 // CAC incorporation + basics
      if (foreign)   days += 25;     // NIPC + business permit
      if (regulated) days += 35;     // sector licence
      if (expat)     days += 20;     // expatriate quota
      if (staff > 25) days += 10;    // scale-up hiring & compliance
      var daysHigh = Math.round(days * 1.5);

      /* --- rows --- */
      var rows = [];
      rows.push(['Sector', sector]);
      rows.push(['Minimum share capital', foreign
        ? ngn(SHARE_CAPITAL_FLOOR_NGN) + ' (foreign participation)'
        : ngn(1000000) + ' (typical local minimum)']);
      rows.push(['Your stated capital', usd(capUsd) + ' ≈ ' + ngn(capNgn)]);
      rows.push(['Share capital to register', ngn(shareCapNgn)]);
      rows.push(['Stamp duty @ 0.75%', ngn(stampDuty) + ' ≈ ' + usd(stampDuty / FX)]);
      rows.push(['NIPC registration', foreign ? 'Required' : 'Not applicable']);
      rows.push(['Business permit (Interior)', foreign ? 'Required' : 'Not applicable']);
      rows.push(['Expatriate quota', expat ? 'Required' : 'Not requested']);
      rows.push(['Sector licence', regulated ? 'Required — may raise the capital floor' : 'Not indicated']);
      rows.push(['Minimum directors', foreign ? 'Two (single-director not permitted)' : 'One permitted']);

      if (outRows) {
        outRows.innerHTML = rows.map(function (r) {
          return '<div class="result-row"><dt>' + BMA.esc(r[0]) + '</dt><dd>' + BMA.esc(r[1]) + '</dd></div>';
        }).join('');
      }

      if (outHero) {
        outHero.innerHTML =
          '<div class="rh-label">Indicative timeline to operational</div>' +
          '<div class="rh-value">' + days + '–' + daysHigh + ' days</div>' +
          '<div class="rh-sub">From engagement to first lawful trading, assuming documents are ready</div>';
      }

      /* --- warnings & roadmap --- */
      var steps = [];
      if (foreign && shortfall > 0) {
        steps.push(['warn', 'Capital shortfall of ' + ngn(shortfall) +
          '. Any company with foreign shareholding — even 1% — must register at least ' +
          ngn(SHARE_CAPITAL_FLOOR_NGN) + ' in share capital. Increase the capital or reconsider ' +
          'an export-first structure before incorporating.']);
      }
      if (regulated) {
        steps.push(['warn', 'Regulated sector. Identify your regulator before incorporating — several ' +
          'licence-capital floors sit well above ₦100m, and that figure, not the general floor, ' +
          'dictates how much you import.']);
      }
      steps.push(['step', 'Days 1–15 — Confirm the sector regulator and its capital floor. Reserve the ' +
        'company name at CAC. Assemble director and shareholder documentation.']);
      steps.push(['step', 'Days 15–35 — Incorporate at CAC with the correct share capital. ' +
        (foreign ? 'Register with NIPC and apply for the business permit.' : 'Complete tax registration.')]);
      steps.push(['step', 'Days 35–60 — Open corporate and domiciliary accounts with a bank experienced ' +
        'in eCCI. Import capital through the bank and collect the eCCI on every single tranche.']);
      steps.push(['step', 'Days 60–90 — ' + (regulated ? 'Pursue the sector licence. ' : '') +
        'Register with the Nigeria Revenue Service, assess EDTI qualification, and begin operations.']);

      if (outSteps) {
        outSteps.innerHTML = steps.map(function (s) {
          return s[0] === 'warn'
            ? '<div class="step-warn">⚠ ' + BMA.esc(s[1]) + '</div>'
            : '<div style="font-size:.87rem;color:var(--muted);padding:9px 0;border-bottom:1px solid var(--border);">' +
              BMA.esc(s[1]) + '</div>';
        }).join('');
      }

      var fxNote = document.getElementById('calc-fx-note');
      if (fxNote) fxNote.textContent = 'Converted at ₦' + FX.toLocaleString('en-NG') + '/$ — source: ' + fxSource + '.';
    }

    ['input', 'change'].forEach(function (ev) {
      calc.addEventListener(ev, function (e) {
        if (e.target.matches('input, select')) run();
      });
    });

    run();
  }

  /* ============================================================
     2. eCCI / REPATRIATION EXPLAINER
     ============================================================ */
  var stepper = document.getElementById('ecci-stepper');
  if (stepper) {
    var items = Array.prototype.slice.call(stepper.querySelectorAll('.step-item'));

    function mark(upto) {
      items.forEach(function (it, i) {
        it.classList.toggle('done', i <= upto);
        var dot = it.querySelector('.step-dot');
        if (dot) dot.textContent = i <= upto ? '✓' : String(i + 1);
      });
      var prog = document.getElementById('ecci-progress');
      if (prog) prog.textContent = (upto + 1) + ' of ' + items.length;
    }

    items.forEach(function (it, i) {
      it.setAttribute('tabindex', '0');
      it.setAttribute('role', 'button');
      it.style.cursor = 'pointer';
      it.addEventListener('click', function () { mark(i); });
      it.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mark(i); }
      });
    });

    mark(0);

    var reset = document.getElementById('ecci-reset');
    if (reset) reset.addEventListener('click', function () { mark(0); });
  }
})();
