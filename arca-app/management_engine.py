"""Motor de management fabrica — replica formulele din arcaflux.xlsx
(foile TERMEN REALIST, REGISTRU PROIECTE, JURNAL FLUX, CAUZE INTARZIERE, KPI).

Datele calendaristice circula ca datetime.date. Duratele sunt in zile.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, timedelta

FAZE_FLUX = (
    "Proiectare tehnica",
    "Debitare",
    "Aplicare cant",
    "Gaurire / CNC",
    "Asamblare",
    "Vopsire",
    "Finisare",
    "Ambalare",
    "Montaj",
)

NOMENCLATOR_CAUZE = (
    {"cod": "C01", "denumire": "Asteptare aprobare client (decor, finisaj)", "categorie": "Client"},
    {"cod": "C02", "denumire": "Asteptare masuratori / santier nepregatit", "categorie": "Client"},
    {"cod": "C03", "denumire": "Material intarziat de furnizor", "categorie": "Aprovizionare"},
    {"cod": "C04", "denumire": "Material comandat prea tarziu", "categorie": "Intern - planificare"},
    {"cod": "C05", "denumire": "Modificare ceruta de client dupa lansare", "categorie": "Client"},
    {"cod": "C06", "denumire": "Eroare de proiectare (cote gresite)", "categorie": "Intern - proiectare"},
    {"cod": "C07", "denumire": "Eroare de debitare / piesa retaiata", "categorie": "Intern - productie"},
    {"cod": "C08", "denumire": "Defect de material (delaminare, decor neasortat)", "categorie": "Furnizor"},
    {"cod": "C09", "denumire": "Timp de uscare subestimat", "categorie": "Intern - planificare"},
    {"cod": "C10", "denumire": "Operator indisponibil (concediu, boala)", "categorie": "Resurse"},
    {"cod": "C11", "denumire": "Defectiune utilaj", "categorie": "Resurse"},
    {"cod": "C12", "denumire": "Feronerie lipsa sau gresita", "categorie": "Aprovizionare"},
    {"cod": "C13", "denumire": "Montaj amanat de client", "categorie": "Client"},
    {"cod": "C14", "denumire": "Suprapunere cu alt proiect prioritar", "categorie": "Intern - planificare"},
)

PROCEDURA_FLUX = (
    {"pas": "0", "faza": "Ofertare", "poarta": "Cerere clara + cote preliminare", "responsabil": "Comercial / proprietar", "inregistrare": "Cod proiect alocat, valoare, marja ofertata"},
    {"pas": "1", "faza": "Masuratori la fata locului", "poarta": "Acces la spatiu; instalatii trasate", "responsabil": "Proiectant", "inregistrare": "Cote reale, fotografii, abateri fata de plan"},
    {"pas": "2", "faza": "Aprobare client", "poarta": "Decor, finisaj si cote confirmate IN SCRIS", "responsabil": "Comercial", "inregistrare": "Data confirmarii. Fara ea nu se comanda material."},
    {"pas": "3", "faza": "Proiectare tehnica", "poarta": "Aprobarea clientului obtinuta", "responsabil": "Proiectant", "inregistrare": "Lista de debitare, lista feronerie, cod pe fiecare piesa"},
    {"pas": "4", "faza": "Aprovizionare", "poarta": "Lista de material din proiect; se lanseaza IMEDIAT dupa proiectare", "responsabil": "Aprovizionare", "inregistrare": "Lot material: furnizor, decor, data receptie"},
    {"pas": "5", "faza": "Debitare", "poarta": "Material receptionat + lista verificata de a doua persoana", "responsabil": "Operator debitare", "inregistrare": "Data intrarii in faza; piese retaiate (daca apar)"},
    {"pas": "6", "faza": "Aplicare cant", "poarta": "Piese debitate si etichetate", "responsabil": "Operator cant", "inregistrare": "Data intrarii in faza"},
    {"pas": "7", "faza": "Gaurire / CNC", "poarta": "Cant aplicat; program verificat", "responsabil": "Operator CNC", "inregistrare": "Data intrarii in faza"},
    {"pas": "8", "faza": "Asamblare", "poarta": "Feronerie disponibila si verificata", "responsabil": "Sef atelier", "inregistrare": "Data; ore realizate"},
    {"pas": "9", "faza": "Vopsire", "poarta": "Doar MDF; program de uscare planificat in calendar", "responsabil": "Vopsitor", "inregistrare": "Data start si data la care se poate manipula"},
    {"pas": "10", "faza": "Finisare", "poarta": "Vopsea uscata complet", "responsabil": "Finisor", "inregistrare": "Data; defecte constatate"},
    {"pas": "11", "faza": "Ambalare", "poarta": "Control final trecut", "responsabil": "Ambalare", "inregistrare": "Data; lista de colete"},
    {"pas": "12", "faza": "Montaj", "poarta": "Confirmare scrisa ca santierul e pregatit", "responsabil": "Sef montaj", "inregistrare": "Data; ore realizate; probleme la fata locului"},
    {"pas": "13", "faza": "Receptie client", "poarta": "Montaj finalizat", "responsabil": "Comercial", "inregistrare": "Semnatura clientului, data livrarii, reclamatii"},
)

CODURI_TRASABILITATE = (
    {"nivel": "Proiect", "format": "ARC-AAAA-NNN", "exemplu": "ARC-2026-047", "unde": "Registru, deviz, dosar, facturi"},
    {"nivel": "Corp", "format": "Cod scurt din tech-spec", "exemplu": "B1, S1", "unde": "Lista de debitare, eticheta"},
    {"nivel": "Piesa", "format": "Proiect-Corp-Nr", "exemplu": "ARC-2026-047-B1-03", "unde": "Eticheta lipita pe piesa"},
    {"nivel": "Lot material", "format": "LOT-furnizor-decor-data", "exemplu": "LOT-MAT-110SM-260715", "unde": "Receptie, dosar proiect"},
)


def zi_lucratoare(d: date, n_zile: float) -> date:
    """Echivalent WORKDAY(d, n) din Excel: n zile lucratoare (luni-vineri) dupa d, fara sarbatori legale."""
    n = int(round(n_zile))
    curent = d
    pas = 1 if n >= 0 else -1
    ramase = abs(n)
    while ramase > 0:
        curent += timedelta(days=pas)
        if curent.weekday() < 5:  # 0=luni ... 4=vineri
            ramase -= 1
    return curent


@dataclass
class FazaLucru:
    faza: str
    ore_manopera: float = 0
    operatori_alocati: int = 0


@dataclass
class TermenRealistInput:
    cod_proiect: str
    client: str
    data_comanda: date
    termen_cerut: date
    ore_lucratoare_zi: float = 8
    faze: list[FazaLucru] = field(default_factory=list)
    aprobare_client_zile: float = 0
    masuratori_zile: float = 0
    aprovizionare_zile: float = 0
    uscare_zile: float = 0
    acces_santier_zile: float = 0
    buffer_zile: float = 0
    suprapunere_aprovizionare_pct: float = 0


def calculeaza_termen_realist(inp: TermenRealistInput) -> dict:
    faze_rezultat = []
    total_ore = 0.0
    total_zile_lucru = 0.0
    for f in inp.faze:
        if f.ore_manopera == 0 or f.operatori_alocati == 0:
            zile = 0.0
        else:
            zile = math.ceil((f.ore_manopera / (f.operatori_alocati * inp.ore_lucratoare_zi)) * 10) / 10
        total_ore += f.ore_manopera
        total_zile_lucru += zile
        faze_rezultat.append({"faza": f.faza, "ore_manopera": f.ore_manopera, "operatori_alocati": f.operatori_alocati, "zile_lucru": zile})

    suprapunere_zile = -inp.aprovizionare_zile * inp.suprapunere_aprovizionare_pct
    elemente_asteptare = [
        {"element": "Aprobare client: decor, finisaj, cote", "zile": inp.aprobare_client_zile},
        {"element": "Masuratori la fata locului / acces", "zile": inp.masuratori_zile},
        {"element": "Aprovizionare material", "zile": inp.aprovizionare_zile},
        {"element": "Uscare / intarire vopsea", "zile": inp.uscare_zile},
        {"element": "Asteptare acces santier pentru montaj", "zile": inp.acces_santier_zile},
        {"element": "Buffer de siguranta", "zile": inp.buffer_zile},
        {"element": "Suprapunere aprovizionare cu proiectarea", "zile": suprapunere_zile},
    ]
    total_asteptare = sum(e["zile"] for e in elemente_asteptare)

    total_zile_necesare = total_zile_lucru + total_asteptare
    data_livrare_realista = zi_lucratoare(inp.data_comanda, math.ceil(total_zile_necesare))
    marja_fata_de_cerere = (inp.termen_cerut - data_livrare_realista).days

    pondere_munca = (total_zile_lucru / total_zile_necesare) if total_zile_necesare else 0.0
    pondere_asteptare = (total_asteptare / total_zile_necesare) if total_zile_necesare else 0.0

    if marja_fata_de_cerere < 0:
        verdict = "NU INCAPI - renegociaza termenul"
    elif marja_fata_de_cerere < 3:
        verdict = "RISC - marja sub 3 zile"
    else:
        verdict = "OK - termen realizabil"

    return {
        "cod_proiect": inp.cod_proiect,
        "client": inp.client,
        "faze": faze_rezultat,
        "total_ore": total_ore,
        "total_zile_lucru": total_zile_lucru,
        "elemente_asteptare": elemente_asteptare,
        "total_asteptare": total_asteptare,
        "total_zile_necesare": total_zile_necesare,
        "data_livrare_realista": data_livrare_realista,
        "termen_cerut": inp.termen_cerut,
        "marja_fata_de_cerere": marja_fata_de_cerere,
        "pondere_munca": pondere_munca,
        "pondere_asteptare": pondere_asteptare,
        "verdict": verdict,
    }


@dataclass
class ProiectInput:
    cod_proiect: str
    client: str
    denumire: str
    data_comanda: date
    termen_promis: date
    termen_realizat: date | None = None
    valoare_fara_tva: float = 0
    marja_ofertata: float = 0
    marja_realizata: float | None = None
    faza_curenta: str = ""
    observatii: str = ""


def zile_intarziere(p: ProiectInput) -> int | None:
    if p.termen_realizat is None:
        return None
    return (p.termen_realizat - p.termen_promis).days


def delta_marja(p: ProiectInput) -> float | None:
    if p.marja_realizata is None:
        return None
    return p.marja_realizata - p.marja_ofertata


def calculeaza_durate_flux(jurnal_flux: dict[str, date | None]) -> list[dict]:
    """Durata reala pe faza = diferenta intre data intrarii in faza curenta si urmatoarea."""
    durate = []
    for i in range(len(FAZE_FLUX) - 1):
        faza_curenta = FAZE_FLUX[i]
        faza_urmatoare = FAZE_FLUX[i + 1]
        d1 = jurnal_flux.get(faza_curenta)
        d2 = jurnal_flux.get(faza_urmatoare)
        durata = (d2 - d1).days if d1 and d2 else None
        durate.append({"faza": faza_curenta, "faza_urmatoare": faza_urmatoare, "durata_zile": durata})
    return durate


def medie_durate_flux(proiecte_jurnal: list[dict[str, date | None]]) -> list[dict]:
    """Media pe faza (randul 'MEDIA PE FAZA' din JURNAL FLUX), peste toate proiectele."""
    rezultat = []
    for i in range(len(FAZE_FLUX) - 1):
        faza_curenta = FAZE_FLUX[i]
        faza_urmatoare = FAZE_FLUX[i + 1]
        valori = []
        for jurnal in proiecte_jurnal:
            d1 = jurnal.get(faza_curenta)
            d2 = jurnal.get(faza_urmatoare)
            if d1 and d2:
                valori.append((d2 - d1).days)
        medie = sum(valori) / len(valori) if valori else None
        rezultat.append({"faza": faza_curenta, "faza_urmatoare": faza_urmatoare, "medie_zile": medie, "nr_proiecte": len(valori)})
    return rezultat


@dataclass
class EvenimentCauza:
    data: date
    cod_proiect: str
    faza_afectata: str
    cod_cauza: str
    zile_pierdute: float
    nota: str = ""


def _rang_cu_egalitati(valori: list[float]) -> list[int | None]:
    """Replica RANK(...) + COUNTIF($K$6:K_i, K_i) - 1 din CAUZE INTARZIERE (rang descrescator, unic la egalitate)."""
    ranguri: list[int | None] = []
    for i, v in enumerate(valori):
        if v == 0:
            ranguri.append(None)
            continue
        rang_baza = 1 + sum(1 for alt in valori if alt > v)
        aparitii_pana_acum = sum(1 for j in range(i + 1) if valori[j] == v)
        ranguri.append(rang_baza + aparitii_pana_acum - 1)
    return ranguri


def calculeaza_pareto_cauze(evenimente: list[EvenimentCauza]) -> dict:
    zile_pe_cod: dict[str, float] = {c["cod"]: 0.0 for c in NOMENCLATOR_CAUZE}
    for ev in evenimente:
        zile_pe_cod[ev.cod_cauza] = zile_pe_cod.get(ev.cod_cauza, 0.0) + ev.zile_pierdute

    total_zile = sum(zile_pe_cod.values())
    valori = [zile_pe_cod[c["cod"]] for c in NOMENCLATOR_CAUZE]
    ranguri = _rang_cu_egalitati(valori)

    analiza = []
    for c, zile, rang in zip(NOMENCLATOR_CAUZE, valori, ranguri):
        analiza.append(
            {
                "cod": c["cod"],
                "denumire": c["denumire"],
                "categorie": c["categorie"],
                "zile_pierdute": zile,
                "procent": (zile / total_zile) if total_zile else 0.0,
                "rang": rang,
            }
        )

    top3 = []
    for loc in (1, 2, 3):
        candidati = [a for a in analiza if a["rang"] == loc]
        top3.append(candidati[0] if candidati else None)

    return {
        "analiza": analiza,
        "total_zile_pierdute": total_zile,
        "top3": top3,
    }


def calculeaza_kpi(proiecte: list[ProiectInput], evenimente: list[EvenimentCauza]) -> dict:
    livrate = [p for p in proiecte if p.termen_realizat is not None]
    intarzieri = [zile_intarziere(p) for p in livrate]
    la_termen = [z for z in intarzieri if z is not None and z <= 0]

    marje_ofertate = [p.marja_ofertata for p in proiecte if p.marja_ofertata is not None]
    marje_realizate = [p.marja_realizata for p in proiecte if p.marja_realizata is not None]
    delte_marja = [d for d in (delta_marja(p) for p in proiecte) if d is not None]
    lead_time_zile = [(p.termen_realizat - p.data_comanda).days for p in livrate]

    pareto = calculeaza_pareto_cauze(evenimente)

    return {
        "proiecte_livrate": len(livrate),
        "livrate_la_termen": len(la_termen),
        "procent_livrate_la_termen": (len(la_termen) / len(livrate)) if livrate else 0.0,
        "intarziere_medie_zile": (sum(intarzieri) / len(intarzieri)) if intarzieri else 0.0,
        "lead_time_mediu_zile": (sum(lead_time_zile) / len(lead_time_zile)) if lead_time_zile else 0.0,
        "marja_ofertata_medie": (sum(marje_ofertate) / len(marje_ofertate)) if marje_ofertate else 0.0,
        "marja_realizata_medie": (sum(marje_realizate) / len(marje_realizate)) if marje_realizate else 0.0,
        "erodare_marja_medie": (sum(delte_marja) / len(delte_marja)) if delte_marja else 0.0,
        "zile_pierdute_cumulat": pareto["total_zile_pierdute"],
        "cauza_principala": pareto["top3"][0]["denumire"] if pareto["top3"][0] else "- insuficiente date -",
    }
