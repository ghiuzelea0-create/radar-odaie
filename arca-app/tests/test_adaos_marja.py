import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json

import pytest

from costing_engine import (
    DevizInput,
    Logistica,
    ManoperaLine,
    MaterialLine,
    adaos_pentru_marja,
    calculeaza_deviz,
    marja_din_adaos,
    scenarii_adaos,
)

DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


def test_adaosul_nu_este_marja():
    """Capcana pe care regulile proiectului o semnaleaza explicit."""
    assert marja_din_adaos(0.30, 0) == pytest.approx(0.23076923076923078)
    assert marja_din_adaos(0.30, 0) < 0.30


def test_marja_la_parametrii_impliciti():
    """Adaos 30% + rezerva 5% dau 25,93%, nu 35%."""
    assert marja_din_adaos(0.30, 0.05) == pytest.approx(0.25925925925925924, abs=1e-12)


def test_adaos_pentru_marja_este_inversa():
    for marja, rezerva in [(0.35, 0.05), (0.25, 0.0), (0.40, 0.10)]:
        assert marja_din_adaos(adaos_pentru_marja(marja, rezerva), rezerva) == pytest.approx(marja, abs=1e-12)


def test_adaosul_necesar_pentru_tinta_de_35():
    assert adaos_pentru_marja(0.35, 0.05) == pytest.approx(0.4884615384615385, abs=1e-12)


def test_marja_100_la_suta_este_imposibila():
    with pytest.raises(ValueError):
        adaos_pentru_marja(1.0, 0.05)


def test_formula_coincide_cu_motorul_real():
    """Plasa de siguranta: daca formula de pret din motor se schimba, testul cade.

    Fara asta, `marja_din_adaos` ar putea ramane in urma fara sa observe nimeni,
    iar pagina Parametri ar afisa alte cifre decat devizele.
    """
    parametri = json.load(open(os.path.join(DATA, "parametri.json")))
    materiale = json.load(open(os.path.join(DATA, "materiale.json")))
    manopera = json.load(open(os.path.join(DATA, "manopera.json")))

    deviz = DevizInput(
        proiect="TEST",
        client="Test",
        data="2026-08-02",
        materiale_linii=[MaterialLine("PAL melaminat Egger W1000 ST9 Alb premium 18 mm", 12, None)],
        manopera_linii=[ManoperaLine("Debitare", 8)],
        ore_proiectare=5,
        logistica=Logistica(transport=300, cazare=0, montaj_ore=6, montaj_nr_montatori=1),
    )

    rezerva = parametri["rezerva_risc"]["valoare"]
    for adaos in (0.20, 0.30, 0.4884615384615385, 0.60):
        parametri["adaos_comercial"]["valoare"] = adaos
        rezultat = calculeaza_deviz(deviz, parametri, materiale, manopera)
        marja_motor = rezultat["verificare_marja"]["marja_bruta_pct"]
        assert marja_din_adaos(adaos, rezerva) == pytest.approx(marja_motor, abs=1e-12)


def test_scenariile_includ_adaosul_curent_si_pe_cel_tinta():
    s = scenarii_adaos(adaos_curent=0.30, rezerva=0.05, marja_tinta=0.35)

    curent = [x for x in s if x["este_curent"]]
    tinta = [x for x in s if x["atinge_tinta"]]
    assert len(curent) == 1
    assert len(tinta) == 1
    assert curent[0]["adaos"] == pytest.approx(0.30)
    assert tinta[0]["adaos"] == pytest.approx(0.4884615384615385)

    # Scenariul curent este referinta, deci diferentele lui sunt zero.
    assert curent[0]["delta_pret_pct"] == pytest.approx(0)
    assert curent[0]["delta_castig_pct"] == pytest.approx(0)


def test_pargia_dintre_pret_si_castig():
    """Cifra care conteaza: +14% la client inseamna +54% la tine."""
    s = scenarii_adaos(adaos_curent=0.30, rezerva=0.05, marja_tinta=0.35)
    tinta = next(x for x in s if x["atinge_tinta"])

    # Toleranta pe potriva rotunjirii adaosului la 6 zecimale din `scenarii_adaos`.
    assert tinta["delta_pret_pct"] == pytest.approx(0.1396011396011396, abs=1e-5)
    assert tinta["delta_castig_pct"] == pytest.approx(0.5384615384615385, abs=1e-5)
    # Castigul creste de aproape 4 ori mai repede decat pretul.
    assert tinta["delta_castig_pct"] > 3.5 * tinta["delta_pret_pct"]


def test_scenariile_sunt_ordonate_si_fara_duplicate():
    s = scenarii_adaos(adaos_curent=0.30, rezerva=0.05, marja_tinta=0.35)
    adaosuri = [x["adaos"] for x in s]
    assert adaosuri == sorted(adaosuri)
    assert len(adaosuri) == len(set(adaosuri))


def test_niciun_rand_dublu_cand_adaosul_curent_atinge_deja_tinta():
    """Adaosul salvat si cel calculat din tinta pot diferi cu un ULP.

    Fara toleranta la deduplicare, tabelul afisa acelasi rand de doua ori exact
    in momentul in care utilizatorul tocmai a atins tinta.
    """
    adaos_salvat = 0.4884615384615385  # asa ajunge din formular
    assert adaos_salvat != adaos_pentru_marja(0.35, 0.05)  # difera cu un ULP

    s = scenarii_adaos(adaos_curent=adaos_salvat, rezerva=0.05, marja_tinta=0.35)
    adaosuri = [x["adaos"] for x in s]
    assert len(adaosuri) == len(set(adaosuri))
    assert sum(1 for x in s if x["este_curent"]) == 1
    assert sum(1 for x in s if x["atinge_tinta"]) == 1


def test_adaosul_rotunjit_din_parametri_nu_dubleaza_randul_tinta():
    """Valoarea reala din parametri e scrisa rotunjit, nu cu 16 zecimale.

    0,4885 fata de 0,4884615... difera cu 0,004 puncte procentuale, dar in tabel
    se afisau ca 48,9% si 48,8% — doua randuri cu aceeasi marja de 35,0%.
    """
    s = scenarii_adaos(adaos_curent=0.4885, rezerva=0.05, marja_tinta=0.35)

    randuri_tinta = [x for x in s if x["atinge_tinta"]]
    assert len(randuri_tinta) == 1
    # Acelasi rand poarta ambele etichete: e si cel configurat, si cel care atinge tinta.
    assert randuri_tinta[0]["este_curent"]
    assert randuri_tinta[0]["adaos"] == pytest.approx(0.4885)

    # Niciun alt rand nu e la mai putin de 0,1 puncte procentuale de el.
    altele = [x["adaos"] for x in s if not x["atinge_tinta"]]
    assert all(abs(a - 0.4885) > 0.001 for a in altele)


def test_adaosul_configurat_chiar_atinge_tinta_de_marja():
    """Nimic nu verifica setarile reale — de aici a venit gaura de 9 puncte.

    Adaosul livrat era 30%, tinta 35%, iar tinta nu intra in nicio formula: fiecare
    deviz iesea cu 25,93% si nimeni nu semnala. Testul asta leaga cele doua valori
    din `data/parametri.json`, ca sa nu mai poata pleca una fara alta.

    Daca pica: ori adaosul, ori tinta a fost schimbata singura. Pagina
    /parametri arata adaosul necesar pentru tinta curenta.
    """
    parametri = json.load(open(os.path.join(DATA, "parametri.json")))
    adaos = parametri["adaos_comercial"]["valoare"]
    rezerva = parametri["rezerva_risc"]["valoare"]
    tinta = parametri["marja_bruta_tinta"]["valoare"]

    marja_efectiva = marja_din_adaos(adaos, rezerva)

    # Toleranta 0,1 puncte procentuale: adaosul e rotunjit la 4 zecimale in fisier.
    assert marja_efectiva == pytest.approx(tinta, abs=0.001), (
        f"Adaosul de {adaos:.2%} cu rezerva {rezerva:.2%} da marja {marja_efectiva:.2%}, "
        f"dar tinta e {tinta:.2%}. Adaosul necesar: {adaos_pentru_marja(tinta, rezerva):.2%}."
    )


def test_adaosul_configurat_tine_devizele_peste_pragul_de_alerta():
    """Marja rezultata trebuie sa fie confortabil peste pragul de alerta.

    La adaosul vechi de 30% marja era 25,93% fata de un prag de 25% — adica
    fiecare deviz aparea cu 'ATENTIE - aproape de prag'. Un avertisment care
    apare mereu nu mai avertizeaza.
    """
    parametri = json.load(open(os.path.join(DATA, "parametri.json")))
    marja_efectiva = marja_din_adaos(
        parametri["adaos_comercial"]["valoare"], parametri["rezerva_risc"]["valoare"]
    )
    prag = parametri["prag_alerta_marja"]["valoare"]

    # +0,05 este banda de 'ATENTIE' din costing_engine.calculeaza_deviz.
    assert marja_efectiva >= prag + 0.05, (
        f"Marja {marja_efectiva:.2%} cade in banda de atentie a pragului {prag:.2%}."
    )
