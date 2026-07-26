import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from costing_engine import DevizInput, Logistica, MaterialLine, ManoperaLine, calculeaza_deviz
from product_design_engine import ConceptError, ConceptProdus, evalueaza_concept

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


def _load_nomenclatoare():
    with open(os.path.join(DATA_DIR, "parametri.json"), encoding="utf-8") as f:
        parametri = json.load(f)
    with open(os.path.join(DATA_DIR, "materiale.json"), encoding="utf-8") as f:
        materiale = json.load(f)
    with open(os.path.join(DATA_DIR, "manopera.json"), encoding="utf-8") as f:
        manopera = json.load(f)
    return parametri, materiale, manopera


def test_evaluare_concept_matches_direct_deviz_call():
    parametri, materiale, manopera = _load_nomenclatoare()
    materiale_linii = [MaterialLine("PAL melaminat Kronospan 110 SM Alb corp 18 mm", cantitate=1)]
    manopera_linii = [ManoperaLine("Debitare", ore=2)]

    concept = ConceptProdus(
        denumire="Raft test",
        categorie="Mobilier",
        descriere="Test",
        diferentiere="Test",
        materiale_linii=materiale_linii,
        manopera_linii=manopera_linii,
        ore_proiectare=1,
    )
    rezultat = evalueaza_concept(concept, parametri, materiale, manopera)

    deviz_direct = calculeaza_deviz(
        DevizInput(
            proiect="Raft test", client="", data="",
            materiale_linii=materiale_linii, manopera_linii=manopera_linii,
            ore_proiectare=1, logistica=Logistica(),
        ),
        parametri, materiale, manopera,
    )

    assert rezultat["cost"]["sinteza"]["pret_total_cu_tva"] == pytest.approx(
        deviz_direct["sinteza"]["pret_total_cu_tva"]
    )
    assert rezultat["cost"]["sinteza"]["cost_total_productie"] == pytest.approx(
        deviz_direct["sinteza"]["cost_total_productie"]
    )


def test_materiale_fara_pret_semnalate():
    parametri, materiale, manopera = _load_nomenclatoare()
    concept = ConceptProdus(
        denumire="Etajera lemn masiv",
        categorie="Mobilier",
        descriere="Test",
        diferentiere="Test",
        materiale_linii=[
            MaterialLine("Lemn masiv stejar brut, uscat in camera", cantitate=0.05),
            MaterialLine("Profil metalic otel negru 20x20x2 mm", cantitate=2),
        ],
    )
    rezultat = evalueaza_concept(concept, parametri, materiale, manopera)
    assert "Lemn masiv stejar brut, uscat in camera" in rezultat["materiale_fara_pret"]
    assert "Profil metalic otel negru 20x20x2 mm" in rezultat["materiale_fara_pret"]
    # Cost cu materiale fara pret = 0 pentru acele linii, dar nu explodeaza calculul.
    assert rezultat["cost"]["sinteza"]["subtotal_materiale"] == pytest.approx(0.0)


def test_evaluare_piata_fezabil():
    parametri, materiale, manopera = _load_nomenclatoare()
    concept = ConceptProdus(
        denumire="Corp test",
        categorie="Mobilier",
        descriere="Test",
        diferentiere="Test",
        materiale_linii=[MaterialLine("PAL melaminat Kronospan 110 SM Alb corp 18 mm", cantitate=1)],
        manopera_linii=[ManoperaLine("Debitare", ore=1)],
        pret_tinta_piata_cu_tva=1000,
    )
    rezultat = evalueaza_concept(concept, parametri, materiale, manopera)
    ev = rezultat["evaluare_piata"]
    assert ev is not None
    assert ev["pret_tinta_cu_tva"] == 1000
    assert ev["marja_la_pret_tinta_pct"] > 0.25
    assert ev["verdict"].startswith("FEZABIL")


def test_evaluare_piata_sub_prag():
    parametri, materiale, manopera = _load_nomenclatoare()
    concept = ConceptProdus(
        denumire="Corp test scump",
        categorie="Mobilier",
        descriere="Test",
        diferentiere="Test",
        materiale_linii=[MaterialLine("PAL melaminat Kronospan 110 SM Alb corp 18 mm", cantitate=1)],
        manopera_linii=[ManoperaLine("Debitare", ore=1)],
        pret_tinta_piata_cu_tva=350,
    )
    rezultat = evalueaza_concept(concept, parametri, materiale, manopera)
    assert rezultat["evaluare_piata"]["verdict"].startswith("SUB PRAG")


def test_material_necunoscut_ridica_concept_error():
    parametri, materiale, manopera = _load_nomenclatoare()
    concept = ConceptProdus(
        denumire="Concept invalid",
        categorie="Mobilier",
        descriere="Test",
        diferentiere="Test",
        materiale_linii=[MaterialLine("Material care nu exista", cantitate=1)],
    )
    with pytest.raises(ConceptError):
        evalueaza_concept(concept, parametri, materiale, manopera)
