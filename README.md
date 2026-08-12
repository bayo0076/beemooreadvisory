# Bee Moore Advisory — beemooreadvisory.com

Static site, one serverless function, no framework. Deploys to Vercel with no build step.

---

## 1. Structure

```
/
├── index.html  services.html  deal-room.html  insights.html
├── tools.html  resources.html  clients.html  about.html  contact.html  404.html
│        ↑ these are GENERATED. Do not edit them directly — see §3.
│
├── _partials/              ← source you actually edit
│   ├── chrome.html         nav, footer, <head> template (shared by every page)
│   ├── pages.json          per-page title, description, schema, scripts
│   └── pages/*.html        the body of each page
│
├── build.py                regenerates the .html files + sitemap.xml
│
├── css/styles.css          every style on the site
├── js/
│   ├── app.js              nav, dark mode, drawer, reveal, accordions, helpers
│   ├── globe.js            the rotating hero globe (homepage only)
│   ├── signals.js          ticker + market signals
│   ├── deals.js            deal room + filters
│   ├── opportunities.js    opportunity radar
│   ├── content.js          insights + digital products
│   ├── calculators.js      entry calculator + eCCI explainer
│   └── forms.js            enquiry form, validation, prefill, fallbacks
│
├── data/                   ← the automation surface (see §5)
│   ├── signals.json  deals.json  opportunities.json  posts.json  products.json
│
├── api/contact.js          Vercel serverless function (Resend)
├── assets/{images,icons,documents}/
└── vercel.json  package.json  robots.txt  sitemap.xml  .env.example
```

---

## 2. Before you go live — four things

### a) Turn off or replace the Opportunity Radar

`data/opportunities.json` currently ships with **sample rows**. They are clearly stamped
SAMPLE and an amber warning sits above them, but sample buyer demand should not be on a
live commercial site any longer than necessary.

Either replace `items` with genuine anonymised enquiries and set `"data_status": "live"`,
or set `"enabled": false` to remove the section entirely. The kill switch removes it from
every page automatically.

### b) Attach real prices to the deal room, or leave the warning up

`data/deals.json` has `"price_status": "placeholder"`. The volumes shown are structural
illustrations, not sourced quotes, and an amber banner says so. When you attach real
supplier or exchange references, set `"price_status": "sourced"` and the banner disappears.

### c) Add your CV

Save it as `assets/documents/adebayo-olawunmi-cv.pdf`. Until then the About page button
turns itself into "Request CV by email" rather than 404-ing.

### d) Add a portrait (optional, but it matters here)

The About page shows an "AO" monogram. Drop a photo at `assets/images/adebayo.jpg` and
swap the placeholder block in `_partials/pages/about.html` — the replacement markup is in a
comment right above it. This site sells a founder-led practice; a real face converts.

---

## 3. Editing the site

**To change page content** — edit the file in `_partials/pages/`, then:

```bash
python3 build.py
```

**To change the nav, footer or meta template** — edit `_partials/chrome.html`, then run
`build.py`. One edit updates all ten pages.

**To change page titles, descriptions or schema** — edit `_partials/pages.json`, then run
`build.py`. It also regenerates `sitemap.xml`.

**To change colours** — edit the tokens at the top of `css/styles.css`:

```css
--navy:      #0F2C4D;   /* headings, dark sections */
--gold:      #B4883B;   /* accent, CTA surfaces */
--gold-text: #8A6520;   /* gold for TEXT on light backgrounds — WCAG-safe */
--gold-ink:  #071827;   /* text that sits ON gold */
--green:     #1F6F54;   /* verified, positive, sector */
```

> Use `--gold-text` for any gold text on a light background. Raw `--gold` on white is
> 3.2:1 and fails WCAG AA. Text on gold buttons uses `--gold-ink` for the same reason.

Commit the generated `.html` files along with your `_partials` edits.

---

## 4. Deploying

### First deploy

```bash
git init
git add .
git commit -m "Bee Moore Advisory site"
git branch -M main
git remote add origin https://github.com/bayo0076/beemooreadvisory.git
git push -u origin main
```

Then at [vercel.com/new](https://vercel.com/new): import the repo, framework preset
**Other**, leave build command and output directory empty, deploy.

After that, every `git push` redeploys automatically.

### Local preview

```bash
npx serve .          # pages, globe, widgets — form will not send
vercel dev           # everything including /api/contact
```

Note: opening `index.html` directly with `file://` will not work — the absolute paths
(`/css/...`, `/data/...`) need a server.

### Retiring the old site

Once this is live on the domain, retire `adebayo-online-profile.vercel.app` so there are
not two versions of you online. Either delete that Vercel project, or add a
`vercel.json` to the old repo redirecting everything here:

```json
{ "redirects": [{ "source": "/(.*)", "destination": "https://beemooreadvisory.com/$1", "permanent": true }] }
```

The redirect is better — it passes any existing links and search equity to the new domain.

---

## 5. The automation surface

Everything that changes regularly lives in `data/*.json`. Your scheduled jobs can rewrite
these files and push; the site updates with no HTML editing. Each file has a `_comment`
at the top explaining its contract.

| File | What writes it | Guardrail enforced in code |
|---|---|---|
| `signals.json` | Macro research job | A signal missing `source` or `as_of` is **not rendered**. If `data_status` ≠ `verified`, a warning banner appears. |
| `deals.json` | You, manually | The "illustrative, not a completed transaction" disclaimer is stamped on every card **by `deals.js`**, not by the data — it cannot be edited out of one card by accident. |
| `opportunities.json` | Weekly radar job | If `data_status` ≠ `live`, every row is stamped SAMPLE and a banner appears. `enabled: false` removes the section. |
| `posts.json` | Daily LinkedIn/Substack job | Non-http URLs are stripped. Missing URL renders without a link rather than a dead one. |
| `products.json` | You, manually | Empty `checkout_url` falls back to the enquiry form with the product pre-selected — never a dead checkout. |

**The pattern for an automation:** gather → validate → write the JSON → commit → push.
Vercel redeploys on push. Keep the shape identical; the renderers are defensive but they
cannot invent a `source` field you did not supply.

**Storefront:** `checkout_url` is deliberately provider-agnostic. Payhip, Selar, Gumroad,
Stripe Payment Links — paste any URL and the button uses it.

---

## 6. Making the enquiry form work

The form posts to `/api/contact`, which sends through [Resend](https://resend.com).
Free tier covers 3,000 emails/month.

1. Sign up at resend.com, create an API key (starts `re_`).
2. Vercel → **Settings → Environment Variables**:

   | Name | Value |
   |---|---|
   | `RESEND_API_KEY` | your `re_...` key |
   | `CONTACT_TO` | `bayo.olawunmi@gmail.com` |
   | `CONTACT_FROM` | `Bee Moore Advisory <onboarding@resend.dev>` |

   Tick Production, Preview and Development.
3. **Redeploy.** Environment variables only apply to new deployments.

### Then upgrade the sender

`onboarding@resend.dev` is Resend's sandbox and only delivers to your own Resend signup
address — fine for testing, useless in production. Once the domain resolves:

1. Resend → Domains → Add Domain → `beemooreadvisory.com`
2. Add the SPF/DKIM/DMARC records it gives you at Squarespace
3. Wait for **Verified**
4. Change `CONTACT_FROM` to `Bee Moore Advisory <hello@beemooreadvisory.com>`, redeploy

**If the form ever fails**, the enquiry is not lost — the visitor gets a pre-filled mailto
link and a WhatsApp link instead. That fallback is in `js/forms.js`.

### What the backend does

Validates and length-caps every field, HTML-escapes everything before it reaches an email
body, drops honeypot submissions silently, rate-limits to 4/minute per IP, flags priority
enquiry types with a ★ in the subject line, sets `reply_to` to the enquirer, renders a
one-tap WhatsApp button if they gave a number, and sends them a branded auto-reply.

---

## 7. Connecting beemooreadvisory.com (Squarespace → Vercel)

**In Vercel first**

1. Project → Settings → Domains → **Add Domain** → `beemooreadvisory.com`
2. Accept the prompt to also add `www`
3. Vercel shows the exact records. **Leave the tab open.**

Typically an **A record** on `@` (e.g. `216.198.79.1`) and a **CNAME** on `www` pointing
at a project-specific host like `d1d4fc829fe7bc7c.vercel-dns-017.com`.
⚠️ Copy from your own dashboard — the CNAME target is unique to your project.

**Then in Squarespace**

4. Account → Domains → `beemooreadvisory.com`
5. If it is attached to a Squarespace *site*, **disconnect it first** — otherwise DNS is locked
6. Open DNS Settings → Custom Records
7. **Delete any existing A record on `@` and CNAME on `www`.** Leftover Squarespace defaults
   are the single most common reason this fails
8. Add Vercel's A record and CNAME
9. Save

**Back in Vercel**

10. Hit Refresh until both show **Valid Configuration** (10–60 min typical, up to 48h)
11. SSL is automatic
12. Set `www.beemooreadvisory.com` as **Primary**, apex redirects to it — the apex uses a
    fixed IP that has had intermittent routing trouble from some regions; the CNAME path
    does not share that dependency

**Then tell Google**

13. [Search Console](https://search.google.com/search-console) → add the property → verify →
    submit `https://beemooreadvisory.com/sitemap.xml`

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Invalid Configuration" in Vercel | Old Squarespace A/CNAME records still present | Delete every A on `@` and CNAME on `www`, keep only Vercel's |
| Apex works, `www` doesn't (or vice versa) | Only one record added | Both are required |
| Form says "could not reach our server" | `RESEND_API_KEY` missing, or added after the last deploy | Add it, then **redeploy** |
| Form succeeds, no email arrives | Using `onboarding@resend.dev`, which only delivers to your Resend signup address | Verify the domain in Resend, switch `CONTACT_FROM` |
| Widgets show skeletons forever | A `data/*.json` file has a syntax error | `python3 -m json.tool data/deals.json` will point at the line |
| A market signal vanished | It is missing `source` or `as_of` | By design. Add both and it returns |
| Globe missing | No WebGL, or reduced-motion is on | Intended — the gradient takes over. Not a bug |
| Styles broken locally | Opened via `file://` | Use `npx serve .` |
| Edited a .html and the change vanished | You edited a generated file | Edit `_partials/`, run `build.py` |

---

## 9. The honesty rules this site enforces in code

These are not style guidance — they are implemented, and they will fight you if you try to
work around them casually. That is deliberate: this is a firm that sells verification.

- Market signals without a source and date are **silently dropped from the render**.
- The deal-room disclaimer is generated by JavaScript on every card, not stored per-card.
- Sample data announces itself with a banner and per-row stamps until you mark it live.
- Every page carries the "not investment, legal, or tax advice" footer.
- Illustrative engagements on `clients.html` are labelled on every card.
- The public-sector section explicitly disclaims influence over contract awards.
- No fabricated statistics, clients, testimonials or completed transactions anywhere.

**Quarterly maintenance:** the macro figures in `data/signals.json` and the six numbers on
`insights.html` are dated mid-2026. Diary a review. Stale numbers on an advisory site do
more damage than no numbers.

---

## 10. What was checked before handover

- All 10 pages return 200; 376 internal links resolve
- All JS parses; all JSON valid; all 5 JSON-LD blocks valid
- Contact API: method guard, field validation, email validation, honeypot, rate limiting,
  length caps, and confirmed no injected attribute or handler survives into a real tag
- WCAG AA contrast on all 15 tested colour pairs, light and dark mode
- Every page: one `<h1>`, `lang`, skip link, `<main>` landmark, labelled inputs, alt text
- Titles ≤62 chars, descriptions ≤160 — inside Google's truncation limits
- Total page weight 548KB including a 136KB social image
