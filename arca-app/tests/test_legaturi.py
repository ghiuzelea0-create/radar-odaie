import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from legaturi import (
    compara_marja_ofertata,
    coduri_proiecte,
    devize_pentru_proiect,
    normalizeaza_cod,
    total_ofertat,
)


def _deviz(cod_proiect: str, pret: float, cost: float) -> dict:
    """Un deviz cu structura pe care o scrie `app.deviz_nou`."""
    return {
        "proiect": cod_proiect,
        "client": "Client",
        "rezultat": {
            "sinteza": {"pret_vanzare_fara_tva": pret, "cost_total_productie": cost},
            "verificare_marja": {
                "pret_vanzare_fara_tva": pret,
                "cost_total_productie": cost,
                "marja_bruta_pct": (pret - cost) / pret if pret else 0,
            },
        },
    }


# Cifre dintr-un deviz calculat efectiv de costing_engine cu parametrii impliciti.
DEVIZ_REAL_PRET = 14612.410829999997
DEVIZ_REAL_COST = 10824.00802222222


def test_normalizeaza_cod_ignora_spatiile_si_majusculele():
    assert normalizeaza_cod(" ARC-2026-045 ") == normalizeaza_cod("arc-2026-045")
    assert normalizeaza_cod(None) == ""
    assert normalizeaza_cod("   ") == ""


def test_devize_pentru_proiect_potriveste_indiferent_de_scriere():
    devize = [
        _deviz("ARC-2026-045", 1000, 800),
        _deviz(" arc-2026-045 ", 2000, 1500),
        _deviz("ARC-2026-046", 3000, 2000),
    ]
    gasite = devize_pentru_proiect(devize, "ARC-2026-045")
    assert len(gasite) == 2
    assert total_ofertat(gasite) == pytest.approx(3000)


def test_devize_pentru_proiect_fara_cod_nu_returneaza_nimic():
    """Un cod gol nu trebuie sa 'prinda' devizele carora le lipseste proiectul."""
    devize = [_deviz("", 1000, 800), _deviz("ARC-1", 2000, 1500)]
    assert devize_pentru_proiect(devize, "") == []
    assert devize_pentru_proiect(devize, "   ") == []


def test_coduri_proiecte_sare_peste_inregistrarile_fara_cod():
    records = [
        {"input": {"cod_proiect": "ARC-1", "client": "A", "denumire": "Bucatarie"}},
        {"input": {"cod_proiect": "", "client": "B", "denumire": "Fara cod"}},
        {"input": {"client": "C"}},
    ]
    optiuni = coduri_proiecte(records)
    assert [o["cod_proiect"] for o in optiuni] == ["ARC-1"]
    assert optiuni[0]["denumire"] == "Bucatarie"


def test_compara_marja_semnaleaza_diferenta_fata_de_registru():
    """Registrul spune 34%, dar devizul calculeaza 25,93% — o diferenta reala."""
    devize = [_deviz("ARC-1", DEVIZ_REAL_PRET, DEVIZ_REAL_COST)]
    r = compara_marja_ofertata(devize, 0.34)

    assert r is not None
    assert r["marja_devize"] == pytest.approx(0.25925925925925924, abs=1e-9)
    assert r["marja_registru"] == 0.34
    assert r["diferenta"] == pytest.approx(0.0807407407, abs=1e-6)
    assert r["coincid"] is False


def test_compara_marja_accepta_rotunjirea_din_registru():
    """Registrul se completeaza in procente intregi, deci 26% ~ 25,93%."""
    devize = [_deviz("ARC-1", DEVIZ_REAL_PRET, DEVIZ_REAL_COST)]
    r = compara_marja_ofertata(devize, 0.26)
    assert r["coincid"] is True


def test_compara_marja_insumeaza_mai_multe_devize():
    """Un proiect poate avea mai multe devize; marja se calculeaza pe total."""
    devize = [_deviz("ARC-1", 1000, 700), _deviz("ARC-1", 1000, 900)]
    r = compara_marja_ofertata(devize, 0.20)
    # (2000 - 1600) / 2000 = 20%
    assert r["marja_devize"] == pytest.approx(0.20)
    assert r["coincid"] is True


def test_compara_marja_nu_inventeaza_cand_lipsesc_datele():
    devize = [_deviz("ARC-1", 1000, 800)]
    assert compara_marja_ofertata([], 0.30) is None
    assert compara_marja_ofertata(devize, None) is None
    assert compara_marja_ofertata([_deviz("ARC-1", 0, 0)], 0.30) is None
