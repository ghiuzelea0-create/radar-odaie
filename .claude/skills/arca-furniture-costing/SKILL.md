---
name: arca-furniture-costing
description: PROPUNERE — NECESITĂ APROBARE. Șablon reproductibil de deviz pentru mobilier, cu structura de cost și formulele Arca (cost total, adaos vs marjă, pierderi tehnologice, TVA) și scenarii minim/realist/prudent când lipsesc date. Produce un .xlsx. Declanșator - „calcul preț", „deviz".
---
# arca-furniture-costing (DRAFT)

Agent: arca-costing. Instrumente: xlsx (nativ), WebSearch (prețuri), Bash.

## Structura de cost
materiale + pierderi + accesorii + manoperă + proiectare + costuri indirecte
+ transport + cazare + montaj + rezervă de risc = COST TOTAL.

## Formule
- Adaos (%) = (Preț fără TVA − Cost total) / Cost total × 100
- Marjă (%) = (Preț fără TVA − Cost total) / Preț fără TVA × 100

## Pași
1. Preia intake. 2. Cere prețuri actuale (WebSearch + dată) sau folosește prețurile furnizate.
3. Completează categoriile; aplică pierderile tehnologice. 4. Dacă lipsesc date → 3 scenarii + ipoteze.
5. Generează .xlsx cu cost, preț, adaos, marjă, TVA, monedă. 6. Trimite la arca-qa.

## Rezultat & test
Deviz .xlsx clar (cost vs preț, adaos vs marjă, TVA marcat). Test QA: recalcul identic, fără valori „exacte" nesusținute.
