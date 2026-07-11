#!/usr/bin/env bash
# Rebuild the three CV PDFs from the HTML sources in this directory.
# EN/FR use wkhtmltopdf (matches the shipped typography — DejaVu Sans via Qt WebKit).
# AR uses headless Chromium (Playwright): wkhtmltopdf's WebKit shapes Arabic badly.
set -euo pipefail
cd "$(dirname "$0")"
REPO="$(cd ../.. && pwd)"

wkhtmltopdf --page-size Letter -T 0 -B 0 -L 0 -R 0 --enable-local-file-access -q \
  cv_en.html "$REPO/Raed_Ouiriemmi_CV.pdf"
wkhtmltopdf --page-size Letter -T 0 -B 0 -L 0 -R 0 --enable-local-file-access -q \
  cv_fr.html "$REPO/Raed_Ouiriemmi_CV_FR.pdf"

# Needs: pip install playwright && playwright install chromium
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
import pathlib
here = pathlib.Path(__file__ if "__file__" in dir() else ".").resolve()
src = pathlib.Path("cv_ar.html").resolve()
out = pathlib.Path("../../Raed_Ouiriemmi_CV_AR.pdf").resolve()
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto(src.as_uri())
    pg.wait_for_timeout(600)
    pg.pdf(path=str(out), format="Letter", print_background=True,
           margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
    b.close()
print("AR pdf generated")
EOF

echo "done — check page counts:"
for f in "$REPO"/Raed_Ouiriemmi_CV*.pdf; do
  printf '%s: ' "$(basename "$f")"; pdfinfo "$f" | grep Pages
done
