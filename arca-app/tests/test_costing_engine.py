import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from costing_engine import DevizInput, Logistica, ManoperaLine, MaterialLine, calculeaza_deviz

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


def _load_nomenclatoare():
    with open(os.path.join(DATA_DIR, "parametri.json"), encoding="utf-8") as f:
        parametri = json.load(f)
    with open(os.path.join(DATA_DIR, "materiale.json"), encoding="utf-8") as f:
        materiale = json.load(f)
    with open(os.path.join(DATA_DIR, "manopera.json"), encoding="utf-8") as f:
        manopera = json.load(f)
    return parametri, materiale, manopera


def test_exemplu_corp_bucatarie_800mm_matches_workbook():
    """Reproduce exact exemplul din foaia DEVIZ a arcacosting.xlsx (corp bucatarie 800mm)."""
    parametri, materiale, manopera = _load_nomenclatoare()

    deviz = DevizInput(
        proiect="Exemplu - corp bucatarie 800 mm",
        client="Client demo",
        data="2026-07-25",
        materiale_linii=[
            MaterialLine("PAL melaminat Kronospan 110 SM Alb corp 18 mm", cantitate=1),
            MaterialLine("Cant PVC Alb 110SM 22 x 2 mm", cantitate=12),
            MaterialLine("Balama Blum CLIP top BLUMOTION 110 aplicata, cu placuta", cantitate=4),
        ],
        manopera_linii=[
            ManoperaLine("Debitare", ore=1.5),
            ManoperaLine("Aplicare cant", ore=1),
            ManoperaLine("Gaurire / CNC", ore=0.8),
            ManoperaLine("Asamblare", ore=2),
            ManoperaLine("Montaj", ore=1.5),
        ],
        ore_proiectare=1,
        logistica=Logistica(transport=0, cazare=0, montaj_ore=2, montaj_nr_montatori=2),
    )

    rezultat = calculeaza_deviz(deviz, parametri, materiale, manopera)
    s = rezultat["sinteza"]
    vm = rezultat["verificare_marja"]

    assert rezultat["materiale"][0]["valoare"] == pytest_approx(278.41)
    assert rezultat["materiale"][1]["valoare"] == pytest_approx(20.0772)
    assert rezultat["materiale"][2]["valoare"] == pytest_approx(74.536)
    assert s["subtotal_materiale"] == pytest_approx(373.0232)

    assert s["subtotal_manopera"] == pytest_approx(352.681349206349)
    assert s["valoare_proiectare"] == pytest_approx(73.0357142857143)
    assert s["subtotal_logistica"] == pytest_approx(220.730158730159)

    assert s["subtotal_cost_direct"] == pytest_approx(1019.470422222222)
    assert s["regie"] == pytest_approx(152.9205633333333)
    assert s["cost_total_productie"] == pytest_approx(1172.390985555556)
    assert s["adaos"] == pytest_approx(351.7172956666667)
    assert s["rezerva"] == pytest_approx(58.61954927777778)
    assert s["pret_vanzare_fara_tva"] == pytest_approx(1582.7278305)
    assert s["tva"] == pytest_approx(332.3728444050002)
    assert s["pret_total_cu_tva"] == pytest_approx(1915.100674905)

    assert vm["marja_bruta_ron"] == pytest_approx(410.33684494444)
    assert vm["marja_bruta_pct"] == pytest_approx(0.259259259259259)
    assert vm["pondere_materiale"] == pytest_approx(0.318173036636952)
    assert vm["pondere_manopera"] == pytest_approx(0.363118676906519)
    assert vm["stare_marja"] == "ATENTIE - aproape de prag"


def pytest_approx(value, rel=1e-6):
    import pytest

    return pytest.approx(value, rel=rel)


def test_material_necunoscut_ridica_eroare_clara():
    import pytest
    from costing_engine import DevizError

    parametri, materiale, manopera = _load_nomenclatoare()
    deviz = DevizInput(
        proiect="Test",
        client="Test",
        data="2026-07-25",
        materiale_linii=[MaterialLine("Material inexistent XYZ", cantitate=1)],
    )
    with pytest.raises(DevizError):
        calculeaza_deviz(deviz, parametri, materiale, manopera)


def test_stare_marja_alerta_sub_prag():
    parametri, materiale, manopera = _load_nomenclatoare()
    # Adaos foarte mic forteaza marja sub prag.
    parametri_alerta = json.loads(json.dumps(parametri))
    parametri_alerta["adaos_comercial"]["valoare"] = 0.05

    deviz = DevizInput(
        proiect="Test marja mica",
        client="Test",
        data="2026-07-25",
        materiale_linii=[MaterialLine("PAL melaminat Kronospan 110 SM Alb corp 18 mm", cantitate=1)],
        manopera_linii=[ManoperaLine("Debitare", ore=1)],
    )
    rezultat = calculeaza_deviz(deviz, parametri_alerta, materiale, manopera)
    assert rezultat["verificare_marja"]["stare_marja"] == "ALERTA - sub prag"
