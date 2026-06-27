# Raed Ouiriemmi — Portfolio

A fast, responsive single-page portfolio (HTML + CSS + vanilla JS). No build step, no
dependencies — just static files, perfect for GitHub Pages.

## Files
- `index.html` — all the content (edit text/projects here)
- `style.css` — styling, dark/light theme tokens at the top
- `script.js` — theme toggle, mobile menu, scroll reveals, count-up
- `Raed_Ouiriemmi_CV.pdf` — downloadable CV (linked from the hero + contact)
- `.nojekyll` — tells GitHub Pages to serve files as-is

## Before you publish — fill in 2 links
In `index.html`, replace these placeholders with your real profiles:
- `https://github.com/YOUR_USERNAME`
- `https://linkedin.com/in/YOUR_USERNAME`

## Preview locally
```bash
cd portfolio
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy to GitHub Pages (user site)
```bash
git init
git add .
git commit -m "Initial portfolio"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_USERNAME.github.io.git
git push -u origin main
```
Then: repo **Settings → Pages → Deploy from branch → main / root**.
Live at `https://YOUR_USERNAME.github.io`.

## Custom domain (.me from Namecheap Student Pack)
Add the GitHub Pages DNS records in Namecheap (4× A records to 185.199.108–111.153,
plus a `www` CNAME to `YOUR_USERNAME.github.io`), then set the custom domain under
**Settings → Pages → Custom domain** and tick **Enforce HTTPS**.
