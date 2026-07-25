import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from management_engine import (
    EvenimentCauza,
    FazaLucru,
    ProiectInput,
    TermenRealistInput,
    calculeaza_kpi,
    calculeaza_pareto_cauze,
    calculeaza_termen_realist,
    zi_lucratoare,
)


def _termen_realist_exemplu() -> TermenRealistInput:
    """Exemplul din foaia TERMEN REALIST a arcaflux.xlsx (proiect ARC-2026-047)."""
    return TermenRealistInput(
        cod_proiect="ARC-2026-047",
        client="Exemplu client",
        data_comanda=date(2026, 7, 27),
        termen_cerut=date(2026, 8, 21),
        ore_lucratoare_zi=8,
        faze=[
            FazaLucru("Proiectare tehnica", 6, 1),
            FazaLucru("Debitare", 6, 1),
            FazaLucru("Aplicare cant", 5, 1),
            FazaLucru("Gaurire / CNC", 4, 1),
            FazaLucru("Asamblare", 12, 2),
            FazaLucru("Vopsire", 0, 1),
            FazaLucru("Finisare", 3, 1),
            FazaLucru("Ambalare", 2, 1),
            FazaLucru("Montaj", 10, 2),
        ],
        aprobare_client_zile=3,
        masuratori_zile=1,
        aprovizionare_zile=7,
        uscare_zile=0,
        acces_santier_zile=2,
        buffer_zile=2,
        suprapunere_aprovizionare_pct=0.5,
    )


def test_zi_lucratoare_sare_weekendul():
    # 2026-07-27 este luni; 17 zile lucratoare mai tarziu ar trebui sa fie miercuri 2026-08-19.
    assert zi_lucratoare(date(2026, 7, 27), 17) == date(2026, 8, 19)


def test_termen_realist_matches_workbook_exemplu():
    r = calculeaza_termen_realist(_termen_realist_exemplu())

    faze_zile = {f["faza"]: f["zile_lucru"] for f in r["faze"]}
    assert faze_zile["Proiectare tehnica"] == pytest.approx(0.8)
    assert faze_zile["Debitare"] == pytest.approx(0.8)
    assert faze_zile["Aplicare cant"] == pytest.approx(0.7)
    assert faze_zile["Gaurire / CNC"] == pytest.approx(0.5)
    assert faze_zile["Asamblare"] == pytest.approx(0.8)
    assert faze_zile["Vopsire"] == pytest.approx(0)
    assert faze_zile["Finisare"] == pytest.approx(0.4)
    assert faze_zile["Ambalare"] == pytest.approx(0.3)
    assert faze_zile["Montaj"] == pytest.approx(0.7)

    assert r["total_ore"] == pytest.approx(48)
    assert r["total_zile_lucru"] == pytest.approx(5.0)
    assert r["total_asteptare"] == pytest.approx(11.5)
    assert r["total_zile_necesare"] == pytest.approx(16.5)
    assert r["data_livrare_realista"] == date(2026, 8, 19)
    assert r["marja_fata_de_cerere"] == 2
    assert r["pondere_munca"] == pytest.approx(0.303030303030303)
    assert r["pondere_asteptare"] == pytest.approx(0.696969696969697)
    assert r["verdict"] == "RISC - marja sub 3 zile"


def _proiecte_exemplu() -> list[ProiectInput]:
    """Cele 3 proiecte din foaia REGISTRU PROIECTE (045, 046 livrate; 047 in curs)."""
    return [
        ProiectInput(
            cod_proiect="ARC-2026-045",
            client="Client A",
            denumire="Bucatarie + dressing",
            data_comanda=date(2026, 6, 15),
            termen_promis=date(2026, 7, 10),
            termen_realizat=date(2026, 7, 17),
            valoare_fara_tva=28500,
            marja_ofertata=0.34,
            marja_realizata=0.27,
        ),
        ProiectInput(
            cod_proiect="ARC-2026-046",
            client="Client B",
            denumire="Mobilier birou",
            data_comanda=date(2026, 6, 29),
            termen_promis=date(2026, 7, 24),
            termen_realizat=date(2026, 7, 23),
            valoare_fara_tva=16200,
            marja_ofertata=0.31,
            marja_realizata=0.30,
        ),
        ProiectInput(
            cod_proiect="ARC-2026-047",
            client="Exemplu client",
            denumire="Bucatarie in L",
            data_comanda=date(2026, 7, 27),
            termen_promis=date(2026, 8, 21),
            termen_realizat=None,
            valoare_fara_tva=21400,
            marja_ofertata=0.33,
            marja_realizata=None,
        ),
    ]


def _evenimente_exemplu() -> list[EvenimentCauza]:
    """Cele 5 evenimente din jurnalul CAUZE INTARZIERE."""
    return [
        EvenimentCauza(date(2026, 6, 22), "ARC-2026-045", "Aprovizionare", "C03", 4, "Decor indisponibil la distribuitor"),
        EvenimentCauza(date(2026, 6, 30), "ARC-2026-045", "Debitare", "C07", 1, "Doua laterale retaiate, cota gresita"),
        EvenimentCauza(date(2026, 7, 6), "ARC-2026-045", "Montaj", "C13", 2, "Pardoseala nefinalizata la client"),
        EvenimentCauza(date(2026, 7, 2), "ARC-2026-046", "Proiectare tehnica", "C01", 2, "Client a intarziat confirmarea decorului"),
        EvenimentCauza(date(2026, 7, 14), "ARC-2026-046", "Asamblare", "C12", 1, "Balamale insuficiente in stoc"),
    ]


def test_pareto_cauze_matches_workbook_exemplu():
    pareto = calculeaza_pareto_cauze(_evenimente_exemplu())
    analiza = {a["cod"]: a for a in pareto["analiza"]}

    assert analiza["C01"]["zile_pierdute"] == 2
    assert analiza["C01"]["procent"] == pytest.approx(0.2)
    assert analiza["C01"]["rang"] == 2

    assert analiza["C03"]["zile_pierdute"] == 4
    assert analiza["C03"]["procent"] == pytest.approx(0.4)
    assert analiza["C03"]["rang"] == 1

    assert analiza["C07"]["rang"] == 4
    assert analiza["C12"]["rang"] == 5
    assert analiza["C13"]["zile_pierdute"] == 2
    assert analiza["C13"]["rang"] == 3

    assert analiza["C02"]["rang"] is None

    assert pareto["total_zile_pierdute"] == 10
    assert pareto["top3"][0]["denumire"] == "Material intarziat de furnizor"
    assert pareto["top3"][1]["denumire"] == "Asteptare aprobare client (decor, finisaj)"
    assert pareto["top3"][2]["denumire"] == "Montaj amanat de client"


def test_kpi_matches_workbook_exemplu():
    kpi = calculeaza_kpi(_proiecte_exemplu(), _evenimente_exemplu())

    assert kpi["proiecte_livrate"] == 2
    assert kpi["livrate_la_termen"] == 1
    assert kpi["procent_livrate_la_termen"] == pytest.approx(0.5)
    assert kpi["intarziere_medie_zile"] == pytest.approx(3)
    assert kpi["lead_time_mediu_zile"] == pytest.approx(28)
    assert kpi["marja_ofertata_medie"] == pytest.approx(0.326666666666667)
    assert kpi["marja_realizata_medie"] == pytest.approx(0.285)
    assert kpi["erodare_marja_medie"] == pytest.approx(-0.04)
    assert kpi["zile_pierdute_cumulat"] == 10
    assert kpi["cauza_principala"] == "Material intarziat de furnizor"
