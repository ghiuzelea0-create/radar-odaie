"""Legaturile dintre modulul Costing & Ofertare si modulul Management.

Un deviz si un proiect din registru sunt scrise separat, de doua formulare
diferite. Singurul lucru care le uneste este codul de proiect. Aici stau
functiile pure care fac si verifica aceasta legatura — fara ele nu poti compara
marja pe care ai ofertat-o cu cea pe care ai realizat-o, adica exact indicatorul
care arata unde pierzi bani in executie.
"""
from __future__ import annotations

# Sub aceasta diferenta consideram ca marja din registru si cea calculata de
# deviz spun acelasi lucru. 0,5 puncte procentuale acopera rotunjirea de la
# introducerea manuala (registrul se completeaza in procente intregi).
TOLERANTA_MARJA = 0.005


def normalizeaza_cod(valoare: str | None) -> str:
    """Codurile se compara fara spatii si fara diferenta de litere mari/mici.

    Campul `proiect` din deviz e text liber, asa ca "arc-2026-045 " si
    "ARC-2026-045" trebuie sa duca la acelasi proiect.
    """
    return (valoare or "").strip().casefold()


def devize_pentru_proiect(devize: list[dict], cod_proiect: str) -> list[dict]:
    """Devizele care apartin unui proiect, dupa codul scris in deviz."""
    cod = normalizeaza_cod(cod_proiect)
    if not cod:
        return []
    return [d for d in devize if normalizeaza_cod(d.get("proiect")) == cod]


def coduri_proiecte(proiecte_records: list[dict]) -> list[dict]:
    """Lista pentru selectorul din formularul de deviz.

    Returneaza cod, client si denumire, ca sa poti alege proiectul dupa nume
    cand nu tii minte codul.
    """
    optiuni = []
    for rec in proiecte_records:
        i = rec.get("input", {})
        cod = (i.get("cod_proiect") or "").strip()
        if not cod:
            continue
        optiuni.append(
            {
                "cod_proiect": cod,
                "client": (i.get("client") or "").strip(),
                "denumire": (i.get("denumire") or "").strip(),
            }
        )
    return optiuni


def total_ofertat(devize: list[dict]) -> float:
    """Suma preturilor de vanzare fara TVA ale devizelor date."""
    total = 0.0
    for d in devize:
        total += float(d.get("rezultat", {}).get("sinteza", {}).get("pret_vanzare_fara_tva") or 0)
    return total


def compara_marja_ofertata(devize: list[dict], marja_registru: float | None) -> dict | None:
    """Compara marja tastata in registru cu cea calculata efectiv de devize.

    Marja din registrul de proiecte se introduce de mana; cea din deviz rezulta
    din calcul. Cand difera, una dintre ele e gresita — si daca cea gresita e
    din registru, toti indicatorii de erodare a marjei sunt fals linistitori.

    Returneaza None cand nu exista devize sau cand registrul n-are marja
    completata: nu avem ce compara, si nu inventam o concluzie.
    """
    if not devize or marja_registru is None:
        return None

    pret = total_ofertat(devize)
    if pret <= 0:
        return None

    cost = 0.0
    for d in devize:
        cost += float(
            d.get("rezultat", {}).get("verificare_marja", {}).get("cost_total_productie") or 0
        )

    marja_devize = (pret - cost) / pret
    diferenta = marja_registru - marja_devize
    return {
        "marja_registru": marja_registru,
        "marja_devize": marja_devize,
        "diferenta": diferenta,
        "coincid": abs(diferenta) <= TOLERANTA_MARJA,
        "pret_devize": pret,
    }
