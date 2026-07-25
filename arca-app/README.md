# ARCA — Costing & Ofertare

Aplicație web + agent Claude pentru modulul **Costing și Ofertare** din arhitectura
ARCA AI ORCHESTRATOR (Arca Interiors / Arca Fancons SRL). Prima versiune funcțională
implementează un singur modul (cel mai concret, cu date reale disponibile): calculul de
deviz, oferta comercială pentru client și verificarea marjei — pe baza datelor reale din
`arcacosting.xlsx` (parametri, nomenclator materiale Egger/Kronospan/Kastamonu/Blum/Hafele,
nomenclator manoperă).

Motorul de calcul (`costing_engine.py`) replică exact formulele din foile PARAMETRI,
NOMENCLATOR MATERIALE, NOMENCLATOR MANOPERA, DEVIZ, OFERTA și VERIFICARE MARJA ale
workbook-ului original — validat prin teste automate (`tests/test_costing_engine.py`)
care reproduc exemplul real din workbook (corp bucătărie 800mm) cifră cu cifră.

## Instalare

```bash
cd arca-app
pip install -r requirements.txt
```

## Rulare

```bash
python3 app.py
```

Aplicația pornește implicit pe `http://localhost:5000` (portul poate fi schimbat cu
variabila de mediu `PORT`).

## Agentul QA (opțional, necesită cheie API)

Butonul „Ruleaza verificarea QA" din pagina unui deviz trimite devizul calculat către
Claude, cu rolul de Agent QA și Validare (verifică calculele, presupunerile ascunse,
contradicțiile, fezabilitatea și acordă un scor de încredere 1–10). Necesită:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Fără această variabilă, aplicația rămâne complet funcțională pentru calculul de deviz —
doar butonul QA afișează un mesaj clar în loc să eșueze silențios sau să inventeze un
rezultat. Modelul folosit implicit este `claude-sonnet-5`; poate fi schimbat cu
`ARCA_QA_MODEL`.

## Teste

```bash
python3 -m pytest tests/ -v
```

## Structură

- `costing_engine.py` — motorul de calcul (funcții pure, testabile)
- `qa_agent.py` — integrarea cu Claude API pentru verificarea QA
- `storage.py` — persistență locală a devizelor (fișiere JSON în `data/devize/`)
- `app.py` — aplicația Flask (rute, formulare)
- `data/parametri.json`, `data/materiale.json`, `data/manopera.json` — datele reale
  extrase din `arcacosting.xlsx`
- `templates/`, `static/` — interfața web

## Ipoteze și limite ale datelor (din foaia SURSE DATE a workbook-ului original)

Date culese public la 25.07.2026 — verifică-le periodic, nu le trata ca fixe:

- **FAPT** — TVA standard 21% (Legea 141/2025); salariu minim brut 4.325 lei din
  1 iulie 2026 (HG 146/2026); CAM 2,25%.
- **FAPT, dar RETAIL** — prețurile PAL Egger/Kronospan/Kastamonu din nomenclator sunt
  prețuri retail publice (Mathaus, 25.07.2026). Ca producător, prețul de contract e
  probabil sub aceste valori — completează coloana `pret_contract` în
  `data/materiale.json` cu prețurile tale reale de la furnizor.
- **LIPSĂ** — sertare Blum LEGRABOX și balamale/glisiere Hafele nu au preț public
  (Luxfer/Hafele cer ofertă). Aceste linii apar cu preț 0 în nomenclator — nu introduce
  o cantitate pentru ele într-un deviz real fără să confirmi prețul întâi.
- **ESTIMARE cu incertitudine medie-mare** — salariile brute pe fază și regiune
  (Nomenclator Manoperă) sunt estimări ancorate pe salariul minim, salariul mediu pe
  economie și anunțuri reale de angajare, NU salarii reale Arca. Înlocuiește-le în
  `data/manopera.json` sau din pagina „Parametri" cu propriile date înainte de a folosi
  devizele pentru oferte reale către clienți.
- **IPOTEZE editabile** — pierderea tehnologică (10% PAL/MDF, 15% lemn masiv), regia
  (15%), adaosul comercial (30%), rezerva de risc (5%) și gradul de utilizare productivă
  (75%) sunt valori de pornire. Ajustează-le din pagina „Parametri" la randamentul real
  al atelierului.

## Ce nu acoperă această versiune

Scopul v1 este exclusiv modulul Costing & Ofertare. Nu sunt incluse (rămân pentru etape
ulterioare, pe baza celorlalte fișiere încărcate — `arcatechspec.xlsx`,
`arcatechspecproiect.xlsx`, `arcaflux.xlsx`):

- calculatorul parametric de corp de mobilier (listă de debitare, feronerie generate
  automat din dimensiuni) — Agent Proiectare;
- managementul fluxului de proiecte, termene și KPI — Agent Management Fabrică;
- module Web Design și Product Design.
