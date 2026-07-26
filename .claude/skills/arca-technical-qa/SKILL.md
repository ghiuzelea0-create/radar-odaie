---
name: arca-technical-qa
description: PROPUNERE — NECESITĂ APROBARE. Checklist de verificare read-only pentru rezultate tehnice/costing — cote, unități, formule, coliziuni, surse de preț, contradicții — cu clasificarea problemelor și scor de încredere 1–10. Declanșator - pre-livrare pentru orice output cu impact tehnic/financiar/contractual.
---
# arca-technical-qa (DRAFT)

Agent: arca-qa (read-only). Nu produce livrabile, doar verifică.

## Checklist
- Unități corecte (mm/RON) și consecvente? Cote critice confirmate (nu „DE VERIFICAT")?
- Formule adaos/marjă aplicate corect? Recalcul identic?
- Surse de preț cu dată? Ipoteze explicite? Contradicții între documente?
- Fezabilitate producție/transport/montaj? Cerințele respectate integral?

## Ieșire
Probleme pe categorii (CRITIC/IMPORTANT/RECOMANDARE/OPȚIONAL) + scor 1–10 +
verdict „POATE FI LIVRAT" / „NECESITĂ CORECȚII". 10/10 doar dacă totul e confirmat și reverificat.
