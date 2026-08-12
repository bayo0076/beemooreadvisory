#!/usr/bin/env python3
"""
Bee Moore Advisory — static site builder.

WHY THIS EXISTS
    The nav and footer appear on every page. Without a builder you edit
    the same markup eight times and eventually they drift apart.

WHAT IT DOES
    Takes the shared chrome from _partials/chrome.html, wraps each body
    fragment in _partials/pages/*.html, and writes plain .html files to
    the project root. That output is what Vercel serves — there is no
    build step at deploy time.

USAGE
    python3 build.py

WHEN TO RUN IT
    After editing _partials/chrome.html (nav, footer, meta) or any file
    in _partials/pages/. Commit the generated .html files.
"""

import json
import pathlib
import re
import sys
from datetime import date

ROOT = pathlib.Path(__file__).parent
PARTIALS = ROOT / "_partials"
PAGES_DIR = PARTIALS / "pages"

SITE = "https://beemooreadvisory.com"


def block(text: str, name: str) -> str:
    """Pull <!--@NAME--> ... <!--/@NAME--> out of the chrome file."""
    m = re.search(rf"<!--@{name}-->(.*?)<!--/@{name}-->", text, re.S)
    if not m:
        sys.exit(f"ERROR: block @{name} not found in _partials/chrome.html")
    return m.group(1).strip()


def main() -> None:
    chrome_path = PARTIALS / "chrome.html"
    if not chrome_path.exists():
        sys.exit("ERROR: _partials/chrome.html is missing.")

    chrome = chrome_path.read_text(encoding="utf-8")
    head_tpl = block(chrome, "HEAD")
    nav = block(chrome, "NAV")
    footer = block(chrome, "FOOTER")

    meta_path = PARTIALS / "pages.json"
    pages = json.loads(meta_path.read_text(encoding="utf-8"))

    written = []
    for page in pages:
        slug = page["slug"]
        body_file = PAGES_DIR / page["body"]
        if not body_file.exists():
            sys.exit(f"ERROR: body fragment missing: {body_file}")
        body = body_file.read_text(encoding="utf-8").strip()

        head = head_tpl
        for key, val in {
            "TITLE": page["title"],
            "DESC": page["description"],
            "KEYWORDS": page.get("keywords", ""),
            "ROBOTS": page.get("robots", "index, follow"),
            "SLUG": "" if slug == "index.html" else slug,
            "OGTYPE": page.get("og_type", "website"),
            "OGTITLE": page.get("og_title", page["title"]),
            "OGDESC": page.get("og_description", page["description"]),
        }.items():
            head = head.replace("{{" + key + "}}", val)

        schema = ""
        for s in page.get("schema", []):
            schema += (
                '\n<script type="application/ld+json">\n'
                + json.dumps(s, indent=2, ensure_ascii=False)
                + "\n</script>"
            )

        scripts = "".join(
            f'\n<script src="{s}" defer></script>' if not s.startswith("http")
            else f'\n<script src="{s}"></script>'
            for s in page.get("scripts", [])
        )

        html = (
            "<!DOCTYPE html>\n"
            '<html lang="en">\n<head>\n'
            f"{head}{schema}\n"
            "</head>\n<body>\n\n"
            f"{nav}\n\n"
            f'<main id="main">\n{body}\n</main>\n\n'
            f"{footer}\n"
            '\n<script src="/js/app.js" defer></script>'
            f"{scripts}\n"
            "</body>\n</html>\n"
        )

        out = ROOT / slug
        out.write_text(html, encoding="utf-8")
        written.append(slug)
        print(f"  built  {slug:20s} {len(html):>7,} bytes")

    # ---- sitemap ----
    today = date.today().isoformat()
    urls = []
    for page in pages:
        if "noindex" in page.get("robots", ""):
            continue
        loc = SITE + "/" + ("" if page["slug"] == "index.html" else page["slug"])
        urls.append(
            f"  <url>\n    <loc>{loc}</loc>\n"
            f"    <lastmod>{today}</lastmod>\n"
            f"    <changefreq>{page.get('changefreq','monthly')}</changefreq>\n"
            f"    <priority>{page.get('priority','0.7')}</priority>\n  </url>"
        )
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n",
        encoding="utf-8",
    )
    print(f"  built  sitemap.xml         ({len(urls)} urls)")
    print(f"\nDone. {len(written)} pages written.")


if __name__ == "__main__":
    main()
