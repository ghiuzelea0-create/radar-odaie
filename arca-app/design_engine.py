"""Motor de proiectare tehnica — replica formulele din arcatechspec.xlsx
(foile CORP, LISTA DEBITARE, FERONERIE, CONSUM).

Toate dimensiunile sunt in mm, suprafetele in mp, cantul in ml. Genereaza
lista de debitare si de feronerie pentru un corp de mobilier parametric,
plus consumul de material necesar (pentru transfer manual in modulul
Costing & Ofertare).
"""
from __future__ import annotations

import math
from dataclasses import dataclass

SUPRAFATA_PLACA_STANDARD_MP = 2.8 * 2.07  # format Egger / Kronospan / Kastamonu 2800x2070

TIPURI_CONSTRUCTIE = ("Laterale continue", "Fund-capac continue")
TIPURI_INCHIDERE_SUS = ("Traverse", "Capac complet")
SISTEME_ASAMBLARE = ("Confirmat", "Excentric", "Dibluri")


@dataclass
class CorpInput:
    proiect: str
    latime: float  # L
    inaltime: float  # H
    adancime: float  # A
    grosime_pal: float = 18
    grosime_spate_hdf: float = 3
    nr_rafturi: int = 0
    nr_usi: int = 0
    nr_sertare: int = 0
    tip_constructie: str = "Laterale continue"
    tip_inchidere_sus: str = "Traverse"
    sistem_asamblare: str = "Confirmat"
    cant_04_pe_muchii_ascunse: str = "Da"
    latime_traversa_sus: float = 100
    retragere_raft: float = 20
    rost_fronturi: float = 3
    inaltime_front_usa: float | None = None  # implicit H - rost daca None
    inaltime_zona_sertare: float = 0
    puncte_fixare: int = 3
    pas_suruburi_spate: float = 150
    pierdere_tehnologica: float = 0.1

    def __post_init__(self):
        if self.inaltime_front_usa is None:
            self.inaltime_front_usa = self.inaltime - self.rost_fronturi


class CorpError(Exception):
    pass


def verificare_geometrica(c: CorpInput) -> dict:
    adancime_totala_cu_spate = c.adancime + c.grosime_spate_hdf
    if c.tip_constructie == "Laterale continue":
        l_reconstituit = 2 * c.grosime_pal + (c.latime - 2 * c.grosime_pal)
        h_reconstituit = c.inaltime
    else:
        l_reconstituit = c.latime
        h_reconstituit = c.grosime_pal + (c.inaltime - 2 * c.grosime_pal) + c.grosime_pal

    ok = l_reconstituit == c.latime and h_reconstituit == c.inaltime
    return {
        "adancime_totala_cu_spate": adancime_totala_cu_spate,
        "l_reconstituit": l_reconstituit,
        "h_reconstituit": h_reconstituit,
        "stare": "OK - cotele se inchid" if ok else "EROARE - verifica grosimea sau comutatorul",
    }


def _cant_04(lungime: float, latime: float, buc: int, cant_2mm_per_buc: float, c: CorpInput) -> float:
    if buc == 0 or c.cant_04_pe_muchii_ascunse != "Da":
        return 0.0
    return max(0.0, 2 * (lungime + latime) / 1000 - cant_2mm_per_buc)


def lista_debitare(c: CorpInput) -> dict:
    piese = []

    # 1. Laterala
    lungime = c.inaltime if c.tip_constructie == "Laterale continue" else c.inaltime - 2 * c.grosime_pal
    latime = c.adancime
    buc = 2
    cant2 = lungime / 1000 if buc else 0.0
    piese.append(
        {
            "denumire": "Laterala",
            "material": "PAL corp",
            "lungime": lungime,
            "latime": latime,
            "buc": buc,
            "directie_fibra": "pe lungime (verticala)",
            "cant_2mm_ml_buc": cant2,
            "cant_04mm_ml_buc": _cant_04(lungime, latime, buc, cant2, c),
            "suprafata_mp": lungime * latime * buc / 1_000_000,
        }
    )

    # 2. Fund
    lungime = c.latime - 2 * c.grosime_pal if c.tip_constructie == "Laterale continue" else c.latime
    latime = c.adancime
    buc = 1
    cant2 = lungime / 1000 if buc else 0.0
    piese.append(
        {
            "denumire": "Fund",
            "material": "PAL corp",
            "lungime": lungime,
            "latime": latime,
            "buc": buc,
            "directie_fibra": "pe lungime (orizontala)",
            "cant_2mm_ml_buc": cant2,
            "cant_04mm_ml_buc": _cant_04(lungime, latime, buc, cant2, c),
            "suprafata_mp": lungime * latime * buc / 1_000_000,
        }
    )

    # 3. Capac complet
    lungime = c.latime - 2 * c.grosime_pal if c.tip_constructie == "Laterale continue" else c.latime
    latime = c.adancime
    buc = 1 if c.tip_inchidere_sus == "Capac complet" else 0
    cant2 = lungime / 1000 if buc else 0.0
    piese.append(
        {
            "denumire": "Capac complet",
            "material": "PAL corp",
            "lungime": lungime,
            "latime": latime,
            "buc": buc,
            "directie_fibra": "pe lungime (orizontala)",
            "cant_2mm_ml_buc": cant2,
            "cant_04mm_ml_buc": _cant_04(lungime, latime, buc, cant2, c),
            "suprafata_mp": lungime * latime * buc / 1_000_000,
        }
    )

    # 4. Traversa sus - fata
    lungime = c.latime - 2 * c.grosime_pal if c.tip_constructie == "Laterale continue" else c.latime
    latime = c.latime_traversa_sus
    buc = 1 if c.tip_inchidere_sus == "Traverse" else 0
    cant2 = lungime / 1000 if buc else 0.0
    piese.append(
        {
            "denumire": "Traversa sus - fata",
            "material": "PAL corp",
            "lungime": lungime,
            "latime": latime,
            "buc": buc,
            "directie_fibra": "pe lungime (orizontala)",
            "cant_2mm_ml_buc": cant2,
            "cant_04mm_ml_buc": _cant_04(lungime, latime, buc, cant2, c),
            "suprafata_mp": lungime * latime * buc / 1_000_000,
        }
    )

    # 5. Traversa sus - spate (nu se cantuieste pe 2mm - nu e vizibila)
    lungime_spate = c.latime - 2 * c.grosime_pal if c.tip_constructie == "Laterale continue" else c.latime
    latime_spate = c.latime_traversa_sus
    buc_spate = 1 if c.tip_inchidere_sus == "Traverse" else 0
    piese.append(
        {
            "denumire": "Traversa sus - spate",
            "material": "PAL corp",
            "lungime": lungime_spate,
            "latime": latime_spate,
            "buc": buc_spate,
            "directie_fibra": "pe lungime (orizontala)",
            "cant_2mm_ml_buc": 0.0,
            "cant_04mm_ml_buc": _cant_04(lungime_spate, latime_spate, buc_spate, 0.0, c),
            "suprafata_mp": lungime_spate * latime_spate * buc_spate / 1_000_000,
        }
    )

    # 6. Raft
    lungime = c.latime - 2 * c.grosime_pal
    latime = c.adancime - c.retragere_raft
    buc = c.nr_rafturi
    cant2 = lungime / 1000 if buc else 0.0
    piese.append(
        {
            "denumire": "Raft",
            "material": "PAL corp",
            "lungime": lungime,
            "latime": latime,
            "buc": buc,
            "directie_fibra": "pe lungime (orizontala)",
            "cant_2mm_ml_buc": cant2,
            "cant_04mm_ml_buc": _cant_04(lungime, latime, buc, cant2, c),
            "suprafata_mp": lungime * latime * buc / 1_000_000,
        }
    )

    # 7. Spate (aplicat, nu se cantuieste)
    piese.append(
        {
            "denumire": "Spate",
            "material": "HDF",
            "lungime": c.latime,
            "latime": c.inaltime,
            "buc": 1,
            "directie_fibra": "indiferent",
            "cant_2mm_ml_buc": 0.0,
            "cant_04mm_ml_buc": 0.0,
            "suprafata_mp": c.latime * c.inaltime * 1 / 1_000_000,
        }
    )

    # 8. Front usa (cant 2mm pe tot conturul)
    lungime = c.inaltime_front_usa - c.rost_fronturi
    latime = (c.latime - c.nr_usi * c.rost_fronturi) / c.nr_usi if c.nr_usi else 0.0
    buc = c.nr_usi
    cant2 = 2 * (lungime + latime) / 1000 if buc else 0.0
    piese.append(
        {
            "denumire": "Front usa",
            "material": "PAL front",
            "lungime": lungime,
            "latime": latime,
            "buc": buc,
            "directie_fibra": "pe lungime (verticala)",
            "cant_2mm_ml_buc": cant2,
            "cant_04mm_ml_buc": _cant_04(lungime, latime, buc, cant2, c),
            "suprafata_mp": lungime * latime * buc / 1_000_000,
        }
    )

    # 9. Front sertar (cant 2mm pe tot conturul)
    lungime = (c.inaltime_zona_sertare - c.nr_sertare * c.rost_fronturi) / c.nr_sertare if c.nr_sertare else 0.0
    latime = c.latime - c.rost_fronturi
    buc = c.nr_sertare
    cant2 = 2 * (lungime + latime) / 1000 if buc else 0.0
    piese.append(
        {
            "denumire": "Front sertar",
            "material": "PAL front",
            "lungime": lungime,
            "latime": latime,
            "buc": buc,
            "directie_fibra": "pe latime (orizontala)",
            "cant_2mm_ml_buc": cant2,
            "cant_04mm_ml_buc": _cant_04(lungime, latime, buc, cant2, c),
            "suprafata_mp": lungime * latime * buc / 1_000_000,
        }
    )

    total_buc = sum(p["buc"] for p in piese)
    total_cant2 = sum(p["cant_2mm_ml_buc"] * p["buc"] for p in piese)
    total_cant04 = sum(p["cant_04mm_ml_buc"] * p["buc"] for p in piese)
    total_suprafata = sum(p["suprafata_mp"] for p in piese)

    return {
        "piese": piese,
        "total_buc": total_buc,
        "total_cant_2mm_ml": total_cant2,
        "total_cant_04mm_ml": total_cant04,
        "total_suprafata_mp": total_suprafata,
    }


def lista_feronerie(c: CorpInput) -> list[dict]:
    numar_imbinari_corp = 4 if c.tip_inchidere_sus == "Capac complet" else 6
    tip_element = {
        "Confirmat": "Confirmat 7x50",
        "Excentric": "Set excentric + bolt",
        "Dibluri": "Diblu 8x30 + adeziv",
    }[c.sistem_asamblare]

    if c.inaltime_front_usa <= 900:
        buc_pe_usa = 2
    elif c.inaltime_front_usa <= 1600:
        buc_pe_usa = 3
    elif c.inaltime_front_usa <= 2000:
        buc_pe_usa = 4
    else:
        buc_pe_usa = 5
    balamale = c.nr_usi * buc_pe_usa

    picioare = 0
    if c.tip_inchidere_sus == "Traverse":
        picioare = 4 if c.latime <= 900 else 6

    suruburi_spate = math.ceil(2 * (c.latime + c.inaltime) / c.pas_suruburi_spate)

    return [
        {
            "element": "Element de asamblare",
            "cantitate": numar_imbinari_corp * c.puncte_fixare,
            "um": "buc",
            "observatii": tip_element,
        },
        {
            "element": "Numar imbinari corp",
            "cantitate": numar_imbinari_corp,
            "um": "buc",
            "observatii": "4 la capac complet, 6 la traverse",
        },
        {
            "element": "Balamale",
            "cantitate": balamale,
            "um": "buc",
            "observatii": "per usa: <=900->2, <=1600->3, <=2000->4, peste->5",
        },
        {
            "element": "Placute de montaj balama",
            "cantitate": balamale,
            "um": "buc",
            "observatii": "La Blum prin Luxfer placuta e INCLUSA in pretul balamalei - nu o comanda separat.",
        },
        {
            "element": "Picioare reglabile",
            "cantitate": picioare,
            "um": "buc",
            "observatii": "4 la L<=900, 6 peste; doar la corp baza (Traverse)",
        },
        {
            "element": "Suporti raft",
            "cantitate": 4 * c.nr_rafturi,
            "um": "buc",
            "observatii": "4 per raft",
        },
        {
            "element": "Glisiere sertar",
            "cantitate": c.nr_sertare,
            "um": "set",
            "observatii": "LEGRABOX / Matrix Box - vezi nomenclatorul de preturi.",
        },
        {
            "element": "Suruburi fixare spate",
            "cantitate": suruburi_spate,
            "um": "buc",
            "observatii": "perimetru spate / pas suruburi",
        },
    ]


def consum_material(c: CorpInput, debitare: dict) -> dict:
    def suprafata_pentru(material: str) -> float:
        return sum(p["suprafata_mp"] for p in debitare["piese"] if p["material"] == material)

    suprafata_pal_corp = suprafata_pentru("PAL corp")
    suprafata_pal_front = suprafata_pentru("PAL front")
    suprafata_hdf = suprafata_pentru("HDF")

    p = c.pierdere_tehnologica
    pal_corp_necesar = suprafata_pal_corp * (1 + p)
    pal_corp_randament = suprafata_pal_corp / (1 - p) if p < 1 else 0.0
    pal_front_necesar = suprafata_pal_front * (1 + p)
    hdf_necesar = suprafata_hdf * (1 + p)

    return {
        "pierdere_tehnologica": p,
        "suprafata_placa_standard_mp": SUPRAFATA_PLACA_STANDARD_MP,
        "suprafata_pal_corp_mp": suprafata_pal_corp,
        "suprafata_pal_front_mp": suprafata_pal_front,
        "suprafata_hdf_mp": suprafata_hdf,
        "pal_corp_necesar_metoda_deviz_mp": pal_corp_necesar,
        "pal_corp_necesar_randament_croire_mp": pal_corp_randament,
        "pal_front_necesar_metoda_deviz_mp": pal_front_necesar,
        "hdf_necesar_metoda_deviz_mp": hdf_necesar,
        "nr_placi_pal_corp": math.ceil(pal_corp_necesar / SUPRAFATA_PLACA_STANDARD_MP) if pal_corp_necesar else 0,
        "nr_placi_pal_front": math.ceil(pal_front_necesar / SUPRAFATA_PLACA_STANDARD_MP) if pal_front_necesar else 0,
        "nr_placi_hdf": math.ceil(hdf_necesar / SUPRAFATA_PLACA_STANDARD_MP) if hdf_necesar else 0,
        "cant_2mm_total_ml": debitare["total_cant_2mm_ml"],
        "cant_04mm_total_ml": debitare["total_cant_04mm_ml"],
        "nr_total_piese": debitare["total_buc"],
    }


def calculeaza_corp(c: CorpInput) -> dict:
    if c.nr_usi < 0 or c.nr_rafturi < 0 or c.nr_sertare < 0:
        raise CorpError("Numarul de rafturi, usi sau sertare nu poate fi negativ.")
    if c.latime <= 0 or c.inaltime <= 0 or c.adancime <= 0:
        raise CorpError("Dimensiunile de gabarit (L, H, A) trebuie sa fie pozitive.")

    debitare = lista_debitare(c)
    return {
        "proiect": c.proiect,
        "gabarit": f"{c.latime:.0f} x {c.inaltime:.0f} x {c.adancime:.0f} mm",
        "verificare_geometrica": verificare_geometrica(c),
        "lista_debitare": debitare,
        "feronerie": lista_feronerie(c),
        "consum": consum_material(c, debitare),
    }
