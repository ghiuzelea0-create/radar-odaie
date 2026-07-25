import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from design_engine import CorpError, CorpInput, calculeaza_corp


def _corp_exemplu(**overrides) -> CorpInput:
    """Corpul bucatarie 800 mm din arcatechspec.xlsx (foaia CORP, valorile implicite)."""
    valori = dict(
        proiect="Corp baza bucatarie 800",
        latime=800,
        inaltime=720,
        adancime=560,
        grosime_pal=18,
        grosime_spate_hdf=3,
        nr_rafturi=1,
        nr_usi=2,
        nr_sertare=0,
        tip_constructie="Laterale continue",
        tip_inchidere_sus="Traverse",
        sistem_asamblare="Confirmat",
        cant_04_pe_muchii_ascunse="Da",
        latime_traversa_sus=100,
        retragere_raft=20,
        rost_fronturi=3,
        inaltime_front_usa=717,
        inaltime_zona_sertare=0,
        puncte_fixare=3,
        pas_suruburi_spate=150,
        pierdere_tehnologica=0.1,
    )
    valori.update(overrides)
    return CorpInput(**valori)


def _piesa(rezultat, denumire):
    for p in rezultat["lista_debitare"]["piese"]:
        if p["denumire"] == denumire:
            return p
    raise KeyError(denumire)


def test_verificare_geometrica_ok():
    r = calculeaza_corp(_corp_exemplu())
    vg = r["verificare_geometrica"]
    assert vg["adancime_totala_cu_spate"] == pytest.approx(563)
    assert vg["l_reconstituit"] == pytest.approx(800)
    assert vg["h_reconstituit"] == pytest.approx(720)
    assert vg["stare"] == "OK - cotele se inchid"


def test_lista_debitare_matches_workbook_exemplu():
    r = calculeaza_corp(_corp_exemplu())

    laterala = _piesa(r, "Laterala")
    assert laterala["lungime"] == pytest.approx(720)
    assert laterala["latime"] == pytest.approx(560)
    assert laterala["buc"] == 2
    assert laterala["cant_2mm_ml_buc"] == pytest.approx(0.72)
    assert laterala["cant_04mm_ml_buc"] == pytest.approx(1.84)
    assert laterala["suprafata_mp"] == pytest.approx(0.8064)

    fund = _piesa(r, "Fund")
    assert fund["lungime"] == pytest.approx(764)
    assert fund["cant_2mm_ml_buc"] == pytest.approx(0.764)
    assert fund["cant_04mm_ml_buc"] == pytest.approx(1.884)
    assert fund["suprafata_mp"] == pytest.approx(0.42784)

    capac = _piesa(r, "Capac complet")
    assert capac["buc"] == 0
    assert capac["suprafata_mp"] == pytest.approx(0)

    trav_fata = _piesa(r, "Traversa sus - fata")
    assert trav_fata["buc"] == 1
    assert trav_fata["cant_2mm_ml_buc"] == pytest.approx(0.764)
    assert trav_fata["cant_04mm_ml_buc"] == pytest.approx(0.964)
    assert trav_fata["suprafata_mp"] == pytest.approx(0.0764)

    trav_spate = _piesa(r, "Traversa sus - spate")
    assert trav_spate["cant_2mm_ml_buc"] == pytest.approx(0)
    assert trav_spate["cant_04mm_ml_buc"] == pytest.approx(1.728)
    assert trav_spate["suprafata_mp"] == pytest.approx(0.0764)

    raft = _piesa(r, "Raft")
    assert raft["lungime"] == pytest.approx(764)
    assert raft["latime"] == pytest.approx(540)
    assert raft["cant_2mm_ml_buc"] == pytest.approx(0.764)
    assert raft["cant_04mm_ml_buc"] == pytest.approx(1.844)
    assert raft["suprafata_mp"] == pytest.approx(0.41256)

    spate = _piesa(r, "Spate")
    assert spate["lungime"] == pytest.approx(800)
    assert spate["latime"] == pytest.approx(720)
    assert spate["cant_2mm_ml_buc"] == pytest.approx(0)
    assert spate["cant_04mm_ml_buc"] == pytest.approx(0)
    assert spate["suprafata_mp"] == pytest.approx(0.576)

    front_usa = _piesa(r, "Front usa")
    assert front_usa["lungime"] == pytest.approx(714)
    assert front_usa["latime"] == pytest.approx(397)
    assert front_usa["buc"] == 2
    assert front_usa["cant_2mm_ml_buc"] == pytest.approx(2.222)
    assert front_usa["cant_04mm_ml_buc"] == pytest.approx(0)
    assert front_usa["suprafata_mp"] == pytest.approx(0.566916)

    front_sertar = _piesa(r, "Front sertar")
    assert front_sertar["buc"] == 0

    d = r["lista_debitare"]
    assert d["total_buc"] == 9
    assert d["total_cant_2mm_ml"] == pytest.approx(8.176)
    assert d["total_cant_04mm_ml"] == pytest.approx(10.1)
    assert d["total_suprafata_mp"] == pytest.approx(2.942516)


def test_feronerie_matches_workbook_exemplu():
    r = calculeaza_corp(_corp_exemplu())
    feronerie = {f["element"]: f for f in r["feronerie"]}

    assert feronerie["Numar imbinari corp"]["cantitate"] == 6
    assert feronerie["Element de asamblare"]["cantitate"] == 18
    assert feronerie["Element de asamblare"]["observatii"] == "Confirmat 7x50"
    assert feronerie["Balamale"]["cantitate"] == 4
    assert feronerie["Placute de montaj balama"]["cantitate"] == 4
    assert feronerie["Picioare reglabile"]["cantitate"] == 4
    assert feronerie["Suporti raft"]["cantitate"] == 4
    assert feronerie["Glisiere sertar"]["cantitate"] == 0
    assert feronerie["Suruburi fixare spate"]["cantitate"] == 21


def test_consum_material_matches_workbook_exemplu():
    r = calculeaza_corp(_corp_exemplu())
    consum = r["consum"]

    assert consum["suprafata_pal_corp_mp"] == pytest.approx(1.7996)
    assert consum["suprafata_pal_front_mp"] == pytest.approx(0.566916)
    assert consum["suprafata_hdf_mp"] == pytest.approx(0.576)

    assert consum["pal_corp_necesar_metoda_deviz_mp"] == pytest.approx(1.97956)
    assert consum["pal_corp_necesar_randament_croire_mp"] == pytest.approx(1.99955555555556, rel=1e-6)
    assert consum["pal_front_necesar_metoda_deviz_mp"] == pytest.approx(0.6236076)
    assert consum["hdf_necesar_metoda_deviz_mp"] == pytest.approx(0.6336)

    assert consum["nr_placi_pal_corp"] == 1
    assert consum["nr_placi_pal_front"] == 1
    assert consum["nr_placi_hdf"] == 1

    assert consum["cant_2mm_total_ml"] == pytest.approx(8.176)
    assert consum["cant_04mm_total_ml"] == pytest.approx(10.1)
    assert consum["nr_total_piese"] == 9


def test_dimensiune_negativa_ridica_eroare():
    with pytest.raises(CorpError):
        calculeaza_corp(_corp_exemplu(latime=-100))


def test_corp_suspendat_fara_picioare_cu_capac_complet():
    r = calculeaza_corp(_corp_exemplu(tip_inchidere_sus="Capac complet"))
    feronerie = {f["element"]: f for f in r["feronerie"]}
    assert feronerie["Picioare reglabile"]["cantitate"] == 0
    assert feronerie["Numar imbinari corp"]["cantitate"] == 4
    capac = _piesa(r, "Capac complet")
    assert capac["buc"] == 1
    trav_fata = _piesa(r, "Traversa sus - fata")
    assert trav_fata["buc"] == 0
