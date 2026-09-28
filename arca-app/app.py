from __future__ import annotations

import csv
import io
import json
import os
from datetime import date

from flask import Flask, Response, redirect, render_template, request, url_for

from costing_engine import (
    DevizError,
    DevizInput,
    Logistica,
    ManoperaLine,
    MaterialLine,
    adaos_pentru_marja,
    calculeaza_deviz,
    marja_din_adaos,
    scenarii_adaos,
)
from design_engine import CorpError, CorpInput, TIPURI_CONSTRUCTIE, TIPURI_INCHIDERE_SUS, SISTEME_ASAMBLARE, calculeaza_corp
from legaturi import coduri_proiecte, compara_marja_ofertata, devize_pentru_proiect, total_ofertat
from nomenclator import (
    adnoteaza_materiale,
    aplica_preturi_contract,
    aplica_salarii,
    formateaza_numar,
    randuri_cerere_oferta,
    sumar_preturi,
)
from management_engine import (
    CODURI_TRASABILITATE,
    FAZE_FLUX,
    NOMENCLATOR_CAUZE,
    PROCEDURA_FLUX,
    EvenimentCauza,
    FazaLucru,
    ProiectInput,
    TermenRealistInput,
    calculeaza_durate_flux,
    calculeaza_kpi,
    calculeaza_pareto_cauze,
    calculeaza_termen_realist,
    delta_marja,
    zile_intarziere,
)
from proiect_engine import CorpProiect, ProiectError, calculeaza_proiect
from qa_agent import QAIndisponibil, verifica_deviz
from storage import (
    incarca_corp,
    incarca_deviz,
    incarca_proiect_management,
    incarca_proiect_tehnic,
    listeaza_corpuri,
    listeaza_devize,
    listeaza_evenimente_cauze,
    listeaza_evenimente_cauze_pentru,
    listeaza_proiecte_management,
    listeaza_proiecte_tehnice,
    salveaza_corp,
    salveaza_deviz,
    salveaza_eveniment_cauza,
    salveaza_proiect_management,
    salveaza_proiect_tehnic,
)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

app = Flask(__name__)

# Campurile de formular reafiseaza numerele fara zerouri inutile: altfel un
# salariu scris „6200" s-ar intoarce ca „6200.0" si ar parea schimbat.
app.jinja_env.filters["numar"] = formateaza_numar

# Valoarea din selectorul de proiect care inseamna „scriu codul de mana".
# Devizele se fac uneori inainte ca proiectul sa fie inregistrat, asa ca nu
# putem obliga alegerea din registru.
_PROIECT_MANUAL = "__manual__"


def _incarca_nomenclatoare():
    with open(os.path.join(DATA_DIR, "parametri.json"), encoding="utf-8") as f:
        parametri = json.load(f)
    with open(os.path.join(DATA_DIR, "materiale.json"), encoding="utf-8") as f:
        materiale = json.load(f)
    with open(os.path.join(DATA_DIR, "manopera.json"), encoding="utf-8") as f:
        manopera = json.load(f)
    return parametri, materiale, manopera


def _salveaza_json(nume_fisier: str, continut) -> None:
    """Scriere atomica: fisierul vechi ramane intreg daca scrierea cade la mijloc.

    Nomenclatorul de materiale se editeaza din browser, rand cu rand. O pana de
    curent in mijlocul salvarii ar lasa un JSON trunchiat, iar aplicatia n-ar
    mai porni deloc — nu doar pagina aceea.
    """
    cale = os.path.join(DATA_DIR, nume_fisier)
    temporar = f"{cale}.tmp"
    with open(temporar, "w", encoding="utf-8") as f:
        json.dump(continut, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(temporar, cale)


def _salveaza_parametri(parametri: dict) -> None:
    _salveaza_json("parametri.json", parametri)


@app.route("/")
def index():
    devize = listeaza_devize()
    return render_template("index.html", devize=devize)


@app.route("/parametri", methods=["GET", "POST"])
def parametri_view():
    parametri, _, _ = _incarca_nomenclatoare()
    if request.method == "POST":
        for cheie in parametri:
            valoare_str = request.form.get(cheie)
            if valoare_str is None:
                continue
            if cheie == "regiune":
                parametri[cheie]["valoare"] = valoare_str
            else:
                try:
                    parametri[cheie]["valoare"] = float(valoare_str)
                except ValueError:
                    pass
        _salveaza_parametri(parametri)
        return redirect(url_for("parametri_view"))

    adaos = float(parametri["adaos_comercial"]["valoare"])
    rezerva = float(parametri["rezerva_risc"]["valoare"])
    tinta = float(parametri["marja_bruta_tinta"]["valoare"])

    return render_template(
        "parametri.html",
        parametri=parametri,
        regiuni=["Bucuresti", "Cluj", "Brasov"],
        marja_curenta=marja_din_adaos(adaos, rezerva),
        marja_tinta=tinta,
        adaos_necesar=adaos_pentru_marja(tinta, rezerva),
        scenarii=scenarii_adaos(adaos, rezerva, tinta),
    )


CAMPURI_CERERE_OFERTA = [
    "cod",
    "denumire",
    "producator",
    "specificatie",
    "um",
    "pret_retail_referinta",
    "folosit_in_devize",
    "pret_contract_ofertat",
]


@app.route("/nomenclator", methods=["GET", "POST"])
def nomenclator_view():
    _, materiale, manopera = _incarca_nomenclatoare()
    erori: list[str] = []

    if request.method == "POST":
        materiale_noi, mod_materiale, erori_materiale = aplica_preturi_contract(
            materiale, lambda cod: request.form.get(f"pret_contract::{cod}")
        )
        manopera_noua, mod_manopera, erori_manopera = aplica_salarii(
            manopera, lambda faza, coloana: request.form.get(f"salariu::{faza}::{coloana}")
        )
        erori = erori_materiale + erori_manopera

        if erori:
            # Nu salvam nimic partial, dar nici nu-i stergem omului ce a scris:
            # randurile valide raman completate, ca sa corecteze doar ce e gresit.
            materiale, manopera = materiale_noi, manopera_noua
        else:
            if mod_materiale:
                _salveaza_json("materiale.json", materiale_noi)
            if mod_manopera:
                _salveaza_json("manopera.json", manopera_noua)
            return redirect(
                url_for(
                    "nomenclator_view",
                    salvate=len(mod_materiale) + len(mod_manopera),
                    doar=request.form.get("doar") or None,
                )
            )

    materiale_adnotate = adnoteaza_materiale(materiale, listeaza_devize())
    sumar = sumar_preturi(materiale_adnotate)

    doar_folosite = request.args.get("doar") == "folosite"
    afisate = [m for m in materiale_adnotate if m["utilizari"] > 0] if doar_folosite else materiale_adnotate

    return render_template(
        "nomenclator.html",
        materiale=afisate,
        manopera=manopera,
        sumar=sumar,
        erori=erori,
        doar_folosite=doar_folosite,
        salvate=request.args.get("salvate", type=int),
    )


@app.route("/nomenclator/cerere-oferta.csv")
def nomenclator_cerere_oferta():
    """Lista de materiale de trimis furnizorului, ca sa ceri preturi de contract."""
    _, materiale, _ = _incarca_nomenclatoare()
    randuri = randuri_cerere_oferta(adnoteaza_materiale(materiale, listeaza_devize()))

    tampon = io.StringIO()
    scriitor = csv.DictWriter(tampon, fieldnames=CAMPURI_CERERE_OFERTA, delimiter=";")
    scriitor.writeheader()
    scriitor.writerows(randuri)

    # BOM + separator ';' — asa deschide Excel-ul romanesc fisierul direct in
    # coloane, cu diacriticele intregi, fara pasul de import manual.
    return Response(
        "﻿" + tampon.getvalue(),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="cerere-oferta-materiale.csv"'},
    )


@app.route("/corp")
def corp_lista():
    corpuri = listeaza_corpuri()
    return render_template("corp_lista.html", corpuri=corpuri)


@app.route("/corp/nou", methods=["GET", "POST"])
def corp_nou():
    parametri, _, _ = _incarca_nomenclatoare()
    pierdere_implicita = float(parametri["pierdere_pal_mdf"]["valoare"])

    if request.method == "POST":
        f = request.form

        def numar(cheie, implicit=0):
            valoare = f.get(cheie, "").strip()
            return float(valoare) if valoare else implicit

        inaltime_front_usa_str = f.get("inaltime_front_usa", "").strip()
        pierdere_str = f.get("pierdere_tehnologica", "").strip()
        pierdere_pct = float(pierdere_str) if pierdere_str else pierdere_implicita * 100

        corp_input = CorpInput(
            proiect=f.get("proiect", "").strip(),
            latime=numar("latime"),
            inaltime=numar("inaltime"),
            adancime=numar("adancime"),
            grosime_pal=numar("grosime_pal", 18),
            grosime_spate_hdf=numar("grosime_spate_hdf", 3),
            nr_rafturi=int(numar("nr_rafturi", 0)),
            nr_usi=int(numar("nr_usi", 0)),
            nr_sertare=int(numar("nr_sertare", 0)),
            tip_constructie=f.get("tip_constructie", "Laterale continue"),
            tip_inchidere_sus=f.get("tip_inchidere_sus", "Traverse"),
            sistem_asamblare=f.get("sistem_asamblare", "Confirmat"),
            cant_04_pe_muchii_ascunse=f.get("cant_04_pe_muchii_ascunse", "Da"),
            latime_traversa_sus=numar("latime_traversa_sus", 100),
            retragere_raft=numar("retragere_raft", 20),
            rost_fronturi=numar("rost_fronturi", 3),
            inaltime_front_usa=float(inaltime_front_usa_str) if inaltime_front_usa_str else None,
            inaltime_zona_sertare=numar("inaltime_zona_sertare", 0),
            puncte_fixare=int(numar("puncte_fixare", 3)),
            pas_suruburi_spate=numar("pas_suruburi_spate", 150),
            pierdere_tehnologica=pierdere_pct / 100,
        )

        try:
            rezultat = calculeaza_corp(corp_input)
        except CorpError as exc:
            return render_template(
                "corp_nou.html",
                eroare=str(exc),
                form=f,
                tipuri_constructie=TIPURI_CONSTRUCTIE,
                tipuri_inchidere=TIPURI_INCHIDERE_SUS,
                sisteme_asamblare=SISTEME_ASAMBLARE,
                pierdere_implicita=pierdere_implicita * 100,
            )

        corp_id = salveaza_corp(
            {
                "proiect": corp_input.proiect,
                "input": vars(corp_input),
                "rezultat": rezultat,
            }
        )
        return redirect(url_for("corp_detail", corp_id=corp_id))

    return render_template(
        "corp_nou.html",
        eroare=None,
        form={},
        tipuri_constructie=TIPURI_CONSTRUCTIE,
        tipuri_inchidere=TIPURI_INCHIDERE_SUS,
        sisteme_asamblare=SISTEME_ASAMBLARE,
        pierdere_implicita=pierdere_implicita * 100,
    )


@app.route("/corp/<corp_id>")
def corp_detail(corp_id: str):
    record = incarca_corp(corp_id)
    if record is None:
        return "Corp negasit", 404
    return render_template("corp_detail.html", record=record)


def _recalculeaza_proiect_tehnic(rec: dict) -> dict:
    corpuri_obj = []
    for c in rec["corpuri"]:
        corpuri_obj.append(
            CorpProiect(
                cod_corp=c["cod_corp"],
                denumire_corp=c["denumire_corp"],
                buc_identice=c["buc_identice"],
                decor_corp=c["decor_corp"],
                decor_front=c["decor_front"],
                corp=CorpInput(**c["corp_input"]),
            )
        )
    return calculeaza_proiect(corpuri_obj, rec["pierdere_tehnologica"])


@app.route("/proiect-tehnic")
def proiect_tehnic_lista():
    proiecte = listeaza_proiecte_tehnice()
    return render_template("proiect_tehnic_lista.html", proiecte=proiecte)


@app.route("/proiect-tehnic/nou", methods=["GET", "POST"])
def proiect_tehnic_nou():
    if request.method == "POST":
        denumire = request.form.get("denumire_proiect", "").strip()
        pierdere = float(request.form.get("pierdere_tehnologica") or 10) / 100
        proiect_id = salveaza_proiect_tehnic(
            {"denumire_proiect": denumire, "pierdere_tehnologica": pierdere, "corpuri": [], "rezultat": None, "eroare": None}
        )
        return redirect(url_for("proiect_tehnic_detail", proiect_id=proiect_id))
    return render_template("proiect_tehnic_nou.html")


@app.route("/proiect-tehnic/<proiect_id>")
def proiect_tehnic_detail(proiect_id: str):
    rec = incarca_proiect_tehnic(proiect_id)
    if rec is None:
        return "Proiect negasit", 404
    _, materiale, _ = _incarca_nomenclatoare()
    return render_template(
        "proiect_tehnic_detail.html",
        record=rec,
        materiale=materiale,
        tipuri_constructie=TIPURI_CONSTRUCTIE,
        tipuri_inchidere=TIPURI_INCHIDERE_SUS,
        sisteme_asamblare=SISTEME_ASAMBLARE,
    )


@app.route("/proiect-tehnic/<proiect_id>/corp/nou", methods=["POST"])
def proiect_tehnic_corp_nou(proiect_id: str):
    rec = incarca_proiect_tehnic(proiect_id)
    if rec is None:
        return "Proiect negasit", 404

    f = request.form

    def numar(cheie, implicit=0):
        v = f.get(cheie, "").strip()
        return float(v) if v else implicit

    inaltime_front_usa_str = f.get("inaltime_front_usa", "").strip()

    corp_dict = {
        "cod_corp": f.get("cod_corp", "").strip(),
        "denumire_corp": f.get("denumire_corp", "").strip(),
        "buc_identice": int(numar("buc_identice", 1)),
        "decor_corp": f.get("decor_corp", "").strip(),
        "decor_front": f.get("decor_front", "").strip(),
        "corp_input": {
            "proiect": f.get("cod_corp", "").strip(),
            "latime": numar("latime"),
            "inaltime": numar("inaltime"),
            "adancime": numar("adancime"),
            "grosime_pal": numar("grosime_pal", 18),
            "grosime_spate_hdf": numar("grosime_spate_hdf", 3),
            "nr_rafturi": int(numar("nr_rafturi", 0)),
            "nr_usi": int(numar("nr_usi", 0)),
            "nr_sertare": int(numar("nr_sertare", 0)),
            "tip_constructie": f.get("tip_constructie", "Laterale continue"),
            "tip_inchidere_sus": f.get("tip_inchidere_sus", "Traverse"),
            "sistem_asamblare": f.get("sistem_asamblare", "Confirmat"),
            "cant_04_pe_muchii_ascunse": f.get("cant_04_pe_muchii_ascunse", "Da"),
            "latime_traversa_sus": numar("latime_traversa_sus", 100),
            "retragere_raft": numar("retragere_raft", 20),
            "rost_fronturi": numar("rost_fronturi", 3),
            "inaltime_front_usa": float(inaltime_front_usa_str) if inaltime_front_usa_str else None,
            "inaltime_zona_sertare": numar("inaltime_zona_sertare", 0),
            "puncte_fixare": int(numar("puncte_fixare", 3)),
            "pas_suruburi_spate": numar("pas_suruburi_spate", 150),
            "pierdere_tehnologica": rec["pierdere_tehnologica"],
        },
    }

    rec["corpuri"].append(corp_dict)
    try:
        rec["rezultat"] = _recalculeaza_proiect_tehnic(rec)
        rec["eroare"] = None
    except (ProiectError, CorpError) as exc:
        rec["corpuri"].pop()
        rec["eroare"] = str(exc)
    salveaza_proiect_tehnic(rec, proiect_id=proiect_id)
    return redirect(url_for("proiect_tehnic_detail", proiect_id=proiect_id))


@app.route("/proiect-tehnic/<proiect_id>/corp/<int:index>/sterge", methods=["POST"])
def proiect_tehnic_corp_sterge(proiect_id: str, index: int):
    rec = incarca_proiect_tehnic(proiect_id)
    if rec is None:
        return "Proiect negasit", 404
    if 0 <= index < len(rec["corpuri"]):
        rec["corpuri"].pop(index)
    rec["rezultat"] = _recalculeaza_proiect_tehnic(rec) if rec["corpuri"] else None
    salveaza_proiect_tehnic(rec, proiect_id=proiect_id)
    return redirect(url_for("proiect_tehnic_detail", proiect_id=proiect_id))


def _proiect_input_din_record(rec: dict) -> ProiectInput:
    i = rec["input"]
    return ProiectInput(
        cod_proiect=i["cod_proiect"],
        client=i["client"],
        denumire=i["denumire"],
        data_comanda=date.fromisoformat(i["data_comanda"]),
        termen_promis=date.fromisoformat(i["termen_promis"]),
        termen_realizat=date.fromisoformat(i["termen_realizat"]) if i.get("termen_realizat") else None,
        valoare_fara_tva=i.get("valoare_fara_tva", 0),
        marja_ofertata=i.get("marja_ofertata", 0),
        marja_realizata=i.get("marja_realizata"),
        faza_curenta=i.get("faza_curenta", ""),
        observatii=i.get("observatii", ""),
    )


def _eveniment_din_record(rec: dict) -> EvenimentCauza:
    return EvenimentCauza(
        data=date.fromisoformat(rec["data"]),
        cod_proiect=rec["cod_proiect"],
        faza_afectata=rec["faza_afectata"],
        cod_cauza=rec["cod_cauza"],
        zile_pierdute=rec["zile_pierdute"],
        nota=rec.get("nota", ""),
    )


@app.route("/management")
def management_dashboard():
    proiecte_records = listeaza_proiecte_management()
    evenimente_records = listeaza_evenimente_cauze()

    proiecte_input = [_proiect_input_din_record(r) for r in proiecte_records]
    evenimente_input = [_eveniment_din_record(r) for r in evenimente_records]

    kpi = calculeaza_kpi(proiecte_input, evenimente_input)
    pareto = calculeaza_pareto_cauze(evenimente_input)

    registru = []
    for rec, p in zip(proiecte_records, proiecte_input):
        registru.append(
            {
                "id": rec["id"],
                "proiect": p,
                "zile_intarziere": zile_intarziere(p),
                "delta_marja": delta_marja(p),
            }
        )

    return render_template("management_dashboard.html", kpi=kpi, pareto=pareto, registru=registru)


@app.route("/management/proceduri")
def proceduri_view():
    return render_template("proceduri.html", pasi=PROCEDURA_FLUX, coduri=CODURI_TRASABILITATE)


@app.route("/management/proiect/nou", methods=["GET", "POST"])
def proiect_management_nou():
    if request.method == "POST":
        f = request.form
        input_dict = {
            "cod_proiect": f.get("cod_proiect", "").strip(),
            "client": f.get("client", "").strip(),
            "denumire": f.get("denumire", "").strip(),
            "data_comanda": f.get("data_comanda"),
            "termen_promis": f.get("termen_promis"),
            "termen_realizat": f.get("termen_realizat") or None,
            "valoare_fara_tva": float(f.get("valoare_fara_tva") or 0),
            "marja_ofertata": float(f.get("marja_ofertata") or 0) / 100,
            "marja_realizata": (float(f.get("marja_realizata")) / 100) if f.get("marja_realizata") else None,
            "faza_curenta": f.get("faza_curenta", "").strip(),
            "observatii": f.get("observatii", "").strip(),
        }
        proiect_id = salveaza_proiect_management({"input": input_dict, "jurnal_flux": {}, "termen_realist": None})
        return redirect(url_for("proiect_management_detail", proiect_id=proiect_id))

    return render_template("proiect_management_nou.html", faze_flux=FAZE_FLUX)


@app.route("/management/proiect/<proiect_id>")
def proiect_management_detail(proiect_id: str):
    rec = incarca_proiect_management(proiect_id)
    if rec is None:
        return "Proiect negasit", 404

    p = _proiect_input_din_record(rec)
    jurnal_flux_dates = {
        faza: (date.fromisoformat(v) if v else None) for faza, v in rec.get("jurnal_flux", {}).items()
    }
    durate = calculeaza_durate_flux(jurnal_flux_dates)
    evenimente = listeaza_evenimente_cauze_pentru(p.cod_proiect)

    devize_legate = devize_pentru_proiect(listeaza_devize(), p.cod_proiect)

    return render_template(
        "proiect_management_detail.html",
        record=rec,
        proiect=p,
        zile_intarziere=zile_intarziere(p),
        delta_marja=delta_marja(p),
        faze_flux=FAZE_FLUX,
        jurnal_flux_dates=jurnal_flux_dates,
        durate=durate,
        evenimente=evenimente,
        cauze_nomenclator=NOMENCLATOR_CAUZE,
        termen_realist=rec.get("termen_realist"),
        devize_legate=devize_legate,
        total_devize=total_ofertat(devize_legate),
        comparatie_marja=compara_marja_ofertata(devize_legate, p.marja_ofertata),
    )


@app.route("/management/proiect/<proiect_id>/jurnal-flux", methods=["POST"])
def proiect_management_jurnal_flux(proiect_id: str):
    rec = incarca_proiect_management(proiect_id)
    if rec is None:
        return "Proiect negasit", 404

    jurnal = {}
    for idx, faza in enumerate(FAZE_FLUX):
        valoare = request.form.get(f"data_{idx}", "").strip()
        jurnal[faza] = valoare or None
    rec["jurnal_flux"] = jurnal
    salveaza_proiect_management(rec, proiect_id=proiect_id)
    return redirect(url_for("proiect_management_detail", proiect_id=proiect_id))


@app.route("/management/proiect/<proiect_id>/cauza", methods=["POST"])
def proiect_management_cauza_noua(proiect_id: str):
    rec = incarca_proiect_management(proiect_id)
    if rec is None:
        return "Proiect negasit", 404

    p = _proiect_input_din_record(rec)
    f = request.form
    salveaza_eveniment_cauza(
        {
            "data": f.get("data"),
            "cod_proiect": p.cod_proiect,
            "faza_afectata": f.get("faza_afectata", "").strip(),
            "cod_cauza": f.get("cod_cauza"),
            "zile_pierdute": float(f.get("zile_pierdute") or 0),
            "nota": f.get("nota", "").strip(),
        }
    )
    return redirect(url_for("proiect_management_detail", proiect_id=proiect_id))


@app.route("/management/proiect/<proiect_id>/termen-realist", methods=["GET", "POST"])
def proiect_management_termen_realist(proiect_id: str):
    rec = incarca_proiect_management(proiect_id)
    if rec is None:
        return "Proiect negasit", 404
    p = _proiect_input_din_record(rec)

    if request.method == "POST":
        f = request.form
        faze = []
        for idx, faza in enumerate(FAZE_FLUX):
            ore = float(f.get(f"ore_{idx}") or 0)
            operatori = int(f.get(f"operatori_{idx}") or 0)
            faze.append(FazaLucru(faza, ore, operatori))

        termen_input = TermenRealistInput(
            cod_proiect=p.cod_proiect,
            client=p.client,
            data_comanda=p.data_comanda,
            termen_cerut=p.termen_promis,
            ore_lucratoare_zi=float(f.get("ore_lucratoare_zi") or 8),
            faze=faze,
            aprobare_client_zile=float(f.get("aprobare_client_zile") or 0),
            masuratori_zile=float(f.get("masuratori_zile") or 0),
            aprovizionare_zile=float(f.get("aprovizionare_zile") or 0),
            uscare_zile=float(f.get("uscare_zile") or 0),
            acces_santier_zile=float(f.get("acces_santier_zile") or 0),
            buffer_zile=float(f.get("buffer_zile") or 0),
            suprapunere_aprovizionare_pct=float(f.get("suprapunere_aprovizionare_pct") or 0) / 100,
        )
        rezultat = calculeaza_termen_realist(termen_input)
        rezultat_serializabil = dict(rezultat)
        rezultat_serializabil["data_livrare_realista"] = rezultat["data_livrare_realista"].isoformat()
        rezultat_serializabil["termen_cerut"] = rezultat["termen_cerut"].isoformat()

        rec["termen_realist"] = {"rezultat": rezultat_serializabil}
        salveaza_proiect_management(rec, proiect_id=proiect_id)
        return redirect(url_for("proiect_management_detail", proiect_id=proiect_id))

    return render_template("termen_realist_form.html", proiect=p, faze_flux=FAZE_FLUX)


@app.route("/deviz/nou", methods=["GET", "POST"])
def deviz_nou():
    parametri, materiale, manopera = _incarca_nomenclatoare()
    faze_manopera = [m["faza"] for m in manopera]
    proiecte_optiuni = coduri_proiecte(listeaza_proiecte_management())

    if request.method == "POST":
        # Formularul ofera doua cai: alegi un proiect din registru, sau scrii
        # un cod manual pentru o oferta facuta inainte sa existe proiectul.
        proiect = request.form.get("proiect", "").strip()
        if proiect == _PROIECT_MANUAL:
            proiect = request.form.get("proiect_manual", "").strip()
        client = request.form.get("client", "").strip()
        data = request.form.get("data", "").strip()

        mat_denumiri = request.form.getlist("mat_denumire")
        mat_cantitati = request.form.getlist("mat_cantitate")
        mat_pierderi = request.form.getlist("mat_pierdere")

        materiale_linii = []
        for denumire, cantitate, pierdere in zip(mat_denumiri, mat_cantitati, mat_pierderi):
            if not denumire or not cantitate:
                continue
            pierdere_val = float(pierdere) / 100 if pierdere else None
            materiale_linii.append(
                MaterialLine(denumire=denumire, cantitate=float(cantitate), pierdere_pct_override=pierdere_val)
            )

        man_faze = request.form.getlist("man_faza")
        man_ore = request.form.getlist("man_ore")
        manopera_linii = []
        for faza, ore in zip(man_faze, man_ore):
            if not faza or not ore:
                continue
            manopera_linii.append(ManoperaLine(faza=faza, ore=float(ore)))

        ore_proiectare = float(request.form.get("ore_proiectare") or 0)
        transport = float(request.form.get("transport") or 0)
        cazare = float(request.form.get("cazare") or 0)
        montaj_ore = float(request.form.get("montaj_ore") or 0)
        montaj_nr_montatori = int(request.form.get("montaj_nr_montatori") or 0)

        deviz_input = DevizInput(
            proiect=proiect,
            client=client,
            data=data,
            materiale_linii=materiale_linii,
            manopera_linii=manopera_linii,
            ore_proiectare=ore_proiectare,
            logistica=Logistica(
                transport=transport,
                cazare=cazare,
                montaj_ore=montaj_ore,
                montaj_nr_montatori=montaj_nr_montatori,
            ),
        )

        try:
            rezultat = calculeaza_deviz(deviz_input, parametri, materiale, manopera)
        except DevizError as exc:
            return render_template(
                "deviz_nou.html",
                materiale=materiale,
                faze_manopera=faze_manopera,
                eroare=str(exc),
                form=request.form,
                proiecte_optiuni=proiecte_optiuni,
                proiect_manual=_PROIECT_MANUAL,
            )

        deviz_id = salveaza_deviz(
            {
                "proiect": proiect,
                "client": client,
                "data": data,
                "input": {
                    "materiale_linii": [vars(m) for m in materiale_linii],
                    "manopera_linii": [vars(m) for m in manopera_linii],
                    "ore_proiectare": ore_proiectare,
                    "logistica": vars(deviz_input.logistica),
                },
                "rezultat": rezultat,
            }
        )
        return redirect(url_for("deviz_detail", deviz_id=deviz_id))

    return render_template(
        "deviz_nou.html",
        materiale=materiale,
        faze_manopera=faze_manopera,
        eroare=None,
        form={},
        proiecte_optiuni=proiecte_optiuni,
        proiect_manual=_PROIECT_MANUAL,
    )


@app.route("/deviz/<deviz_id>")
def deviz_detail(deviz_id: str):
    record = incarca_deviz(deviz_id)
    if record is None:
        return "Deviz negasit", 404
    return render_template("deviz_detail.html", record=record)


@app.route("/deviz/<deviz_id>/qa", methods=["POST"])
def deviz_qa(deviz_id: str):
    record = incarca_deviz(deviz_id)
    if record is None:
        return "Deviz negasit", 404
    try:
        raport = verifica_deviz(record)
        record["qa_raport"] = raport
        record["qa_eroare"] = None
    except QAIndisponibil as exc:
        record["qa_eroare"] = str(exc)
    salveaza_deviz(record, deviz_id=deviz_id)
    return redirect(url_for("deviz_detail", deviz_id=deviz_id))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
