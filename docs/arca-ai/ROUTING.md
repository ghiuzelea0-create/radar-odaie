# Matricea de rutare ARCA AI

## Principii
1. Sarcină simplă → un singur agent. Nu delega inutil.
2. Nu folosi mai mulți agenți dacă nu aduc valoare reală.
3. Paralelizează DOAR activitățile independente; cele dependente în ordine.
4. QA se execută după consolidare, obligatoriu la impact financiar/tehnic/contractual.
5. Subagenții returnează coordonatorului; răspunsul final îl redactează coordonatorul.

## Tabel
| Solicitare | Agenți | Dependențe |
|---|---|---|
| Dimensiunea unui corp | proiectare | — |
| Calcul preliminar de preț | costing | — |
| Procedură de producție | management | — |
| Concept de produs nou | product | — |
| Website de prezentare | web | — |
| Verificarea unui calcul | qa | — |
| Corp de mobilier ofertat | proiectare → costing → qa | secvențial |
| Proiect complet | proiectare + management → costing → qa | primele 2 paralel |
| Produs nou comercial | product → proiectare + costing → qa | mixt |
| Sistem ERP | management + costing + proiectare → qa | primele 3 paralel |
| Website cu produse | web + product → qa | primele 2 paralel |

## Agent Teams
Nu folosi implicit. Propune doar pentru proiecte mari, cu activități independente și beneficiu clar.
