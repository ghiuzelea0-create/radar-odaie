from __future__ import annotations

import json
import os

from flask import Flask, redirect, render_template, request, url_for

from costing_engine import DevizError, DevizInput, Logistica, ManoperaLine, MaterialLine, calculeaza_deviz
from design_engine import CorpError, CorpInput, TIPURI_CONSTRUCTIE, TIPURI_INCHIDERE_SUS, SISTEME_ASAMBLARE, calculeaza_corp
from qa_agent import QAIndisponibil, verifica_deviz
from storage import (
    incarca_corp,
    incarca_deviz,
    listeaza_corpuri,
    listeaza_devize,
    salveaza_corp,
    salveaza_deviz,
)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

app = Flask(__name__)


def _incarca_nomenclatoare():
    with open(os.path.join(DATA_DIR, "parametri.json"), encoding="utf-8") as f:
        parametri = json.load(f)
    with open(os.path.join(DATA_DIR, "materiale.json"), encoding="utf-8") as f:
        materiale = json.load(f)
    with open(os.path.join(DATA_DIR, "manopera.json"), encoding="utf-8") as f:
        manopera = json.load(f)
    return parametri, materiale, manopera


def _salveaza_parametri(parametri: dict) -> None:
    with open(os.path.join(DATA_DIR, "parametri.json"), "w", encoding="utf-8") as f:
        json.dump(parametri, f, ensure_ascii=False, indent=2)


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
    return render_template("parametri.html", parametri=parametri, regiuni=["Bucuresti", "Cluj", "Brasov"])


@app.route("/nomenclator")
def nomenclator_view():
    _, materiale, manopera = _incarca_nomenclatoare()
    return render_template("nomenclator.html", materiale=materiale, manopera=manopera)


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


@app.route("/deviz/nou", methods=["GET", "POST"])
def deviz_nou():
    parametri, materiale, manopera = _incarca_nomenclatoare()
    faze_manopera = [m["faza"] for m in manopera]

    if request.method == "POST":
        proiect = request.form.get("proiect", "").strip()
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

    return render_template("deviz_nou.html", materiale=materiale, faze_manopera=faze_manopera, eroare=None, form={})


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
