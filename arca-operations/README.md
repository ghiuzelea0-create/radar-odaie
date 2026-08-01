# Arca Operations

Dashboard operațional pentru Arca Interiors, construit cu Next.js 16, React 19,
Tailwind CSS 4 și shadcn/ui.

## Ce afișează

Dashboard-ul **citește datele reale** produse de aplicația Flask din `arca-app/`
(modulul Management). Nu are date proprii și nu scrie nimic — este un strat de
vizualizare peste același director de date.

| Secțiune | Sursa datelor |
|---|---|
| Prezentare | KPI calculați din registrul de proiecte și jurnalul de cauze |
| Proiecte | Registrul complet: termen, valoare, marjă ofertată vs. realizată |
| Producție | Încărcarea pe cele 9 faze de flux + faza curentă a fiecărui proiect activ |

Indicatorii (marjă medie, % livrate la termen, lead time, erodare de marjă,
Pareto pe cauze de întârziere) sunt calculați cu aceleași formule ca
`arca-app/management_engine.py`, portate în `src/lib/management.ts` și verificate
prin teste față de aceleași cifre din `arcaflux.xlsx` ca testele Python.

Secțiunile Ofertare, Aprovizionare, Calitate, Echipă și Rapoarte nu sunt încă
legate de date și afișează explicit acest lucru, în loc să arate cifre inventate.

## Sursa de date

Implicit se citește din `../arca-app/data` (directorul aplicației Flask din
același repo). Pentru o instalare în care cele două aplicații stau separat:

```bash
export ARCA_DATA_DIR=/cale/absoluta/catre/arca-app/data
```

Butoanele care duc spre formularele aplicației Flask folosesc implicit
`http://localhost:5000`; poate fi schimbat cu:

```bash
export NEXT_PUBLIC_ARCA_APP_URL=http://adresa-aplicatiei-arca:5000
```

Dacă directorul lipsește sau nu conține încă proiecte, interfața arată o stare
goală explicită, cu calea din care s-a încercat citirea — nu date demonstrative.

Proiectele se **adaugă** în aplicația Flask (`/management/proiect/nou`), nu aici:
acest dashboard este read-only, ca să existe o singură sursă de adevăr.

## Pornire locală

```bash
npm install
npm run dev
```

Aplicația pornește pe `http://localhost:3000`.

Pentru a vedea date, pornește în paralel și aplicația Flask și adaugă cel puțin
un proiect:

```bash
cd ../arca-app && python3 app.py
```

## Verificare

```bash
npm run lint
npm test
npm run build
```

`npm test` rulează testele care confirmă că portul TypeScript al motorului de
management dă aceleași cifre ca motorul Python.

Notă: `npm run build` afișează un avertisment Turbopack
(„unexpected file in NFT list") pentru că pagina citește un director stabilit la
rulare. Este o euristică, nu o problemă reală — vezi comentariul din
`next.config.ts`.
