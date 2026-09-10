"""Trecerea nomenclatoarelor de la valori de pornire la datele reale ale Arca.

Devizele se calculeaza pe preturi retail publice (Mathaus) si pe salarii
estimate, ancorate pe salariul minim. Formula de marja e corecta, dar se
aplica pe un cost care nu e inca al Arca: ca producator, pretul de contract
e sub cel retail, iar salariile reale nu sunt cele estimate.

Pana acum singura cale de a corecta asta era editarea de mana a unui JSON de
21 KB. Modulul asta contine logica de care are nevoie pagina Nomenclator ca
sa faca editarea din aplicatie, plus evidenta a ce mai lipseste.

Functiile sunt pure: primesc si intorc structuri, nu ating discul. Scrierea
o face app.py, ca sa poata fi testate fara Flask si fara fisiere.
"""

from __future__ import annotations

import copy

COLOANE_SALARIU = ("brut_bucuresti", "brut_cluj", "brut_brasov")

# Sub aceasta diferenta doua preturi sunt acelasi pret: un ban.
TOLERANTA_PRET = 0.005


class NomenclatorError(ValueError):
    """Valoare pe care utilizatorul a scris-o gresit, nu o eroare de program."""


def _este_ambiguu(curatat: str) -> bool:
    """Un singur separator, urmat de exact 3 cifre: `6.200` sau `1,234`.

    Poate insemna 6,2 sau 6200 — depinde de conventie, si nu avem cum sti
    care. Un salariu citit 6,2 in loc de 6200 ar prabusi costul manoperei pe
    toate devizele, tacut. Preferam sa refuzam si sa cerem clarificare.
    """
    if "," in curatat and "." in curatat:
        return False
    for separator in (",", "."):
        pozitie = curatat.find(separator)
        if pozitie > 0 and curatat.count(separator) == 1 and len(curatat) - pozitie - 1 == 3:
            return True
    return False


def formateaza_numar(valoare) -> str:
    """Valoarea asa cum se pune inapoi intr-un camp de formular.

    `float` in Python afiseaza 6200.0 si 199.0; retrimise in formular, ar
    arata omului ca aplicatia i-a schimbat ce a scris. Taiem zerourile
    inutile fara sa rotunjim nimic.
    """
    if valoare in (None, ""):
        return ""

    text = f"{float(valoare):.4f}".rstrip("0").rstrip(".")

    # Exact 3 zecimale ar fi respinse la retrimitere ca ambigue (`370.235`
    # poate insemna si 370235). Adaugam un zero: valoarea nu se schimba, dar
    # devine neechivoca — altfel pagina n-ar putea fi salvata fara ca omul sa
    # atinga acel camp, desi n-a modificat nimic.
    intreg, _, zecimale = text.partition(".")
    if len(zecimale) == 3:
        text = f"{intreg}.{zecimale}0"
    return text


def parseaza_numar(text: str | None) -> float | None:
    """Numarul dintr-un camp de formular. `None` inseamna camp gol.

    Accepta si `370,23`, si `370.23`, si `1.234,56` — un utilizator roman
    scrie virgula zecimala, iar un copy-paste dintr-un tabel aduce si
    separatorul de mii. Cand apar amandoua, ultimul este cel zecimal.

    Refuza cazul ambiguu (vezi `_este_ambiguu`) in loc sa ghiceasca.
    """
    if text is None:
        return None

    curatat = text.strip().replace(" ", "").replace(" ", "")
    if curatat in ("", "—", "-"):
        return None

    if _este_ambiguu(curatat):
        raise NomenclatorError(
            f"„{text.strip()}” poate insemna doua lucruri diferite. "
            "Scrie fara separator de mii (6200) sau cu zecimale (6200,00)."
        )

    if curatat.rfind(",") > curatat.rfind("."):
        curatat = curatat.replace(".", "").replace(",", ".")
    else:
        curatat = curatat.replace(",", "")

    try:
        valoare = float(curatat)
    except ValueError:
        raise NomenclatorError(f"„{text.strip()}” nu e un numar.") from None

    if valoare < 0:
        raise NomenclatorError("Valoarea nu poate fi negativa.")
    return valoare


def _acelasi_pret(vechi: float | None, nou: float | None) -> bool:
    if vechi in (None, "") and nou is None:
        return True
    if vechi in (None, "") or nou is None:
        return False
    return abs(float(vechi) - nou) < TOLERANTA_PRET


def aplica_preturi_contract(materiale: list[dict], citeste_camp) -> tuple[list[dict], list[dict], list[str]]:
    """Scrie preturile de contract din formular peste nomenclator.

    `citeste_camp(cod)` intoarce textul trimis pentru materialul cu acel cod,
    sau `None` daca formularul nu contine campul (randul nu a fost afisat).

    Un camp golit **sterge** pretul de contract — devizele revin la retail.
    Asta e intentionat: e singurul mod de a corecta un pret introdus gresit.

    Intoarce (nomenclator nou, modificari, erori). Nomenclatorul original nu
    se modifica, iar daca exista erori, apelantul poate alege sa nu salveze.
    """
    actualizate = copy.deepcopy(materiale)
    modificari: list[dict] = []
    erori: list[str] = []

    for material in actualizate:
        brut = citeste_camp(material["cod"])
        if brut is None:
            continue

        try:
            valoare = parseaza_numar(brut)
        except NomenclatorError as exc:
            erori.append(f"{material['denumire']}: {exc}")
            continue

        vechi = material.get("pret_contract")
        if _acelasi_pret(vechi, valoare):
            continue

        material["pret_contract"] = valoare
        modificari.append(
            {
                "denumire": material["denumire"],
                "vechi": None if vechi in (None, "") else float(vechi),
                "nou": valoare,
            }
        )

    return actualizate, modificari, erori


def aplica_salarii(manopera: list[dict], citeste_camp) -> tuple[list[dict], list[dict], list[str]]:
    """Scrie salariile brute din formular peste nomenclatorul de manopera.

    `citeste_camp(faza, coloana)` intoarce textul trimis, sau `None`.

    Spre deosebire de pretul de contract, un salariu **nu** poate fi golit:
    `cost_ora_faza` il citeste neconditionat, iar un camp lipsa ar opri
    calculul devizelor pe faza respectiva.
    """
    actualizate = copy.deepcopy(manopera)
    modificari: list[dict] = []
    erori: list[str] = []

    for faza in actualizate:
        for coloana in COLOANE_SALARIU:
            brut = citeste_camp(faza["faza"], coloana)
            if brut is None:
                continue

            try:
                valoare = parseaza_numar(brut)
            except NomenclatorError as exc:
                erori.append(f"{faza['faza']} / {coloana}: {exc}")
                continue

            if valoare is None or valoare == 0:
                erori.append(f"{faza['faza']} / {coloana}: salariul nu poate fi gol sau zero.")
                continue

            vechi = float(faza[coloana])
            if abs(vechi - valoare) < TOLERANTA_PRET:
                continue

            faza[coloana] = valoare
            modificari.append({"faza": faza["faza"], "coloana": coloana, "vechi": vechi, "nou": valoare})

    return actualizate, modificari, erori


def utilizare_materiale(devize: list[dict]) -> dict[str, int]:
    """De cate ori apare fiecare material in devizele salvate.

    Din 62 de materiale din nomenclator, Arca chiar cumpara cateva. Pretul de
    contract conteaza intai pentru acelea — restul pot ramane pe retail fara
    sa afecteze niciun deviz.
    """
    contor: dict[str, int] = {}
    for deviz in devize:
        linii = (deviz.get("input") or {}).get("materiale_linii") or []
        for linie in linii:
            denumire = linie.get("denumire")
            if denumire:
                contor[denumire] = contor.get(denumire, 0) + 1
    return contor


def _stare_pret(material: dict) -> str:
    if material.get("pret_contract") not in (None, ""):
        return "contract"
    if material.get("pret_retail"):
        return "retail"
    return "lipsa"


def adnoteaza_materiale(materiale: list[dict], devize: list[dict]) -> list[dict]:
    """Fiecare material, plus starea pretului si de cate ori e folosit."""
    utilizare = utilizare_materiale(devize)
    return [
        {**material, "stare_pret": _stare_pret(material), "utilizari": utilizare.get(material["denumire"], 0)}
        for material in materiale
    ]


def sumar_preturi(materiale_adnotate: list[dict]) -> dict:
    """Cat de departe e nomenclatorul de datele reale.

    `folosite_fara_contract` e cifra care conteaza: materiale care au intrat
    deja in devize, dar sunt inca evaluate la pret retail. Fiecare dintre ele
    umfla un cost real si, prin el, un pret dat clientului.
    """
    folosite_fara_contract = [
        m for m in materiale_adnotate if m["utilizari"] > 0 and m["stare_pret"] != "contract"
    ]
    return {
        "total": len(materiale_adnotate),
        "cu_contract": sum(1 for m in materiale_adnotate if m["stare_pret"] == "contract"),
        "pe_retail": sum(1 for m in materiale_adnotate if m["stare_pret"] == "retail"),
        "fara_pret": sum(1 for m in materiale_adnotate if m["stare_pret"] == "lipsa"),
        "folosite": sum(1 for m in materiale_adnotate if m["utilizari"] > 0),
        "folosite_fara_contract": len(folosite_fara_contract),
        "de_cerut": sorted(
            folosite_fara_contract, key=lambda m: (-m["utilizari"], m["denumire"])
        ),
    }


def randuri_cerere_oferta(materiale_adnotate: list[dict]) -> list[dict]:
    """Lista de trimis furnizorului, ca sa ceri preturi de contract.

    Contine tot ce nu are inca pret de contract, cele deja folosite in devize
    primele. Coloana `pret_contract_ofertat` ramane goala: o completeaza
    furnizorul, apoi valorile se introduc in pagina Nomenclator.
    """
    de_cerut = [m for m in materiale_adnotate if m["stare_pret"] != "contract"]
    de_cerut.sort(key=lambda m: (-m["utilizari"], m["denumire"]))
    return [
        {
            "cod": m.get("cod", ""),
            "denumire": m.get("denumire", ""),
            "producator": m.get("producator", ""),
            "specificatie": m.get("specificatie", ""),
            "um": m.get("um", ""),
            "pret_retail_referinta": m.get("pret_retail") or "",
            "folosit_in_devize": m["utilizari"],
            "pret_contract_ofertat": "",
        }
        for m in de_cerut
    ]
