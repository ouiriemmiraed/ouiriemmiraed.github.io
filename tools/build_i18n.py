#!/usr/bin/env python3
"""Pre-render the FR and AR versions of the portfolio as static pages.

Reads index.html + i18n.js and writes fr/index.html and ar/index.html with the
translations baked in, so search engines can index all three languages
(hreflang cluster: / = en, /fr/, /ar/).

Run from the repo root after ANY content change to index.html or i18n.js:
    python3 tools/build_i18n.py   (needs beautifulsoup4 + node on PATH)
"""
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://ouiriemmiraed.me"
LANGS = {
    "fr": {"dir": "ltr", "og": "fr_FR", "cv": "Raed_Ouiriemmi_CV_FR.pdf"},
    "ar": {"dir": "rtl", "og": "ar_TN", "cv": "Raed_Ouiriemmi_CV_AR.pdf"},
}
OG_ALL = {"en": "en_US", "fr": "fr_FR", "ar": "ar_TN"}
CAIRO = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
# Same-page theme bootstrap, minus the language handling: these pages are
# locked to one language, so only the saved theme must apply before paint.
THEME_ONLY_BOOT = (
    '\n    (function () {\n'
    '      try {\n'
    '        document.documentElement.setAttribute("data-theme", '
    'localStorage.getItem("theme") || "light");\n'
    '      } catch (e) {}\n'
    '    })();\n  '
)
KEEP_PREFIXES = ("http://", "https://", "//", "#", "mailto:", "tel:", "data:", "/")


def load_i18n():
    js = (ROOT / "i18n.js").read_text(encoding="utf-8")
    out = subprocess.run(
        ["node", "-e",
         'const src = require("fs").readFileSync(process.argv[1], "utf8");'
         'eval(src.replace("const I18N", "globalThis.I18N"));'
         'console.log(JSON.stringify(I18N));',
         str(ROOT / "i18n.js")],
        capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def set_inner_html(el, html):
    frag = BeautifulSoup(html, "html.parser")
    el.clear()
    for child in list(frag.contents):
        el.append(child.extract())


def absolutize(soup):
    for attr in ("href", "src", "srcset"):
        for el in soup.find_all(attrs={attr: True}):
            v = el[attr]
            if v and not v.startswith(KEEP_PREFIXES):
                el[attr] = "/" + v


def meta(soup, **query):
    tag = soup.find("meta", attrs=query)
    if tag is None:
        raise SystemExit(f"meta not found: {query}")
    return tag


def build(lang, dict_, src_html):
    cfg = LANGS[lang]
    url = f"{BASE}/{lang}/"
    soup = BeautifulSoup(src_html, "html.parser")

    html = soup.find("html")
    html["lang"] = lang
    html["dir"] = cfg["dir"]
    html["data-default-lang"] = lang

    # Theme-only pre-paint bootstrap (language is fixed by the page itself).
    for script in soup.find_all("script"):
        if script.string and "data-theme" in script.string and "cairoFont" in script.string:
            script.string = THEME_ONLY_BOOT
            break

    soup.title.string = dict_["doc.title"]
    meta(soup, name="description")["content"] = dict_["doc.desc"]

    soup.find("link", rel="canonical")["href"] = url
    meta(soup, property="og:url")["content"] = url
    meta(soup, property="og:title")["content"] = dict_["doc.title"]
    meta(soup, property="og:description")["content"] = dict_["doc.desc"]
    meta(soup, property="og:image:alt")["content"] = dict_["doc.title"]
    meta(soup, name="twitter:title")["content"] = dict_["doc.title"]
    meta(soup, name="twitter:description")["content"] = dict_["doc.desc"]
    meta(soup, name="twitter:image:alt")["content"] = dict_["doc.title"]

    meta(soup, property="og:locale")["content"] = cfg["og"]
    others = [v for k, v in OG_ALL.items() if k != lang]
    for tag, loc in zip(soup.find_all("meta", property="og:locale:alternate"), others):
        tag["content"] = loc

    # JSON-LD: the Person/WebSite entities stay shared; the page node is per-URL.
    ld = soup.find("script", type="application/ld+json")
    data = json.loads(ld.string)
    for node in data["@graph"]:
        if node.get("@type") == "ProfilePage":
            node["@id"] = url + "#webpage"
            node["url"] = url
            node["name"] = dict_["doc.title"]
            node["inLanguage"] = lang
    ld.string = json.dumps(data, ensure_ascii=False, indent=2)

    # Arabic needs the Cairo font from first paint.
    if lang == "ar":
        fonts = soup.find("link", href=lambda h: h and "Space+Grotesk" in h)
        cairo = soup.new_tag("link", id="cairoFont", rel="stylesheet", href=CAIRO)
        fonts.insert_after(cairo)

    for el in soup.find_all(attrs={"data-i18n": True}):
        v = dict_.get(el["data-i18n"])
        if v is not None:
            set_inner_html(el, v)
    for el in soup.find_all(attrs={"data-i18n-aria": True}):
        v = dict_.get(el["data-i18n-aria"])
        if v is not None:
            el["aria-label"] = v

    for a in soup.select("a.cv-link"):
        a["href"] = "/" + cfg["cv"]
        a["download"] = cfg["cv"]

    opt = soup.find("option", value=lang)
    opt["selected"] = "selected"

    absolutize(soup)

    out = ROOT / lang / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(str(soup), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size} bytes)")


def stamp_sitemap():
    """Keep <lastmod> honest: stamp today's date whenever the site is rebuilt."""
    sm = ROOT / "sitemap.xml"
    today = datetime.date.today().isoformat()
    txt = sm.read_text(encoding="utf-8")
    new = re.sub(r"<lastmod>\d{4}-\d{2}-\d{2}</lastmod>", f"<lastmod>{today}</lastmod>", txt)
    if new != txt:
        sm.write_text(new, encoding="utf-8")
        print(f"stamped sitemap.xml lastmod -> {today}")


def main():
    i18n = load_i18n()
    src_html = (ROOT / "index.html").read_text(encoding="utf-8")
    for lang in LANGS:
        build(lang, i18n[lang], src_html)
    stamp_sitemap()


if __name__ == "__main__":
    main()
