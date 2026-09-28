# Instalare pe calculatorul tău

Aplicația Arca are două părți care lucrează împreună:

| Parte | Adresă | La ce folosește |
|---|---|---|
| **Aplicația Arca** | `http://localhost:5000` | Aici **introduci** date: devize, corpuri, proiecte, flux |
| **Dashboard Operations** | `http://localhost:3000` | Aici **vezi** situația: indicatori, registru, încărcare producție |

Amândouă rulează local, pe calculatorul tău. Datele rămân la tine — nu se trimit nicăieri.

---

## Pasul 1 — Instalează cele două programe necesare

Se face **o singură dată**.

### Windows

1. **Python** — descarcă de la <https://www.python.org/downloads/>
   La instalare, bifează căsuța **„Add Python to PATH"** (jos, în prima fereastră). E important.
2. **Node.js** — descarcă versiunea **LTS** de la <https://nodejs.org/>
   Apasă Next la toate ferestrele.

### macOS

Deschide aplicația **Terminal** și rulează:

```bash
# Instalează Homebrew (dacă nu îl ai deja)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install python node
```

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y python3 python3-venv nodejs npm
```

> Node.js trebuie să fie versiunea **20 sau mai nouă**. Verifici cu `node -v`.
> Dacă e mai veche, instalează de la <https://nodejs.org/>.

---

## Pasul 2 — Descarcă proiectul

Dacă ai **Git** instalat:

```bash
git clone https://github.com/ghiuzelea0-create/radar-odaie.git
cd radar-odaie
```

Dacă nu ai Git: intră pe pagina proiectului pe GitHub, apasă butonul verde **Code → Download ZIP**, apoi dezarhivează folderul unde vrei să stea.

---

## Pasul 3 — Pornește

### Windows

Dublu-click pe fișierul **`start.bat`**.

### macOS / Linux

Deschide Terminal în folderul proiectului și rulează:

```bash
./start.sh
```

Dacă îți spune că nu are permisiune, rulează întâi o dată:

```bash
chmod +x start.sh
```

**Prima pornire durează câteva minute** — se descarcă și se instalează tot ce trebuie.
Pornirile următoare durează câteva secunde.

Când termină, deschide în browser: **<http://localhost:3000>**

---

## Cum folosești

1. Deschide **<http://localhost:5000>** (aplicația Arca) → meniul **Management** → **Proiect nou**.
2. Completează proiectul: cod, client, termen promis, valoare, marjă ofertată.
3. Deschide **<http://localhost:3000>** (dashboard) și reîncarcă pagina — proiectul apare, iar indicatorii se recalculează singuri.

Dashboard-ul **doar citește** datele. Tot ce se introduce se introduce în aplicația Arca,
ca să existe o singură sursă de adevăr.

Cu cât completezi mai mult (jurnal de flux, cauze de întârziere, calculator de termen
realist), cu atât dashboard-ul are ce arăta. Unde datele lipsesc, îți spune explicit ce
mai e nevoie — nu inventează cifre.

---

## Oprire

- **Windows:** închide cele două ferestre negre care s-au deschis.
- **macOS / Linux:** apasă `Ctrl+C` în Terminal.

---

## De pe telefon sau de pe alt calculator din hală

Aplicația **nu se instalează pe telefon**. Rulează în continuare pe calculatorul din
hală, iar telefonul o deschide prin Wi-Fi, ca pe orice site. Calculatorul trebuie să fie
pornit, cu aplicația în funcțiune, iar telefonul pe **aceeași rețea Wi-Fi**.

### Pasul 1 — află adresa calculatorului în rețea

**Windows** — deschide Command Prompt și scrie:

```
ipconfig
```

Caută linia **IPv4 Address**, ceva de forma `192.168.1.24`.

**macOS / Linux:**

```bash
hostname -I | awk '{print $1}'      # Linux
ipconfig getifaddr en0              # macOS (Wi-Fi)
```

### Pasul 2 — deschide pe telefon

În browserul telefonului, scrie adresa găsită urmată de `:3000`:

```
http://192.168.1.24:3000
```

(înlocuiește cu adresa ta). Aplicația Arca e la același IP, pe portul `5000`.

Butoanele din dashboard către aplicația Arca funcționează automat de pe telefon —
folosesc adresa din bara ta de adrese, nu `localhost`.

### Pune-o ca pictogramă pe ecranul telefonului

Ca să arate ca o aplicație, nu ca un site:

- **iPhone (Safari):** butonul de partajare → **Add to Home Screen**
- **Android (Chrome):** meniul ⋮ → **Adaugă la ecranul de pornire**

### Dacă telefonul nu se conectează

Cel mai probabil e firewall-ul calculatorului. Trebuie să permiți porturile 3000 și 5000
în rețeaua locală:

- **Windows:** la prima pornire apare o fereastră „Windows Defender Firewall". Bifează
  **Rețele private** și apasă **Allow access**. Dacă ai respins-o din greșeală:
  Control Panel → Windows Defender Firewall → Allow an app through firewall.
- **macOS:** System Settings → Network → Firewall → Options → permite `python` și `node`.
- Verifică și că amândouă sunt pe **aceeași rețea** (nu telefonul pe date mobile, și nu
  pe o rețea „Guest" — multe routere izolează dispozitivele între ele pe rețeaua de
  oaspeți).

### De reținut, pentru siguranță

Aplicația **nu are parolă**. Oricine e conectat la aceeași rețea Wi-Fi și știe adresa
poate vedea proiectele, valorile și marjele. Concret:

- ține-o pe rețeaua Wi-Fi a firmei, cu parolă, nu pe una deschisă sau de oaspeți;
- nu deschide porturile 3000 și 5000 către internet din router;
- pentru acces **din afara halei** (de acasă, de pe drum), nu deschide un port în
  router — aplicația n-are parolă. Folosește un VPN: pașii sunt în
  **[ACCES-DE-LA-DISTANTA.md](ACCES-DE-LA-DISTANTA.md)**.

---

## Verifică mai întâi datele de calcul

Înainte de a folosi devizele pentru oferte reale către clienți, intră la
**<http://localhost:5000/parametri>** și verifică:

- pierderea tehnologică (implicit 10% PAL/MDF, 15% lemn masiv);
- regia (15%), rezerva de risc (5%);
- adaosul comercial este **48,85%** — nu e o ipoteză, ci valoarea care produce
  marja-țintă de 35%. Dacă schimbi ținta, pagina îți arată ce adaos îi corespunde;
- gradul de utilizare productivă (75%).

Acestea sunt **ipoteze de pornire**, nu valorile tale reale.

Apoi intră la **<http://localhost:5000/nomenclator>** și treci pe datele tale:

- **prețurile de contract** de la furnizor (cele din nomenclator sunt prețuri retail de
  raft — ca producător plătești sub ele);
- **salariile brute pe fază**, care acum sunt estimări ancorate pe salariul minim.

Pagina îți arată câte materiale mai sunt pe preț retail, dintre care câte au intrat deja
în devize, și îți dă lista de cerut la furnizor ca fișier pentru Excel.
Detalii în `arca-app/README.md`.

---

## Dacă ceva nu merge

| Problemă | Rezolvare |
|---|---|
| `python nu este recunoscut` (Windows) | Reinstalează Python și bifează **„Add Python to PATH"** |
| `node: command not found` | Instalează Node.js de la <https://nodejs.org/> |
| „Node.js este versiunea 18, dar e nevoie de 20" | Instalează versiunea **LTS** de la <https://nodejs.org/> |
| Portul 3000 sau 5000 e ocupat | Închide programul care îl folosește, sau vezi mai jos |
| Dashboard-ul spune „Nu există încă proiecte" | Normal la început — adaugă un proiect în aplicația Arca (pasul 1 de la „Cum folosești") |

### Alte porturi

Dacă porturile implicite sunt ocupate:

```bash
# aplicatia Arca pe alt port
cd arca-app && PORT=5001 ./.venv/bin/python app.py

# dashboardul pe alt port, stiind unde e aplicatia Arca
cd arca-operations
NEXT_PUBLIC_ARCA_APP_URL=http://localhost:5001 npm run build
npm run start -- -p 3001
```

### Aplicațiile în foldere diferite

Dacă muți dashboard-ul în altă parte, spune-i unde sunt datele:

```bash
export ARCA_DATA_DIR=/cale/catre/arca-app/data
```
