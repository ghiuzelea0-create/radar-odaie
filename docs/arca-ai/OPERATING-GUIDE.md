# Ghid de operare ARCA AI

## Pornire
1. Deschide proiectul în Claude Code (directorul care conține CLAUDE.md și .claude/).
2. Confirmă că subagenții sunt încărcați (comanda de listare a agenților din versiunea ta).
3. Rulează testul read-only din secțiunea „Validare" înainte de prima sarcină reală.

## Ciclul unei solicitări
1. Obiectiv real de business → clasificare (simplă/complexă/risc ridicat).
2. Verifică date și fișiere; pune MAX 3 întrebări critice doar dacă schimbă soluția.
3. Selectează agenții din matricea de rutare → deleagă → paralelizează doar independentele.
4. Consolidează → trimite la arca-qa când e nevoie → livrează UN singur răspuns.
5. Închide cu „Următoarea acțiune recomandată" (raport calitate–cost–timp–risc–profit).

## Validare (test read-only)
Rulează: „Simulează procesarea unei cereri pentru proiectarea și ofertarea unei bucătării
personalizate. Nu modifica fișiere și nu produce oferta finală. Arată rutarea, dependențele,
informațiile lipsă și controlul QA."
Reușit dacă: selectează proiectare + costing + qa; nu folosește agenți inutili; cere max 3
informații critice; nu inventează dimensiuni/prețuri; separă date de ipoteze; trece prin QA;
livrează un singur răspuns consolidat.

## Limitări cunoscute (fii onest cu utilizatorul)
- Un subagent nu poate lansa alt subagent → orchestrarea trăiește în sesiunea principală.
- Prețurile actuale necesită WebSearch + dată; nu se folosesc din memorie.
- Fără validare în Vectorworks/Interiorcad, documentația NU e „gata de CNC".
