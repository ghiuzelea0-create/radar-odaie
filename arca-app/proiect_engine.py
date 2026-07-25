"""Motor de proiect multi-corp — replica formulele din arcatechspecproiect.xlsx
(foile PROIECT, LISTA DEBITARE PROIECT, CONSUM PROIECT).

Un proiect e o lista de TIPURI de corp (fiecare cu un numar de bucati identice).
Reutilizeaza design_engine.calculeaza_corp pentru fiecare tip, apoi agrega
rezultatele (suprafete, cant, feronerie) inmultite cu numarul de bucati identice —
la fel cum PROIECT!Z:AJ agrega din CORP, inmultind cu coloana D (Buc identice).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from design_engine import SUPRAFATA_PLACA_STANDARD_MP, CorpError, CorpInput, calculeaza_corp

ELEMENTE_FERONERIE_ORDINE = (
    "Element de asamblare",
    "Numar imbinari corp",
    "Balamale",
    "Placute de montaj balama",
    "Picioare reglabile",
    "Suporti raft",
    "Glisiere sertar",
    "Suruburi fixare spate",
)


@dataclass
class CorpProiect:
    cod_corp: str
    denumire_corp: str
    buc_identice: int
    decor_corp: str
    decor_front: str
    corp: CorpInput


class ProiectError(Exception):
    pass


def calculeaza_proiect(corpuri: list[CorpProiect], pierdere_tehnologica: float) -> dict:
    if not corpuri:
        raise ProiectError("Proiectul trebuie sa contina cel putin un tip de corp.")

    randuri_debitare: list[dict] = []
    corpuri_rezultat: list[dict] = []
    total_corpuri = 0
    total_mp_pal_corp = 0.0
    total_mp_pal_front = 0.0
    total_mp_hdf = 0.0
    total_cant_2mm_ml = 0.0
    total_cant_04mm_ml = 0.0
    total_feronerie = {el: 0.0 for el in ELEMENTE_FERONERIE_ORDINE}
    consum_pe_decor: dict[str, float] = {}

    for cp in corpuri:
        try:
            r = calculeaza_corp(cp.corp)
        except CorpError as exc:
            raise ProiectError(f"Corp {cp.cod_corp} ({cp.denumire_corp}): {exc}") from exc

        buc_id = cp.buc_identice
        total_corpuri += buc_id

        cote_pozitive_ok = all(
            p["lungime"] > 0 and p["latime"] > 0 for p in r["lista_debitare"]["piese"] if p["buc"] > 0
        )

        for p in r["lista_debitare"]["piese"]:
            buc_total = p["buc"] * buc_id
            if p["material"] == "PAL corp":
                material = cp.decor_corp
            elif p["material"] == "PAL front":
                material = cp.decor_front
            else:
                material = p["material"]

            randuri_debitare.append(
                {
                    "cod_corp": cp.cod_corp,
                    "denumire_piesa": p["denumire"],
                    "material": material if buc_total > 0 else "",
                    "lungime": p["lungime"] if buc_total > 0 else None,
                    "latime": p["latime"] if buc_total > 0 else None,
                    "buc": buc_total,
                    "directie_fibra": p["directie_fibra"] if buc_total > 0 else "",
                    "cant_2mm_total_ml": p["cant_2mm_ml_buc"] * buc_total,
                    "cant_04mm_total_ml": p["cant_04mm_ml_buc"] * buc_total,
                    "suprafata_mp": p["suprafata_mp"] * buc_id,
                }
            )

        c = r["consum"]
        total_mp_pal_corp += c["suprafata_pal_corp_mp"] * buc_id
        total_mp_pal_front += c["suprafata_pal_front_mp"] * buc_id
        total_mp_hdf += c["suprafata_hdf_mp"] * buc_id
        total_cant_2mm_ml += r["lista_debitare"]["total_cant_2mm_ml"] * buc_id
        total_cant_04mm_ml += r["lista_debitare"]["total_cant_04mm_ml"] * buc_id

        for f in r["feronerie"]:
            total_feronerie[f["element"]] = total_feronerie.get(f["element"], 0.0) + f["cantitate"] * buc_id

        if cp.decor_corp:
            consum_pe_decor[cp.decor_corp] = consum_pe_decor.get(cp.decor_corp, 0.0) + c["suprafata_pal_corp_mp"] * buc_id
        if cp.decor_front:
            consum_pe_decor[cp.decor_front] = consum_pe_decor.get(cp.decor_front, 0.0) + c["suprafata_pal_front_mp"] * buc_id

        corpuri_rezultat.append(
            {
                "cod_corp": cp.cod_corp,
                "denumire_corp": cp.denumire_corp,
                "buc_identice": buc_id,
                "gabarit": r["gabarit"],
                "verificare_geometrica": r["verificare_geometrica"],
                "cote_pozitive_ok": cote_pozitive_ok,
            }
        )

    total_piese = sum(row["buc"] for row in randuri_debitare)

    # Control incrucisat: agregarea pe corpuri (Z:AB) vs. insumarea piesa cu piesa (lista de debitare).
    control_suprafata = sum(row["suprafata_mp"] for row in randuri_debitare)
    control_cant2 = sum(row["cant_2mm_total_ml"] for row in randuri_debitare)
    control_cant04 = sum(row["cant_04mm_total_ml"] for row in randuri_debitare)
    stare_control_incrucisat = (
        "OK - cele doua metode coincid"
        if (
            round(control_suprafata, 3) == round(total_mp_pal_corp + total_mp_pal_front + total_mp_hdf, 3)
            and round(control_cant2, 2) == round(total_cant_2mm_ml, 2)
            and round(control_cant04, 2) == round(total_cant_04mm_ml, 2)
        )
        else "EROARE - verifica"
    )

    pal_corp_necesar = total_mp_pal_corp * (1 + pierdere_tehnologica)
    pal_front_necesar = total_mp_pal_front * (1 + pierdere_tehnologica)
    hdf_necesar = total_mp_hdf * (1 + pierdere_tehnologica)

    consum_decor_lista = []
    for decor, mp in consum_pe_decor.items():
        mp_cu_pierdere = mp * (1 + pierdere_tehnologica)
        consum_decor_lista.append(
            {
                "decor": decor,
                "mp_piese": mp,
                "mp_cu_pierdere": mp_cu_pierdere,
                "placi": math.ceil(mp_cu_pierdere / SUPRAFATA_PLACA_STANDARD_MP) if mp_cu_pierdere else 0,
            }
        )

    return {
        "corpuri": corpuri_rezultat,
        "randuri_debitare": randuri_debitare,
        "total_corpuri": total_corpuri,
        "total_piese": total_piese,
        "consum": {
            "pierdere_tehnologica": pierdere_tehnologica,
            "suprafata_pal_corp_mp": total_mp_pal_corp,
            "suprafata_pal_front_mp": total_mp_pal_front,
            "suprafata_hdf_mp": total_mp_hdf,
            "pal_corp_necesar_mp": pal_corp_necesar,
            "pal_front_necesar_mp": pal_front_necesar,
            "hdf_necesar_mp": hdf_necesar,
            "nr_placi_pal_corp": math.ceil(pal_corp_necesar / SUPRAFATA_PLACA_STANDARD_MP) if pal_corp_necesar else 0,
            "nr_placi_pal_front": math.ceil(pal_front_necesar / SUPRAFATA_PLACA_STANDARD_MP) if pal_front_necesar else 0,
            "nr_placi_hdf": math.ceil(hdf_necesar / SUPRAFATA_PLACA_STANDARD_MP) if hdf_necesar else 0,
            "cant_2mm_total_ml": total_cant_2mm_ml,
            "cant_04mm_total_ml": total_cant_04mm_ml,
            "control_suprafata_mp": control_suprafata,
            "control_cant_2mm_ml": control_cant2,
            "control_cant_04mm_ml": control_cant04,
            "stare_control_incrucisat": stare_control_incrucisat,
        },
        "consum_pe_decor": consum_decor_lista,
        "feronerie": [{"element": el, "cantitate": total_feronerie[el]} for el in ELEMENTE_FERONERIE_ORDINE],
    }
