import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from nomenclator import (
    NomenclatorError,
    adnoteaza_materiale,
    aplica_preturi_contract,
    aplica_salarii,
    formateaza_numar,
    parseaza_numar,
    randuri_cerere_oferta,
    sumar_preturi,
    utilizare_materiale,
)


def _material(cod, denumire, retail=100.0, contract=None):
    return {
        "cod": cod,
        "denumire": denumire,
        "producator": "Egger",
        "categorie": "PAL melaminat",
        "um": "placa",
        "pret_retail": retail,
        "pret_contract": contract,
        "specificatie": "2800x2070x18",
    }


def _deviz(*denumiri):
    return {"input": {"materiale_linii": [{"denumire": d, "cantitate": 1} for d in denumiri]}}


# --- parsarea numerelor ---


def test_accepta_virgula_zecimala_romaneasca():
    assert parseaza_numar("370,23") == pytest.approx(370.23)
    assert parseaza_numar("370.23") == pytest.approx(370.23)


def test_accepta_separator_de_mii_cand_e_neechivoc():
    """Cu amandoi separatorii prezenti, ultimul e cel zecimal — nu ramane nimic de ghicit."""
    assert parseaza_numar("1.234,56") == pytest.approx(1234.56)
    assert parseaza_numar("1,234.56") == pytest.approx(1234.56)
    assert parseaza_numar("1 234,56") == pytest.approx(1234.56)


def test_refuza_sa_ghiceasca_intre_mii_si_zecimale():
    """`6.200` poate fi 6,2 sau 6200.

    Un salariu citit 6,2 in loc de 6200 ar prabusi costul manoperei pe toate
    devizele, fara niciun semn. Mai bine oprim omul decat sa ghicim.
    """
    for ambiguu in ("6.200", "1,234", "12.500", "3,000"):
        with pytest.raises(NomenclatorError) as exc:
            parseaza_numar(ambiguu)
        assert "doua lucruri diferite" in str(exc.value)


def test_doua_zecimale_nu_sunt_ambigue():
    """Doar exact 3 cifre dupa separator sunt ambigue — pretul obisnuit trece."""
    assert parseaza_numar("370,23") == pytest.approx(370.23)
    assert parseaza_numar("6200") == pytest.approx(6200)
    assert parseaza_numar("6200,00") == pytest.approx(6200)
    assert parseaza_numar("0,5") == pytest.approx(0.5)


def test_campul_gol_inseamna_fara_valoare():
    for gol in ("", "   ", "—", "-", None):
        assert parseaza_numar(gol) is None


def test_textul_invalid_da_eroare_cu_ce_a_scris_omul():
    with pytest.raises(NomenclatorError) as exc:
        parseaza_numar("cere oferta")
    assert "cere oferta" in str(exc.value)


def test_pretul_negativ_este_respins():
    with pytest.raises(NomenclatorError):
        parseaza_numar("-10")


# --- preturi de contract ---


def test_scrie_pretul_de_contract_si_raporteaza_modificarea():
    materiale = [_material("A", "PAL Alb"), _material("B", "PAL Casmir")]
    campuri = {"A": "300,50"}

    noi, modificari, erori = aplica_preturi_contract(materiale, campuri.get)

    assert erori == []
    assert noi[0]["pret_contract"] == pytest.approx(300.50)
    assert noi[1]["pret_contract"] is None
    assert len(modificari) == 1
    assert modificari[0]["denumire"] == "PAL Alb"
    assert modificari[0]["vechi"] is None


def test_nu_modifica_nomenclatorul_primit():
    """Apelantul trebuie sa poata renunta la salvare daca apar erori."""
    materiale = [_material("A", "PAL Alb")]
    aplica_preturi_contract(materiale, {"A": "300"}.get)
    assert materiale[0]["pret_contract"] is None


def test_campul_golit_sterge_pretul_de_contract():
    """Singurul mod de a corecta un pret introdus gresit — devizele revin la retail."""
    materiale = [_material("A", "PAL Alb", contract=280.0)]

    noi, modificari, erori = aplica_preturi_contract(materiale, {"A": ""}.get)

    assert erori == []
    assert noi[0]["pret_contract"] is None
    assert modificari[0]["vechi"] == pytest.approx(280.0)
    assert modificari[0]["nou"] is None


def test_aceeasi_valoare_retrimisa_nu_conteaza_ca_modificare():
    """Formularul trimite toate randurile la fiecare salvare, nu doar cele atinse."""
    materiale = [_material("A", "PAL Alb", contract=280.0)]
    _, modificari, _ = aplica_preturi_contract(materiale, {"A": "280,00"}.get)
    assert modificari == []


def test_o_valoare_gresita_nu_pierde_restul_randurilor():
    materiale = [_material("A", "PAL Alb"), _material("B", "PAL Casmir")]

    noi, modificari, erori = aplica_preturi_contract(materiale, {"A": "cere oferta", "B": "250"}.get)

    assert len(erori) == 1
    assert "PAL Alb" in erori[0]
    assert noi[1]["pret_contract"] == pytest.approx(250.0)
    assert len(modificari) == 1


def test_randurile_neafisate_raman_neatinse():
    """Pagina poate afisa doar materialele folosite; restul nu trebuie sterse."""
    materiale = [_material("A", "PAL Alb", contract=280.0), _material("B", "PAL Casmir", contract=310.0)]

    noi, modificari, _ = aplica_preturi_contract(materiale, {"A": "290"}.get)

    assert noi[1]["pret_contract"] == pytest.approx(310.0)
    assert len(modificari) == 1


# --- salarii ---


def _faza(nume, buc=5800, cluj=5350, brasov=4950):
    return {"faza": nume, "um": "ora", "brut_bucuresti": buc, "brut_cluj": cluj, "brut_brasov": brasov}


def test_scrie_salariul_pe_regiunea_ceruta():
    manopera = [_faza("Debitare")]
    campuri = {("Debitare", "brut_bucuresti"): "6200"}

    noi, modificari, erori = aplica_salarii(manopera, lambda f, c: campuri.get((f, c)))

    assert erori == []
    assert noi[0]["brut_bucuresti"] == pytest.approx(6200)
    assert noi[0]["brut_cluj"] == pytest.approx(5350)
    assert modificari[0]["vechi"] == pytest.approx(5800)


def test_salariul_nu_poate_fi_golit():
    """cost_ora_faza il citeste neconditionat — un camp gol ar opri calculul pe faza."""
    manopera = [_faza("Debitare")]
    campuri = {("Debitare", "brut_bucuresti"): ""}

    noi, _, erori = aplica_salarii(manopera, lambda f, c: campuri.get((f, c)))

    assert len(erori) == 1
    assert noi[0]["brut_bucuresti"] == pytest.approx(5800)


def test_salariul_zero_este_respins():
    manopera = [_faza("Debitare")]
    campuri = {("Debitare", "brut_cluj"): "0"}

    noi, _, erori = aplica_salarii(manopera, lambda f, c: campuri.get((f, c)))

    assert len(erori) == 1
    assert noi[0]["brut_cluj"] == pytest.approx(5350)


# --- evidenta a ce lipseste ---


def test_numara_utilizarile_din_devize():
    devize = [_deviz("PAL Alb", "Cant Alb"), _deviz("PAL Alb")]
    assert utilizare_materiale(devize) == {"PAL Alb": 2, "Cant Alb": 1}


def test_devizele_fara_linii_de_material_nu_strica_numaratoarea():
    assert utilizare_materiale([{}, {"input": {}}, {"input": {"materiale_linii": None}}]) == {}


def test_sumarul_separa_materialele_folosite_de_restul():
    materiale = [
        _material("A", "PAL Alb", contract=280.0),
        _material("B", "PAL Casmir"),
        _material("C", "Sertar LEGRABOX", retail=None),
    ]
    adnotate = adnoteaza_materiale(materiale, [_deviz("PAL Casmir", "PAL Alb")])

    s = sumar_preturi(adnotate)

    assert s["total"] == 3
    assert s["cu_contract"] == 1
    assert s["pe_retail"] == 1
    assert s["fara_pret"] == 1
    assert s["folosite"] == 2
    # Doar PAL Casmir: folosit intr-un deviz, dar inca evaluat la pret retail.
    assert s["folosite_fara_contract"] == 1
    assert [m["denumire"] for m in s["de_cerut"]] == ["PAL Casmir"]


def test_cererea_de_oferta_pune_intai_materialele_chiar_folosite():
    materiale = [
        _material("A", "Rar folosit"),
        _material("B", "Des folosit"),
        _material("C", "Are contract", contract=200.0),
    ]
    adnotate = adnoteaza_materiale(materiale, [_deviz("Des folosit"), _deviz("Des folosit"), _deviz("Rar folosit")])

    randuri = randuri_cerere_oferta(adnotate)

    assert [r["denumire"] for r in randuri] == ["Des folosit", "Rar folosit"]
    assert randuri[0]["folosit_in_devize"] == 2
    # Coloana pe care o completeaza furnizorul.
    assert randuri[0]["pret_contract_ofertat"] == ""


# --- reafisarea in formular ---


def test_numerele_se_intorc_in_formular_asa_cum_au_fost_scrise():
    """6200.0 retrimis in camp l-ar face pe om sa creada ca i s-a schimbat valoarea."""
    assert formateaza_numar(6200.0) == "6200"
    assert formateaza_numar(182.23) == "182.23"
    assert formateaza_numar(None) == ""
    assert formateaza_numar("") == ""


def test_valoarea_cu_3_zecimale_ramane_salvabila():
    """`370.235` retrimis ar fi respins ca ambiguu, desi omul n-a atins campul."""
    assert formateaza_numar(370.235) == "370.2350"
    assert parseaza_numar("370.2350") == pytest.approx(370.235)


def test_ce_se_afiseaza_se_si_reciteste_identic():
    """Deschide pagina, apasa Salveaza fara sa modifici nimic: nimic nu trebuie sa se mute."""
    for valoare in (6200.0, 182.23, 0.5, 370.235, 1234.56, 253.1, 0.05):
        assert parseaza_numar(formateaza_numar(valoare)) == pytest.approx(valoare)


def test_adnotarea_nu_modifica_materialele_originale():
    materiale = [_material("A", "PAL Alb")]
    adnoteaza_materiale(materiale, [])
    assert "stare_pret" not in materiale[0]
