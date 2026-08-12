/* ==============================================================
   POST /api/contact
   Vercel serverless function. Receives the enquiry form, emails
   Bee Moore Advisory, and sends the enquirer a confirmation.

   Uses the Resend REST API over plain fetch — no npm packages,
   no build step, nothing to install.

   Environment variables (set in Vercel → Settings → Environment):
     RESEND_API_KEY   required — from resend.com
     CONTACT_TO       optional — default bayo.olawunmi@gmail.com
     CONTACT_FROM     optional — default Resend sandbox sender
   ============================================================== */

const TO   = process.env.CONTACT_TO   || 'bayo.olawunmi@gmail.com';
const FROM = process.env.CONTACT_FROM || 'Bee Moore Advisory <onboarding@resend.dev>';

const LIMITS = {
  name: 120, company: 160, country: 100, email: 200, whatsapp: 40,
  enquiry: 120, sector: 120, size: 60, message: 6000, source: 60, ref: 120
};

/* Naive per-instance rate limit. Serverless instances recycle, so this
   catches casual abuse rather than a determined attacker. */
const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 4;

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 800) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Priority routing — puts the commercially urgent enquiries at the top
   of the subject line so they are visible on a phone lock screen. */
const HOT = ['Due Diligence', 'Trade / Export', 'Market Entry', 'FDI', 'Acquisition'];

async function sendMail(payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 400)}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    /* honeypot — pretend it worked, send nothing */
    if (clean(body.website, 50)) return res.status(200).json({ ok: true });

    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress || 'unknown';
    if (rateLimited(ip)) {
      return res.status(429).json({ error: 'Too many messages. Please try again shortly.' });
    }

    const d = {};
    for (const [k, max] of Object.entries(LIMITS)) d[k] = clean(body[k], max);
    d.source = d.source || 'Website';

    if (!d.name || !d.email || !d.message) {
      return res.status(400).json({ error: 'Name, email and message are required.' });
    }
    if (!EMAIL_RE.test(d.email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set — cannot send mail.');
      return res.status(500).json({ error: 'Mail service is not configured.' });
    }

    const stamp = new Date().toLocaleString('en-GB', {
      timeZone: 'Africa/Lagos', dateStyle: 'full', timeStyle: 'short'
    });
    const priority = HOT.includes(d.enquiry) ? '★ ' : '';

    /* ---------- 1. notification to Bee Moore Advisory ---------- */
    const row = (label, value) =>
      value
        ? `<tr>
             <td style="padding:8px 16px 8px 0;color:#56637A;font:600 11px/1.4 monospace;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
             <td style="padding:8px 0;color:#1B2432;font:15px/1.6 -apple-system,Segoe UI,sans-serif;">${esc(value)}</td>
           </tr>`
        : '';

    const waLink = d.whatsapp
      ? `<a href="https://wa.me/${esc(d.whatsapp.replace(/[^\d]/g, ''))}"
             style="display:inline-block;background:#25D366;color:#06331a;padding:11px 20px;border-radius:4px;font-size:14px;font-weight:700;text-decoration:none;margin-left:8px;">
           WhatsApp
         </a>`
      : '';

    await sendMail({
      from: FROM,
      to: [TO],
      reply_to: d.email,
      subject: `${priority}${d.enquiry || 'Enquiry'} — ${d.name}${d.company ? ' (' + d.company + ')' : ''}`,
      html: `
<div style="background:#EEF2F6;padding:32px 16px;font-family:-apple-system,Segoe UI,sans-serif;">
  <div style="max-width:660px;margin:0 auto;background:#fff;border:1px solid #D9E0E9;border-radius:4px;overflow:hidden;">
    <div style="background:#071827;padding:22px 28px;">
      <div style="color:#D4A94E;font:600 11px/1 monospace;letter-spacing:.2em;text-transform:uppercase;">
        New enquiry${priority ? ' — priority' : ''}
      </div>
      <div style="color:#fff;font:600 20px/1.3 Georgia,serif;margin-top:8px;">Bee Moore Advisory</div>
    </div>
    <div style="padding:26px 28px;">
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', d.name)}
        ${row('Company', d.company)}
        ${row('Country', d.country)}
        ${row('Email', d.email)}
        ${row('WhatsApp', d.whatsapp)}
        ${row('Type', d.enquiry)}
        ${row('Sector', d.sector)}
        ${row('Size', d.size)}
        ${row('Reference', d.ref)}
        ${row('Source', d.source)}
        ${row('Received', stamp + ' (WAT)')}
      </table>
      <div style="margin-top:22px;padding-top:20px;border-top:1px solid #D9E0E9;">
        <div style="color:#B4883B;font:600 11px/1 monospace;letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px;">Message</div>
        <div style="color:#1B2432;font-size:15px;line-height:1.7;white-space:pre-wrap;">${esc(d.message)}</div>
      </div>
      <div style="margin-top:24px;">
        <a href="mailto:${esc(d.email)}?subject=${encodeURIComponent('Re: your enquiry to Bee Moore Advisory')}"
           style="display:inline-block;background:#B4883B;color:#fff;padding:11px 20px;border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;">
          Reply to ${esc(d.name.split(' ')[0])}
        </a>${waLink}
      </div>
    </div>
  </div>
</div>`,
      text:
        `NEW ENQUIRY — Bee Moore Advisory\n\n` +
        `Name: ${d.name}\nCompany: ${d.company}\nCountry: ${d.country}\n` +
        `Email: ${d.email}\nWhatsApp: ${d.whatsapp}\nType: ${d.enquiry}\n` +
        `Sector: ${d.sector}\nSize: ${d.size}\nRef: ${d.ref}\nSource: ${d.source}\n` +
        `Received: ${stamp} (WAT)\n\n---\n\n${d.message}\n`
    });

    /* ---------- 2. auto-reply (never block on this) ---------- */
    try {
      await sendMail({
        from: FROM,
        to: [d.email],
        reply_to: TO,
        subject: 'We have your enquiry — Bee Moore Advisory',
        html: `
<div style="background:#EEF2F6;padding:32px 16px;font-family:-apple-system,Segoe UI,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #D9E0E9;border-radius:4px;overflow:hidden;">
    <div style="background:#071827;padding:26px 30px;">
      <div style="color:#fff;font:600 21px/1.3 Georgia,serif;">Bee Moore <span style="color:#D4A94E;">Advisory</span></div>
      <div style="color:rgba(255,255,255,.55);font:400 11px/1 monospace;letter-spacing:.16em;text-transform:uppercase;margin-top:8px;">Lagos, Nigeria</div>
    </div>
    <div style="padding:30px;color:#1B2432;font-size:15px;line-height:1.75;">
      <p style="margin:0 0 16px;">Dear ${esc(d.name.split(' ')[0])},</p>
      <p style="margin:0 0 16px;">Thank you for getting in touch. Your enquiry has reached us and Adebayo will reply personally, usually within one business day.</p>
      <p style="margin:0 0 16px;">If it is time-sensitive, WhatsApp is the fastest route:
        <a href="https://wa.me/2349015006151" style="color:#1F6F54;font-weight:600;">+234 901 500 6151</a>.</p>
      <div style="margin:22px 0;padding:18px 20px;background:#F5F7FA;border-left:3px solid #B4883B;">
        <div style="color:#B4883B;font:600 10px/1 monospace;letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px;">Your message</div>
        <div style="color:#56637A;font-size:14px;line-height:1.65;white-space:pre-wrap;">${esc(d.message)}</div>
      </div>
      <p style="margin:0 0 16px;">In the meantime, two things that answer most first questions:
        the free <a href="https://beemooreadvisory.com/resources.html" style="color:#1F6F54;font-weight:600;">Nigeria Investment Cheat Sheet</a>,
        and the <a href="https://beemooreadvisory.com/tools.html" style="color:#1F6F54;font-weight:600;">market entry cost calculator</a>.</p>
      <p style="margin:0;">Regards,<br><strong>Adebayo Olawunmi</strong><br>
        <span style="color:#56637A;font-size:13px;">Founder &amp; Chief Executive, Bee Moore Advisory</span></p>
    </div>
    <div style="padding:18px 30px;border-top:1px solid #D9E0E9;color:#56637A;font-size:11px;line-height:1.6;">
      Independent market intelligence and advisory. Not investment, legal, or tax advice.
      Bee Moore Advisory is not a law firm, accountancy practice or licensed financial adviser,
      and is not affiliated with or endorsed by any government agency.
    </div>
  </div>
</div>`,
        text:
          `Dear ${d.name.split(' ')[0]},\n\n` +
          `Thank you for getting in touch. Your enquiry has reached us and Adebayo will reply ` +
          `personally, usually within one business day.\n\n` +
          `If it is time-sensitive, WhatsApp is fastest: +234 901 500 6151\n\n` +
          `--- Your message ---\n${d.message}\n\n` +
          `Regards,\nAdebayo Olawunmi\nFounder & Chief Executive, Bee Moore Advisory\n` +
          `https://beemooreadvisory.com\n\n` +
          `Independent market intelligence and advisory. Not investment, legal, or tax advice.\n`
      });
    } catch (e) {
      console.error('Auto-reply failed (enquiry still delivered):', e.message);
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Could not send the message. Please email us directly.' });
  }
}
