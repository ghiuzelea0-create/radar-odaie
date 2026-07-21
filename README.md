# Lut & Lemn — atelier de obiecte handmade

Site vitrină pentru un atelier de obiecte handmade: ceramică, iluminat, textile și accente. Colecția de bază e fixă, iar `products.json` e completat automat, zilnic, de un robot care caută produse virale/în trend (vezi `agent.py` și `.github/workflows/radar.yml`).

**Site live:** `https://ghiuzelea0-create.github.io/radar-odaie/` (după activarea GitHub Pages — vezi mai jos)

## Structură

- `index.html` — tot site-ul (HTML + CSS + JS într-un singur fișier, fără build)
- `products.json` — produsele "trending" adăugate automat de robot, citite de site prin `fetch`
- `agent.py` — robotul zilnic de product research (caută pe web, scrie `products.json`, trimite alertă Telegram)
- `assets/og-image.png` — imaginea de previzualizare pentru distribuire pe rețele sociale (Open Graph)
- `assets/social/` — grafică 1080×1080 gata de postat pe Instagram/Facebook
- `assets/email-lansare.html` — template de email pentru anunțul de lansare
- `robots.txt`, `sitemap.xml` — indexare pentru motoare de căutare
- `.github/workflows/radar.yml` — rulează `agent.py` zilnic
- `.github/workflows/deploy-pages.yml` — publică site-ul pe GitHub Pages la fiecare push pe `main`
- `PROMOVARE.md` — caption-uri, bio și hashtag-uri gata de folosit pentru rețele sociale

## Poze reale de produs

Fiecare produs poate avea o poză reală: în `products.json`, completează câmpul `img` cu un URL `https://...` valid (în loc de `LINK_POZA`). Site-ul o afișează automat peste ilustrația vectorială; dacă link-ul nu se încarcă, revine la ilustrație.

## Activare GitHub Pages (o singură dată)

1. **Settings → Pages** din repo
2. La **Source**, alege **GitHub Actions**
3. La următorul push pe `main`, workflow-ul `deploy-pages.yml` publică automat site-ul

## Secrete necesare pentru robotul zilnic

Setate în **Settings → Secrets and variables → Actions**:

- `ANTHROPIC_API_KEY` — obligatoriu
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — opționale, pentru alerta zilnică
