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

## Verifică mai întâi datele de calcul

Înainte de a folosi devizele pentru oferte reale către clienți, intră la
**<http://localhost:5000/parametri>** și verifică:

- pierderea tehnologică (implicit 10% PAL/MDF, 15% lemn masiv);
- regia (15%), adaosul comercial (30%), rezerva de risc (5%);
- gradul de utilizare productivă (75%).

Acestea sunt **ipoteze de pornire**, nu valorile tale reale. La fel, salariile pe fază din
nomenclatorul de manoperă sunt estimări ancorate pe salariul minim, nu salariile Arca.
Înlocuiește-le cu cifrele tale. Detalii în `arca-app/README.md`.

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
