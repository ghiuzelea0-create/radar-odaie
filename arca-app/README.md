# ARCA — Costing & Ofertare + Proiectare + Management + Product Design

Aplicație web + agent Claude pentru arhitectura ARCA AI ORCHESTRATOR (Arca Interiors /
Arca Fancons SRL). Implementează cinci module funcționale, pe baza datelor reale din
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
- **Product Design** — evaluare rapidă de concepte de produs noi (mobilier, iluminat,
  accesorii), reutilizând nomenclatorul real de materiale/manoperă din Costing —
  singurul modul fără fișier Excel sursă propriu (nu a fost încărcat unul; vezi mai jos).

Motoarele de calcul (`costing_engine.py`, `design_engine.py`, `proiect_engine.py`,
`management_engine.py`, `product_design_engine.py`) replică exact formulele din
workbook-urile originale sau reutilizează un motor deja validat — testate automat
(`tests/`), cu rezultate care reproduc cifră cu cifră exemplele reale din toate cele
patru fișiere Excel.

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

## Modulul Product Design

Singurul modul fără fișier Excel sursă — nu a fost încărcat un `arcaproductdesign.xlsx`.
Pagina „Product Design" (`/produse`) evaluează rapid un concept de produs nou, fără să
inventeze o metodologie separată: reutilizează motorul deja validat din Costing
(`costing_engine.calculeaza_deviz`), tratând conceptul ca pe un mini-deviz fără client
sau logistică de montaj.

- Completezi denumire, categorie (Mobilier / Iluminat / Accesoriu), descriere,
  diferențiere față de piață, materiale + manoperă estimată (din același nomenclator ca
  în Costing), și opțional un preț țintă de piață (dacă ai un reper de la concurență).
- Aplicația calculează costul de producție, prețul sugerat (cu regie, adaos, rezervă,
  TVA) și, dacă ai completat prețul țintă, marja rezultată la acel preț cu un verdict
  (FEZABIL / ATENȚIE / SUB PRAG).
- **Materiale fără preț confirmat** (lemn masiv, metal, iluminat — categorii care NU
  există în `arcacosting.xlsx` original) sunt semnalate explicit pe pagina de detaliu,
  nu ascunse: intră în calcul cu cost 0 RON, cu un avertisment clar să ceri ofertă reală
  înainte de a decide pe baza cifrelor.

Am adăugat 7 poziții placeholder în `data/materiale.json` pentru aceste categorii
(lemn masiv stejar, profil metalic, vopsire electrostatică, bandă/driver LED, set
electric) — toate cu preț `null` și sursa marcată „PRET NEPUBLICAT — de cerut", exact
ca modelul deja folosit în nomenclatorul original pentru LEGRABOX/Hafele. Nu am
inventat niciun preț.

### Trei concepte demonstrative

Create prin aplicație, ca test end-to-end al modulului (vezi capturile trimise în
conversație):

| Concept | Categorie | Cost producție | Preț sugerat cu TVA | Notă |
|---|---|---|---|---|
| Etajeră suspendată lemn masiv + suport metalic | Mobilier | 163,60 RON | 267,23 RON | Lemn masiv + metal — materiale fără preț confirmat |
| Corp mic depozitare, decor lemn + picioare metalice | Mobilier | 953,17 RON | 1.557,00 RON | PAL Egger + balama Blum reale; doar picioarele metalice sunt placeholder |
| Aplică de perete lemn masiv + LED | Iluminat | 173,21 RON | 282,94 RON | Corp lemn masiv + componente electrice, toate placeholder |

Aceste cifre nu sunt oferte — reflectă costul de producție cu materialele placeholder la
0 RON. Prețul real de vânzare nu poate fi stabilit până nu se obțin ofertele de la
furnizorii de cherestea, confecții metalice și componente electrice.

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

Modulul **Web Design** nu are un echivalent aici, în `arca-app` — a fost livrat separat,
ca machetă de website (vezi conversația / repo-ul principal), nu ca instrument de calcul,
pentru că responsabilitățile lui (strategie, UX, copywriting, SEO) nu se pretează la un
motor de formule ca celelalte module.
