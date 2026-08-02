# ARCA — Costing & Ofertare + Proiectare + Management

Aplicație web + agent Claude pentru arhitectura ARCA AI ORCHESTRATOR (Arca Interiors /
Arca Fancons SRL). Implementează patru module funcționale, pe baza datelor reale din
fișierele Excel încărcate:

- **Costing & Ofertare** — calculul de deviz, oferta comercială pentru client și
  verificarea marjei, pe baza datelor din `arcacosting.xlsx` (parametri, nomenclator
  materiale Egger/Kronospan/Kastamonu/Blum/Hafele, nomenclator manoperă).
- **Proiectare** — calculatorul parametric de corp de mobilier, pe baza datelor din
  `arcatechspec.xlsx` (verificare geometrică automată, listă de debitare, listă
  feronerie, consum de material).
- **Proiecte tehnice (multi-corp)** — agregarea mai multor tipuri de corp (fiecare cu
  bucăți identice) într-un proiect complet, pe baza datelor din
  `arcatechspecproiect.xlsx` (listă de debitare pe tot proiectul, consum pe decor,
  feronerie agregată, control încrucișat).
- **Management** — calculator de termen realist, registru de proiecte, jurnal de flux,
  jurnal de cauze de întârziere cu analiză Pareto și 7 KPI, pe baza datelor din
  `arcaflux.xlsx`.

Motoarele de calcul (`costing_engine.py`, `design_engine.py`, `proiect_engine.py`,
`management_engine.py`) replică exact formulele din workbook-urile originale —
validate prin teste automate (`tests/`) care reproduc cifră cu cifră exemplele reale
din toate cele patru fișiere.

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

- `costing_engine.py` — motorul de calcul deviz/ofertă (funcții pure, testabile)
- `design_engine.py` — motorul de proiectare parametrică a corpului de mobilier
  (verificare geometrică, listă de debitare, feronerie, consum)
- `proiect_engine.py` — motorul de agregare multi-corp (reutilizează `design_engine`
  pentru fiecare tip de corp, apoi însumează la nivel de proiect)
- `management_engine.py` — motorul de management (termen realist, registru proiecte,
  jurnal flux, Pareto cauze de întârziere, KPI)
- `qa_agent.py` — integrarea cu Claude API pentru verificarea QA
- `storage.py` — persistență locală (fișiere JSON în `data/devize/`, `data/corpuri/`,
  `data/proiecte_tehnice/`, `data/proiecte_management/`, `data/evenimente_cauze/`)
- `app.py` — aplicația Flask (rute, formulare)
- `data/parametri.json`, `data/materiale.json`, `data/manopera.json` — datele reale
  extrase din `arcacosting.xlsx`
- `templates/`, `static/` — interfața web

## Modulul Proiectare

Pagina „Proiectare" permite introducerea parametrilor unui corp de mobilier (dimensiuni
de gabarit, comutatoare de construcție, convenții de execuție) și generează automat:

- **verificarea geometrică** — confirmă că piesele reconstituie gabaritul cerut;
- **lista de debitare** — cele 9 tipuri de piese (laterale, fund, capac, traverse, raft,
  spate, fronturi uși/sertare) cu dimensiuni, direcție fibră și cant, calculate din
  comutatoarele alese (tip construcție, tip închidere sus, număr uși/sertare/rafturi);
- **lista de feronerie** — balamale, plăcuțe, picioare reglabile, suporți raft, glisiere
  sertar, șuruburi — cu regulile de calcul din workbook (ex: număr balamale în funcție de
  înălțimea frontului);
- **consumul de material** — suprafață netă și necesar cu pierdere tehnologică aplicată,
  plus număr de plăci — gata de transferat manual în Deviz (buton „Deschide Deviz nou" pe
  pagina de detaliu a corpului).

Transferul dintre Proiectare și Costing rămâne manual (ca în workbook-ul original): pagina
de detaliu a corpului afișează clar cifrele de introdus, dar utilizatorul alege decorul
exact (Egger/Kronospan/Kastamonu) din nomenclator la crearea devizului.

## Adaos vs. marjă (pagina Parametri)

Motorul stabilește prețul ca `cost × (1 + adaos + rezervă)`. De aici rezultă că
**marja brută nu e egală cu adaosul** și că ea **nu depinde de mărimea devizului** —
doar de acești doi parametri. Cu valorile implicite (adaos 30%, rezervă 5%) marja
care iese este 25,9%, nu 30% și nu 35%.

Pagina Parametri afișează acum relația explicit: ce marjă rezultă din adaosul curent,
ce adaos ar cere marja-țintă, și un tabel de scenarii. Ultimele două coloane arată,
față de adaosul actual, cu cât crește prețul pentru client și cu cât crește ce îți
rămâne ție. Fiind rapoarte determinate exclusiv de parametri, sunt valabile la orice
ofertă. Costul nu se schimbă între scenarii — de aceea câștigul crește mult mai
repede decât prețul (de la 25,9% la 35% marjă: preț +14,0%, câștig +53,8%).

Dacă la prețul mai mare pierzi comenzi, calculul se schimbă — dar aceea e o decizie
de piață, nu una de parametri, și aplicația nu o poate lua în locul tău.

Formulele stau în `costing_engine.py`, lângă cea de preț, iar un test rulează motorul
real la mai multe valori de adaos și verifică că marja anunțată coincide cu cea
calculată efectiv în deviz — ca pagina Parametri să nu poată afișa altceva decât
devizele.

## Legătura deviz ↔ proiect

La crearea unui deviz, proiectul se alege dintr-o listă cu proiectele din registrul de
Management. Există și opțiunea „Alt proiect — scriu codul de mână", pentru ofertele făcute
înainte ca proiectul să fie înregistrat; folosește atunci același cod la înregistrare, ca
să se lege între ele. Codurile se compară ignorând spațiile și diferența de litere mari/mici.

Pe pagina unui proiect apare secțiunea **Devize legate de acest proiect**: fiecare deviz cu
preț, cost și marjă, plus totalul ofertat. Dedesubt, marja **tastată** în registru e
comparată cu cea **calculată** de devize. Când diferă cu peste 0,5 puncte procentuale,
pagina o semnalează — una dintre cifre e greșită, iar dacă cea greșită e din registru,
indicatorul de erodare a marjei te liniștește degeaba.

Logica de legătură stă în `legaturi.py` (funcții pure, testate în `tests/test_legaturi.py`).
Dashboardul `arca-operations` folosește aceeași normalizare a codurilor, ca cele două
aplicații să nu arate legături diferite pentru aceleași date.

## Modulul Proiecte tehnice (multi-corp)

Pagina „Proiecte" (`/proiect-tehnic`) permite construirea unui proiect complet (ex: o
bucătărie întreagă) din mai multe **tipuri** de corp: creezi proiectul, apoi adaugi pe
rând fiecare tip de corp (cod, denumire, dimensiuni, comutatoare, decor corp/front,
număr de bucăți identice — ex: 2× același corp de 600mm). Pentru fiecare tip de corp
se reutilizează exact motorul din Proiectare; rezultatele sunt apoi înmulțite cu numărul
de bucăți identice și însumate la nivel de proiect:

- **listă de debitare completă** pe tot proiectul (toate piesele tuturor corpurilor,
  cu decorul exact ales pentru fiecare);
- **consum pe decor** — câte plăci cumperi din fiecare decor folosit în proiect (un
  decor poate apărea atât ca decor de corp cât și de front, la corpuri diferite);
- **feronerie agregată** — total balamale, glisiere, șuruburi etc. pe tot proiectul;
- **control încrucișat** — verifică independent că suma agregată pe tipuri de corp
  coincide cu suma piesă cu piesă din lista de debitare (la fel ca în workbook-ul
  original, ca sistem de siguranță împotriva erorilor de formulă).

## Modulul Management

Pagina „Management" oferă:

- **Registru de proiecte** — un rând per proiect (cod, client, termen promis/realizat,
  zile de întârziere, valoare, marjă ofertată/realizată/delta) — cheia care leagă restul
  modulelor.
- **Calculator de termen realist** — pe pagina de detaliu a unui proiect: introduci orele
  de manoperă pe fază (din Proiectare/Costing) și operatorii alocați, plus zilele de
  așteptare (aprobare client, aprovizionare, uscare, acces șantier, buffer). Calculează
  automat data de livrare realistă (zile lucrătoare, fără sărbători legale), marja față
  de termenul cerut și un verdict (OK / RISC / NU ÎNCAPI). Reține mesajul central din
  workbook: peste 40% din lead time e de obicei așteptare, nu muncă efectivă — acolo e
  pârghia, nu în viteza de lucru.
- **Jurnal de flux** — data intrării în fiecare din cele 9 faze de producție; durata
  reală pe fază se calculează automat din diferențele de date.
- **Cauze de întârziere** — jurnal de evenimente (dată, fază afectată, cauză, zile
  pierdute) pe un nomenclator fix de 14 cauze; analiza Pareto (top 3 cauze) arată unde
  să intervii primul, agregat pe toate proiectele.
- **7 KPI** calculați automat: proiecte livrate, % livrate la termen, întârziere medie,
  lead time mediu, marjă ofertată/realizată medie, erodare de marjă (cel mai important —
  negativ înseamnă model de cost prea optimist sau pierdere de bani în execuție), zile
  pierdute cumulat, cauza principală.
- **Procedura de flux** (`/management/proceduri`) — pagină de referință statică,
  imprimabilă: cele 14 faze cu porțile de intrare care previn refacerile, plus sistemul
  de coduri de trasabilitate (proiect / corp / piesă / lot material).

Notă privind fidelitatea: „Lead time mediu" este calculat aici direct din Registrul de
proiecte (medie a `termen realizat - data comandă`), nu din coloanele granulare ale
foii JURNAL FLUX din workbook (care nu erau vizibile complet la extragere) — validat
cifră cu cifră (28 zile) față de exemplul real din fișier.

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

Nu sunt incluse încă (rămân pentru etape ulterioare): modulele Web Design și Product
Design din arhitectura ARCA AI ORCHESTRATOR — nu au fișiere de date reale asociate.
