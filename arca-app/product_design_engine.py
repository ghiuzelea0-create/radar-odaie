"""Motor Product Design — evalueaza un concept de produs nou.

Wrapper subtire peste costing_engine: un concept de produs e tratat ca un
"deviz" fara client/logistica de montaj, apoi rezultatul e comparat (optional)
cu un pret tinta de piata pentru a estima marja si fezabilitatea comerciala.

Nu inventeaza preturi: materialele fara pret in nomenclator (lemn masiv, metal,
iluminat — vezi notele "PRET NEPUBLICAT" din materiale.json) intra in calcul cu
cost 0 si sunt semnalate explicit in rezultat, nu ascunse.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from costing_engine import DevizError, DevizInput, Logistica, MaterialLine, ManoperaLine, calculeaza_deviz


class ConceptError(Exception):
    pass


@dataclass
class ConceptProdus:
    denumire: str
    categorie: str  # ex: "Mobilier", "Iluminat", "Accesoriu"
    descriere: str
    diferentiere: str
    materiale_linii: list[MaterialLine] = field(default_factory=list)
    manopera_linii: list[ManoperaLine] = field(default_factory=list)
    ore_proiectare: float = 0
    pret_tinta_piata_cu_tva: float | None = None


def _materiale_fara_pret(concept: ConceptProdus, materiale_nomenclator: list[dict]) -> list[str]:
    index = {m["denumire"]: m for m in materiale_nomenclator}
    lipsa = []
    for linie in concept.materiale_linii:
        m = index.get(linie.denumire)
        if m is not None and not m.get("pret_contract") and not m.get("pret_retail"):
            lipsa.append(linie.denumire)
    return lipsa


def evalueaza_concept(
    concept: ConceptProdus, parametri_raw: dict, materiale_nomenclator: list[dict], manopera_nomenclator: list[dict]
) -> dict:
    deviz_input = DevizInput(
        proiect=concept.denumire,
        client="",
        data="",
        materiale_linii=concept.materiale_linii,
        manopera_linii=concept.manopera_linii,
        ore_proiectare=concept.ore_proiectare,
        logistica=Logistica(),
    )
    try:
        rezultat_cost = calculeaza_deviz(deviz_input, parametri_raw, materiale_nomenclator, manopera_nomenclator)
    except DevizError as exc:
        raise ConceptError(str(exc)) from exc

    sinteza = rezultat_cost["sinteza"]
    materiale_fara_pret = _materiale_fara_pret(concept, materiale_nomenclator)

    evaluare_piata = None
    if concept.pret_tinta_piata_cu_tva:
        tva = float(parametri_raw["tva"]["valoare"])
        prag_marja_minima = float(parametri_raw["prag_alerta_marja"]["valoare"])
        pret_tinta_fara_tva = concept.pret_tinta_piata_cu_tva / (1 + tva)
        marja_la_pret_tinta_ron = pret_tinta_fara_tva - sinteza["cost_total_productie"]
        marja_la_pret_tinta_pct = (
            (marja_la_pret_tinta_ron / pret_tinta_fara_tva) if pret_tinta_fara_tva else 0.0
        )
        if marja_la_pret_tinta_pct < prag_marja_minima:
            verdict = "SUB PRAG - la pretul tinta, marja e sub minimul acceptat"
        elif marja_la_pret_tinta_pct < prag_marja_minima + 0.05:
            verdict = "ATENTIE - marja la pretul tinta e aproape de prag"
        else:
            verdict = "FEZABIL - marja la pretul tinta depaseste pragul minim"

        evaluare_piata = {
            "pret_tinta_cu_tva": concept.pret_tinta_piata_cu_tva,
            "pret_tinta_fara_tva": pret_tinta_fara_tva,
            "marja_la_pret_tinta_ron": marja_la_pret_tinta_ron,
            "marja_la_pret_tinta_pct": marja_la_pret_tinta_pct,
            "prag_marja_minima": prag_marja_minima,
            "verdict": verdict,
        }

    return {
        "concept": {
            "denumire": concept.denumire,
            "categorie": concept.categorie,
            "descriere": concept.descriere,
            "diferentiere": concept.diferentiere,
        },
        "cost": rezultat_cost,
        "materiale_fara_pret": materiale_fara_pret,
        "evaluare_piata": evaluare_piata,
    }
