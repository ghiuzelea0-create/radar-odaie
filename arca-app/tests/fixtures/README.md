# Nomenclatoare inghetate pentru teste

Copii ale `data/*.json` din momentul in care s-a verificat paritatea cu foaia
DEVIZ din `arcacosting.xlsx`.

`test_costing_engine.py` citeste de aici, nu din `data/`, pentru ca testul
verifica **motorul de calcul**, nu setarile comerciale ale Arca. Adaosul,
salariile, preturile materialelor si cotele sunt decizii de business si se
schimba; formulele nu.

**Nu modifica fisierele astea** ca sa "repari" un test. Daca un test pica dupa
ce ai schimbat ceva in `costing_engine.py`, motorul s-a schimbat — asta e exact
ce trebuia sa prinda testul.

Setarile reale, folosite in aplicatie, sunt in `arca-app/data/`.
