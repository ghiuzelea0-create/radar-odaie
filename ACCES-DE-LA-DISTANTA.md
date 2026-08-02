# Acces la aplicație din afara halei

Aplicația rulează pe calculatorul din hală. Pe Wi-Fi-ul firmei o deschizi direct
(vezi `INSTALARE.md`). Ghidul ăsta e pentru când ești **în altă parte** — acasă,
pe șantier, pe drum.

Soluția: **Tailscale**, un VPN care leagă telefonul tău de calculatorul din hală
ca și cum ar fi pe aceeași rețea. Nimic nu se publică pe internet.

## De ce așa și nu altfel

| | Tailscale | Deschis port în router |
|---|---|---|
| Cine ajunge la aplicație | doar dispozitivele tale | oricine găsește adresa |
| Parolă în aplicație | nu e nevoie | **obligatorie** — nu există încă |
| Unde stau datele | pe calculatorul tău | pe calculatorul tău |
| Cost | gratuit (până la 100 dispozitive) | gratuit |

Aplicația **nu are niciun fel de autentificare**. Deschiderea unui port în router
ar face devizele, marjele și clienții accesibile oricui nimerește adresa. Tailscale
rezolvă asta fără să construim un sistem de login.

**Condiția rămâne: calculatorul din hală trebuie să fie pornit, cu aplicația
pornită.** Tailscale nu schimbă asta — dacă vrei acces și cu calculatorul oprit,
aplicația trebuie mutată pe un server, iar atunci autentificarea devine
obligatorie.

## Pasul 1 — cont

Intră pe <https://tailscale.com>, apasă **Get started** și fă-ți cont (poți
folosi contul Google). E gratuit pentru uz personal / firmă mică.

## Pasul 2 — pe calculatorul din hală

Descarcă și instalează Tailscale de la <https://tailscale.com/download>, apoi
conectează-te cu contul de mai sus.

După instalare, calculatorul primește un nume în rețeaua ta Tailscale —
ceva de forma `desktop-arca`. Îl vezi în fereastra Tailscale sau pe
<https://login.tailscale.com/admin/machines>.

> **Ține minte numele.** Cu el vei deschide aplicația de pe telefon.

Ca să nu trebuiască să reconectezi de fiecare dată:
- **Windows:** Tailscale pornește singur cu calculatorul (implicit).
- Pe pagina de administrare, la calculatorul tău: **Disable key expiry**.
  Fără asta, conexiunea expiră după ~6 luni și trebuie reautorizată.

## Pasul 3 — pe telefon

Instalează **Tailscale** din App Store (iPhone) sau Google Play (Android) și
conectează-te cu **același cont**. Pornește comutatorul din aplicație.

## Pasul 4 — deschide aplicația

În browserul telefonului:

```
http://desktop-arca:3000     ← dashboard (situația zilei)
http://desktop-arca:5000     ← aplicația Arca (introduci date)
```

(înlocuiește `desktop-arca` cu numele calculatorului tău)

Dacă numele nu merge, folosește adresa Tailscale a calculatorului — o găsești pe
pagina de administrare, arată ca `100.x.y.z`:

```
http://100.101.102.103:3000
```

Butoanele din dashboard către aplicația Arca funcționează automat: folosesc
aceeași adresă din bara ta de adrese. Nu e nevoie să configurezi nimic în
aplicație. *(Verificat: accesată printr-un nume de gazdă, aplicația generează
link-uri corecte către același nume, nu către `localhost`.)*

Pune-o pe ecranul telefonului ca să arate ca o aplicație:
- **iPhone (Safari):** butonul de partajare → **Add to Home Screen**
- **Android (Chrome):** meniul ⋮ → **Adaugă la ecranul de pornire**

## Dacă nu merge

| Problemă | Ce verifici |
|---|---|
| Telefonul nu deschide pagina | Comutatorul Tailscale e pornit pe **ambele** dispozitive? |
| Numele nu e găsit | Folosește adresa `100.x.y.z` din pagina de administrare |
| Pagina nu se încarcă deloc | Aplicația e pornită pe calculator? (`start.bat` / `start.sh`) |
| Mergea, acum nu mai merge | Conexiunea a expirat — reconectează-te, apoi **Disable key expiry** |
| Merge dashboard-ul, nu și Arca | Firewall-ul blochează portul 5000 — vezi `INSTALARE.md` |

## De reținut

Tailscale rezolvă **cine ajunge** la aplicație, nu **cine o poate folosi odată
ajuns**. Orice dispozitiv conectat la contul tău Tailscale vede tot: proiecte,
devize, marje, clienți.

Practic:
- nu adăuga în rețeaua Tailscale dispozitive pe care nu le controlezi;
- dacă pierzi telefonul, șterge-l imediat din
  <https://login.tailscale.com/admin/machines>;
- dacă vrei ca fiecare angajat să aibă acces limitat la ce îl privește, asta cere
  autentificare în aplicație — nu există încă.
