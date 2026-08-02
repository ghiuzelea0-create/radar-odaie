"""Motor de calcul deviz/ofertă — replică formulele din arcacosting.xlsx
(foile PARAMETRI, NOMENCLATOR MATERIALE, NOMENCLATOR MANOPERA, DEVIZ, OFERTA, VERIFICARE MARJA).

Toate valorile banesti sunt in RON, fara TVA, pana la sinteza finala.
"""
from __future__ import annotations

from dataclasses import dataclass, field


REGIUNI = ("Bucuresti", "Cluj", "Brasov")

CATEGORII_PIERDERE_LEMN_MASIV = {"Lemn masiv"}


def parametri_valori(parametri_raw: dict) -> dict:
    """Extrage doar valoarea numerica/text din structura {cheie: {valoare, observatii, parametru}}."""
    return {k: v["valoare"] for k, v in parametri_raw.items()}


# --- Adaos vs. marja ---------------------------------------------------------
#
# Motorul stabileste pretul asa: pret = cost x (1 + adaos + rezerva).
# De aici rezulta ca marja bruta NU e egala cu adaosul, si ca ea nu depinde
# deloc de marimea devizului — doar de acesti doi parametri. Confuzia dintre
# adaos si marja costa bani la fiecare oferta, asa ca functiile de mai jos fac
# relatia explicita si verificabila.


def marja_din_adaos(adaos: float, rezerva: float) -> float:
    """Marja bruta care rezulta efectiv dintr-un adaos dat.

    marja = (pret - cost) / pret = (adaos + rezerva) / (1 + adaos + rezerva)
    """
    suma = adaos + rezerva
    return suma / (1 + suma)


def adaos_pentru_marja(marja_tinta: float, rezerva: float) -> float:
    """Adaosul necesar ca sa atingi o marja tinta, la o rezerva data.

    Inversa lui `marja_din_adaos`: din marja = (a+r)/(1+a+r) rezulta
    a + r = marja / (1 - marja).
    """
    if marja_tinta >= 1:
        raise ValueError("O marja de 100% ar cere un adaos infinit.")
    return marja_tinta / (1 - marja_tinta) - rezerva


def scenarii_adaos(adaos_curent: float, rezerva: float, marja_tinta: float) -> list[dict]:
    """Ce se schimba la client si la tine daca muti adaosul.

    Raportul de pret si cel de castig depind doar de parametri, nu de deviz —
    de aceea sunt exprimate procentual: sunt valabile la orice oferta, de la un
    corp la o casa intreaga.
    """
    adaos_tinta = adaos_pentru_marja(marja_tinta, rezerva)

    # Rotunjim inainte de deduplicare. Adaosul salvat in parametri si cel
    # calculat din tinta pot diferi cu un ULP (0,4884615384615385 fata de
    # ...84), iar un `set` le-ar pastra pe amandoua si tabelul ar afisa acelasi
    # rand de doua ori. Sase zecimale inseamna 0,0001% — sub orice relevanta.
    PRECIZIE = 6
    curent = round(adaos_curent, PRECIZIE)
    valori = sorted({round(a, PRECIZIE) for a in (adaos_curent, adaos_tinta, 0.30, 0.40, 0.50) if a >= 0})

    baza_pret = 1 + adaos_curent + rezerva
    baza_castig = adaos_curent + rezerva

    scenarii = []
    for adaos in valori:
        pret = 1 + adaos + rezerva
        castig = adaos + rezerva
        scenarii.append(
            {
                "adaos": adaos,
                "marja": marja_din_adaos(adaos, rezerva),
                # Cat la suta mai mult plateste clientul fata de adaosul curent.
                "delta_pret_pct": pret / baza_pret - 1,
                # Cat la suta mai mult ramane la tine fata de adaosul curent.
                "delta_castig_pct": (castig / baza_castig - 1) if baza_castig else 0.0,
                "este_curent": adaos == curent,
                # Toleranta pe potriva rotunjirii de mai sus.
                "atinge_tinta": abs(marja_din_adaos(adaos, rezerva) - marja_tinta) < 1e-6,
            }
        )
    return scenarii


def gaseste_material(denumire: str, materiale: list[dict]) -> dict | None:
    for m in materiale:
        if m["denumire"] == denumire:
            return m
    return None


def gaseste_faza_manopera(faza: str, manopera: list[dict]) -> dict | None:
    for m in manopera:
        if m["faza"] == faza:
            return m
    return None


def pret_material_aplicat(material: dict, override: float | None = None) -> float:
    if override is not None:
        return override
    contract = material.get("pret_contract")
    if contract not in (None, ""):
        return float(contract)
    return float(material.get("pret_retail") or 0)


def pierdere_implicita(material: dict, parametri: dict) -> float:
    categorie = material.get("categorie") or ""
    if categorie in CATEGORII_PIERDERE_LEMN_MASIV:
        return float(parametri["pierdere_lemn_masiv"])
    return float(parametri["pierdere_pal_mdf"])


def cost_ora_faza(faza_data: dict, parametri: dict, override: float | None = None) -> float:
    """Formula: Cost/ora = (Brut_regiune_sau_minim x (1+CAM) + tichete) / (ore_nominale x grad_utilizare)."""
    if override is not None:
        return override
    regiune = parametri["regiune"]
    brut_regiune = {
        "Bucuresti": faza_data["brut_bucuresti"],
        "Cluj": faza_data["brut_cluj"],
        "Brasov": faza_data["brut_brasov"],
    }[regiune]
    brut_aplicat = max(float(brut_regiune), float(parametri["salariu_minim_brut"]))
    cost_angajator_luna = brut_aplicat * (1 + float(parametri["cam_contributie_angajator"])) + float(
        parametri["tichete_masa_luna"]
    )
    ore_productive_luna = float(parametri["ore_nominale_luna"]) * float(parametri["grad_utilizare_productiva"])
    if ore_productive_luna == 0:
        return 0.0
    return cost_angajator_luna / ore_productive_luna


@dataclass
class MaterialLine:
    denumire: str
    cantitate: float
    pret_unitar_override: float | None = None
    pierdere_pct_override: float | None = None


@dataclass
class ManoperaLine:
    faza: str
    ore: float
    tarif_override: float | None = None


@dataclass
class Logistica:
    transport: float = 0.0
    cazare: float = 0.0
    montaj_ore: float = 0.0
    montaj_nr_montatori: int = 0
    montaj_tarif_override: float | None = None


@dataclass
class DevizInput:
    proiect: str
    client: str
    data: str
    materiale_linii: list[MaterialLine] = field(default_factory=list)
    manopera_linii: list[ManoperaLine] = field(default_factory=list)
    ore_proiectare: float = 0.0
    logistica: Logistica = field(default_factory=Logistica)


class DevizError(Exception):
    pass


def calculeaza_deviz(deviz: DevizInput, parametri_raw: dict, materiale_nomenclator: list[dict], manopera_nomenclator: list[dict]) -> dict:
    parametri = parametri_valori(parametri_raw)

    # A. MATERIALE DIRECTE
    materiale_rezultat = []
    subtotal_materiale = 0.0
    for linie in deviz.materiale_linii:
        material = gaseste_material(linie.denumire, materiale_nomenclator)
        if material is None:
            raise DevizError(f"Material necunoscut in nomenclator: {linie.denumire!r}")
        pret_unitar = pret_material_aplicat(material, linie.pret_unitar_override)
        pierdere_pct = (
            linie.pierdere_pct_override
            if linie.pierdere_pct_override is not None
            else pierdere_implicita(material, parametri)
        )
        valoare = linie.cantitate * pret_unitar * (1 + pierdere_pct)
        subtotal_materiale += valoare
        materiale_rezultat.append(
            {
                "denumire": linie.denumire,
                "um": material.get("um"),
                "cantitate": linie.cantitate,
                "pret_unitar": pret_unitar,
                "pierdere_pct": pierdere_pct,
                "valoare": valoare,
            }
        )

    # B. MANOPERA DIRECTA
    manopera_rezultat = []
    subtotal_manopera = 0.0
    for linie in deviz.manopera_linii:
        faza_data = gaseste_faza_manopera(linie.faza, manopera_nomenclator)
        if faza_data is None:
            raise DevizError(f"Faza de manopera necunoscuta: {linie.faza!r}")
        cost_ora = cost_ora_faza(faza_data, parametri, linie.tarif_override)
        valoare = linie.ore * cost_ora
        subtotal_manopera += valoare
        manopera_rezultat.append(
            {
                "faza": linie.faza,
                "ore": linie.ore,
                "cost_ora": cost_ora,
                "valoare": valoare,
            }
        )

    # C. PROIECTARE
    faza_proiectare = gaseste_faza_manopera("Proiectare tehnica", manopera_nomenclator)
    if faza_proiectare is None:
        raise DevizError("Faza 'Proiectare tehnica' lipseste din nomenclatorul de manopera.")
    cost_ora_proiectare = cost_ora_faza(faza_proiectare, parametri)
    valoare_proiectare = deviz.ore_proiectare * cost_ora_proiectare

    # D. LOGISTICA SI MONTAJ
    faza_montaj = gaseste_faza_manopera("Montaj", manopera_nomenclator)
    cost_ora_montaj = cost_ora_faza(faza_montaj, parametri, deviz.logistica.montaj_tarif_override) if faza_montaj else 0.0
    valoare_montaj = deviz.logistica.montaj_ore * cost_ora_montaj * deviz.logistica.montaj_nr_montatori
    subtotal_logistica = deviz.logistica.transport + deviz.logistica.cazare + valoare_montaj

    # SINTEZA COST
    subtotal_cost_direct = subtotal_materiale + subtotal_manopera + valoare_proiectare + subtotal_logistica
    regie = subtotal_cost_direct * float(parametri["regie"])
    cost_total_productie = subtotal_cost_direct + regie
    adaos = cost_total_productie * float(parametri["adaos_comercial"])
    rezerva = cost_total_productie * float(parametri["rezerva_risc"])
    pret_vanzare_fara_tva = cost_total_productie + adaos + rezerva
    tva = pret_vanzare_fara_tva * float(parametri["tva"])
    pret_total_cu_tva = pret_vanzare_fara_tva + tva

    sinteza = {
        "subtotal_materiale": subtotal_materiale,
        "subtotal_manopera": subtotal_manopera,
        "valoare_proiectare": valoare_proiectare,
        "cost_ora_proiectare": cost_ora_proiectare,
        "subtotal_logistica": subtotal_logistica,
        "valoare_montaj": valoare_montaj,
        "cost_ora_montaj": cost_ora_montaj,
        "subtotal_cost_direct": subtotal_cost_direct,
        "regie": regie,
        "cost_total_productie": cost_total_productie,
        "adaos": adaos,
        "rezerva": rezerva,
        "pret_vanzare_fara_tva": pret_vanzare_fara_tva,
        "tva": tva,
        "pret_total_cu_tva": pret_total_cu_tva,
    }

    # OFERTA (vedere client, fara costuri interne)
    oferta = {
        "proiect": deviz.proiect,
        "client": deviz.client,
        "data": deviz.data,
        "total_fara_tva": pret_vanzare_fara_tva,
        "tva": tva,
        "total_cu_tva": pret_total_cu_tva,
    }

    # VERIFICARE MARJA
    marja_bruta_ron = pret_vanzare_fara_tva - cost_total_productie
    marja_bruta_pct = (marja_bruta_ron / pret_vanzare_fara_tva) if pret_vanzare_fara_tva else 0.0
    prag_marja_minima = float(parametri["prag_alerta_marja"])
    pondere_materiale = (subtotal_materiale / cost_total_productie) if cost_total_productie else 0.0
    pondere_manopera = (
        (subtotal_manopera + valoare_proiectare) / cost_total_productie if cost_total_productie else 0.0
    )
    if marja_bruta_pct < prag_marja_minima:
        stare_marja = "ALERTA - sub prag"
    elif marja_bruta_pct < prag_marja_minima + 0.05:
        stare_marja = "ATENTIE - aproape de prag"
    else:
        stare_marja = "OK"

    verificare_marja = {
        "cost_total_productie": cost_total_productie,
        "pret_vanzare_fara_tva": pret_vanzare_fara_tva,
        "marja_bruta_ron": marja_bruta_ron,
        "marja_bruta_pct": marja_bruta_pct,
        "prag_marja_minima": prag_marja_minima,
        "pondere_materiale": pondere_materiale,
        "pondere_manopera": pondere_manopera,
        "stare_marja": stare_marja,
    }

    return {
        "proiect": deviz.proiect,
        "client": deviz.client,
        "data": deviz.data,
        "materiale": materiale_rezultat,
        "manopera": manopera_rezultat,
        "sinteza": sinteza,
        "oferta": oferta,
        "verificare_marja": verificare_marja,
    }
