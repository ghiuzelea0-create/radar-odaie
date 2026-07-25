import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from design_engine import CorpInput
from proiect_engine import CorpProiect, ProiectError, calculeaza_proiect

DECOR_CORP = "PAL melaminat Kronospan 110 SM Alb corp 18 mm"
DECOR_FRONT = "PAL melaminat Egger W1000 ST9 Alb premium 18 mm"


def _corpuri_exemplu() -> list[CorpProiect]:
    """Cele 7 tipuri de corp din foaia PROIECT a arcatechspecproiect.xlsx (bucatarie completa)."""
    return [
        CorpProiect(
            "B1", "Corp baza 800, 2 usi", 1, DECOR_CORP, DECOR_FRONT,
            CorpInput(proiect="B1", latime=800, inaltime=720, adancime=560, grosime_pal=18, grosime_spate_hdf=3,
                       nr_rafturi=1, nr_usi=2, nr_sertare=0, tip_constructie="Laterale continue",
                       tip_inchidere_sus="Traverse", sistem_asamblare="Confirmat", inaltime_front_usa=717, puncte_fixare=3),
        ),
        CorpProiect(
            "B2", "Corp baza 600, 1 usa", 2, DECOR_CORP, DECOR_FRONT,
            CorpInput(proiect="B2", latime=600, inaltime=720, adancime=560, grosime_pal=18, grosime_spate_hdf=3,
                       nr_rafturi=1, nr_usi=1, nr_sertare=0, tip_constructie="Laterale continue",
                       tip_inchidere_sus="Traverse", sistem_asamblare="Confirmat", inaltime_front_usa=717, puncte_fixare=3),
        ),
        CorpProiect(
            "B3", "Corp baza 400, 3 sertare", 1, DECOR_CORP, DECOR_FRONT,
            CorpInput(proiect="B3", latime=400, inaltime=720, adancime=560, grosime_pal=18, grosime_spate_hdf=3,
                       nr_rafturi=0, nr_usi=0, nr_sertare=3, tip_constructie="Laterale continue",
                       tip_inchidere_sus="Traverse", sistem_asamblare="Excentric", inaltime_front_usa=717,
                       inaltime_zona_sertare=717, puncte_fixare=2),
        ),
        CorpProiect(
            "B4", "Corp baza 900 chiuveta, 2 usi", 1, DECOR_CORP, DECOR_FRONT,
            CorpInput(proiect="B4", latime=900, inaltime=720, adancime=560, grosime_pal=18, grosime_spate_hdf=3,
                       nr_rafturi=0, nr_usi=2, nr_sertare=0, tip_constructie="Laterale continue",
                       tip_inchidere_sus="Traverse", sistem_asamblare="Confirmat", inaltime_front_usa=717, puncte_fixare=3),
        ),
        CorpProiect(
            "S1", "Corp suspendat 800, 2 usi", 1, DECOR_CORP, DECOR_FRONT,
            CorpInput(proiect="S1", latime=800, inaltime=720, adancime=320, grosime_pal=18, grosime_spate_hdf=3,
                       nr_rafturi=1, nr_usi=2, nr_sertare=0, tip_constructie="Fund-capac continue",
                       tip_inchidere_sus="Capac complet", sistem_asamblare="Confirmat", inaltime_front_usa=717, puncte_fixare=3),
        ),
        CorpProiect(
            "S2", "Corp suspendat 600, 1 usa", 2, DECOR_CORP, DECOR_FRONT,
            CorpInput(proiect="S2", latime=600, inaltime=720, adancime=320, grosime_pal=18, grosime_spate_hdf=3,
                       nr_rafturi=1, nr_usi=1, nr_sertare=0, tip_constructie="Fund-capac continue",
                       tip_inchidere_sus="Capac complet", sistem_asamblare="Confirmat", inaltime_front_usa=717, puncte_fixare=3),
        ),
        CorpProiect(
            "S3", "Corp suspendat 400, 1 usa", 1, DECOR_CORP, DECOR_FRONT,
            CorpInput(proiect="S3", latime=400, inaltime=720, adancime=320, grosime_pal=18, grosime_spate_hdf=3,
                       nr_rafturi=1, nr_usi=1, nr_sertare=0, tip_constructie="Fund-capac continue",
                       tip_inchidere_sus="Capac complet", sistem_asamblare="Confirmat", inaltime_front_usa=717, puncte_fixare=3),
        ),
    ]


def test_proiect_matches_workbook_totaluri():
    r = calculeaza_proiect(_corpuri_exemplu(), pierdere_tehnologica=0.1)

    assert r["total_corpuri"] == 9
    assert r["total_piese"] == 71

    c = r["consum"]
    assert c["suprafata_pal_corp_mp"] == pytest.approx(11.38872)
    assert c["suprafata_pal_front_mp"] == pytest.approx(4.041714)
    assert c["suprafata_hdf_mp"] == pytest.approx(4.104)
    assert c["pal_corp_necesar_mp"] == pytest.approx(12.527592)
    assert c["pal_front_necesar_mp"] == pytest.approx(4.4458854)
    assert c["hdf_necesar_mp"] == pytest.approx(4.5144)
    assert c["nr_placi_pal_corp"] == 3
    assert c["nr_placi_pal_front"] == 1
    assert c["nr_placi_hdf"] == 1
    assert c["cant_2mm_total_ml"] == pytest.approx(57.9)
    assert c["cant_04mm_total_ml"] == pytest.approx(68.78)
    assert c["stare_control_incrucisat"] == "OK - cele doua metode coincid"

    feronerie = {f["element"]: f["cantitate"] for f in r["feronerie"]}
    assert feronerie["Element de asamblare"] == pytest.approx(132)
    assert feronerie["Balamale"] == pytest.approx(22)
    assert feronerie["Picioare reglabile"] == pytest.approx(20)
    assert feronerie["Suporti raft"] == pytest.approx(28)
    assert feronerie["Glisiere sertar"] == pytest.approx(3)
    assert feronerie["Suruburi fixare spate"] == pytest.approx(166)


def test_consum_pe_decor_matches_workbook():
    r = calculeaza_proiect(_corpuri_exemplu(), pierdere_tehnologica=0.1)
    decor = {d["decor"]: d for d in r["consum_pe_decor"]}

    assert decor[DECOR_CORP]["mp_piese"] == pytest.approx(11.38872)
    assert decor[DECOR_CORP]["placi"] == 3
    assert decor[DECOR_FRONT]["mp_piese"] == pytest.approx(4.041714)
    assert decor[DECOR_FRONT]["placi"] == 1


def test_corp_individual_b2_scaleaza_corect_cu_buc_identice():
    r = calculeaza_proiect(_corpuri_exemplu(), pierdere_tehnologica=0.1)
    randuri_b2 = [row for row in r["randuri_debitare"] if row["cod_corp"] == "B2" and row["denumire_piesa"] == "Laterala"]
    assert len(randuri_b2) == 1
    laterala_b2 = randuri_b2[0]
    assert laterala_b2["buc"] == 4  # 2 laterale/corp x 2 corpuri identice
    assert laterala_b2["cant_2mm_total_ml"] == pytest.approx(2.88)
    assert laterala_b2["suprafata_mp"] == pytest.approx(1.6128)


def test_proiect_fara_corpuri_ridica_eroare():
    with pytest.raises(ProiectError):
        calculeaza_proiect([], pierdere_tehnologica=0.1)
