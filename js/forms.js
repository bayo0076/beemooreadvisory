/* ==============================================================
   BEE MOORE ADVISORY — forms.js
   Enquiry form: validation, prefill from deal/radar CTAs, submit
   to /api/contact, and a mailto + WhatsApp fallback so an enquiry
   is never silently lost if the backend is down or misconfigured.
   ============================================================== */
(function () {
  'use strict';

  var EMAIL_TO = 'bayo.olawunmi@gmail.com';
  var WHATSAPP = 'https://wa.me/2349015006151';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- PREFILL FROM ?enquiry= & ?ref= ---------- */
  var params = new URLSearchParams(location.search);
  var qEnquiry = params.get('enquiry');
  var qRef     = params.get('ref');

  if (qEnquiry) {
    var sel = document.getElementById('enquiry');
    if (sel) {
      var wanted = qEnquiry.toLowerCase();
      var matched = false;
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value.toLowerCase().indexOf(wanted) > -1) {
          sel.selectedIndex = i; matched = true; break;
        }
      }
      if (!matched) {
        for (var j = 0; j < sel.options.length; j++) {
          if (sel.options[j].value === 'Other') { sel.selectedIndex = j; break; }
        }
      }
    }
  }

  if (qRef) {
    var msg = document.getElementById('message');
    if (msg && !msg.value) {
      msg.value = 'Referring to: ' + qRef + '\n\n';
      // put the cursor after the prefilled line
      setTimeout(function () { msg.focus(); msg.setSelectionRange(msg.value.length, msg.value.length); }, 350);
    }
    var refField = document.querySelector('input[name="ref"]');
    if (refField) refField.value = qRef;
  }

  /* ---------- ENQUIRY FORM ---------- */
  var form = document.getElementById('contactForm');
  if (form) {
    var statusBox = document.getElementById('formStatus');
    var btn = form.querySelector('button[type="submit"]');
    var btnLabel = btn ? btn.innerHTML : '';

    function show(kind, html) {
      if (!statusBox) return;
      statusBox.className = 'form-status show ' + kind;
      statusBox.innerHTML = html;
      statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function fieldError(name, message) {
      var el = form.querySelector('[name="' + name + '"]');
      if (!el) return;
      el.setAttribute('aria-invalid', 'true');
      var holder = el.closest('.field');
      if (holder && !holder.querySelector('.field-error')) {
        var p = document.createElement('p');
        p.className = 'field-error';
        p.textContent = message;
        holder.appendChild(p);
      }
      el.focus();
    }

    function clearErrors() {
      form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
      form.querySelectorAll('.field-error').forEach(function (el) { el.remove(); });
    }

    function mailtoFallback(d) {
      var subject = 'Enquiry via beemooreadvisory.com — ' + (d.enquiry || 'General');
      var body =
        'Name: '     + (d.name    || '') + '\n' +
        'Company: '  + (d.company || '') + '\n' +
        'Country: '  + (d.country || '') + '\n' +
        'Email: '    + (d.email   || '') + '\n' +
        'WhatsApp: ' + (d.whatsapp|| '') + '\n' +
        'Type: '     + (d.enquiry || '') + '\n' +
        'Sector: '   + (d.sector  || '') + '\n' +
        'Size: '     + (d.size    || '') + '\n' +
        (d.ref ? 'Ref: ' + d.ref + '\n' : '') +
        '\n' + (d.message || '');
      return 'mailto:' + EMAIL_TO +
             '?subject=' + encodeURIComponent(subject) +
             '&body='    + encodeURIComponent(body);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();

      var fd = new FormData(form), d = {};
      fd.forEach(function (v, k) { d[k] = typeof v === 'string' ? v.trim() : v; });

      /* honeypot — bots fill it, humans can't see it. Fake success, send nothing. */
      if (d.website) { show('ok', 'Thank you — your message has been received.'); form.reset(); return; }

      if (!d.name)    { fieldError('name', 'Please tell us your name.'); return; }
      if (!d.email)   { fieldError('email', 'We need an email address to reply to.'); return; }
      if (!EMAIL_RE.test(d.email)) { fieldError('email', 'That email address does not look right.'); return; }
      if (!d.enquiry) { fieldError('enquiry', 'Please choose what this is about.'); return; }
      if (!d.message || d.message.length < 10) {
        fieldError('message', 'A sentence or two about what you are trying to do, please.');
        return;
      }

      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sending…'; }
      if (statusBox) statusBox.className = 'form-status';

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; })
            .then(function (json) { return { ok: res.ok, json: json }; });
        })
        .then(function (r) {
          if (!r.ok) throw new Error((r.json && r.json.error) || 'Request failed');
          show('ok',
            '<strong>Message sent.</strong> Adebayo will reply personally, usually within one ' +
            'business day. A confirmation has gone to ' + BMA.esc(d.email) + '.');
          form.reset();
        })
        .catch(function () {
          show('err',
            '<strong>The form could not reach our server.</strong> Nothing is lost — please ' +
            '<a href="' + mailtoFallback(d) + '">send this by email instead</a> (your details are ' +
            'already filled in), or <a href="' + WHATSAPP + '" target="_blank" rel="noopener">message ' +
            'us on WhatsApp</a>.');
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
        });
    });

    /* clear the error state as soon as the user starts fixing it */
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid')) {
        e.target.removeAttribute('aria-invalid');
        var h = e.target.closest('.field');
        var err = h && h.querySelector('.field-error');
        if (err) err.remove();
      }
    });
  }

  /* ---------- NEWSLETTER (routes through the same endpoint) ---------- */
  var nl = document.getElementById('newsletterForm');
  if (nl) {
    var nlStatus = document.getElementById('newsletterStatus');
    nl.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (nl.querySelector('[name="email"]') || {}).value || '';
      email = email.trim();
      if (!EMAIL_RE.test(email)) {
        if (nlStatus) { nlStatus.className = 'form-status show err'; nlStatus.textContent = 'Please enter a valid email address.'; }
        return;
      }
      var b = nl.querySelector('button[type="submit"]');
      var lbl = b ? b.innerHTML : '';
      if (b) { b.disabled = true; b.innerHTML = '<span class="spinner"></span> Sending…'; }

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Newsletter subscriber',
          email: email,
          enquiry: 'Reports & resources',
          message: 'Requested the free Nigeria Investment Cheat Sheet and the monthly signal.',
          source: 'Newsletter block'
        })
      })
        .then(function (r) { if (!r.ok) throw new Error(); })
        .then(function () {
          if (nlStatus) {
            nlStatus.className = 'form-status show ok';
            nlStatus.innerHTML = '<strong>You are on the list.</strong> The cheat sheet is on its way. ' +
              'You can also subscribe directly at <a href="https://substack.com/@naijainteldesk" ' +
              'target="_blank" rel="noopener">Naija Intel Desk</a>.';
          }
          nl.reset();
        })
        .catch(function () {
          if (nlStatus) {
            nlStatus.className = 'form-status show err';
            nlStatus.innerHTML = 'Could not reach the server. Subscribe directly at ' +
              '<a href="https://substack.com/@naijainteldesk" target="_blank" rel="noopener">Naija Intel Desk</a>.';
          }
        })
        .then(function () { if (b) { b.disabled = false; b.innerHTML = lbl; } });
    });
  }
})();
