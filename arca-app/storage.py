"""Persistenta simpla pe fisiere JSON pentru devizele si corpurile salvate."""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def _dir_pentru(colectie: str) -> str:
    path = os.path.join(DATA_DIR, colectie)
    os.makedirs(path, exist_ok=True)
    return path


def _salveaza(colectie: str, record: dict, record_id: str | None = None) -> str:
    director = _dir_pentru(colectie)
    if record_id is None:
        record_id = uuid.uuid4().hex[:12]
    record = dict(record)
    record["id"] = record_id
    record.setdefault("creat_la", datetime.now(timezone.utc).isoformat())
    record["actualizat_la"] = datetime.now(timezone.utc).isoformat()
    with open(os.path.join(director, f"{record_id}.json"), "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)
    return record_id


def _incarca(colectie: str, record_id: str) -> dict | None:
    path = os.path.join(_dir_pentru(colectie), f"{record_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _listeaza(colectie: str) -> list[dict]:
    director = _dir_pentru(colectie)
    rezultate = []
    for fname in sorted(os.listdir(director), reverse=True):
        if fname.endswith(".json"):
            with open(os.path.join(director, fname), encoding="utf-8") as f:
                rezultate.append(json.load(f))
    rezultate.sort(key=lambda r: r.get("creat_la", ""), reverse=True)
    return rezultate


def salveaza_deviz(record: dict, deviz_id: str | None = None) -> str:
    return _salveaza("devize", record, deviz_id)


def incarca_deviz(deviz_id: str) -> dict | None:
    return _incarca("devize", deviz_id)


def listeaza_devize() -> list[dict]:
    return _listeaza("devize")


def salveaza_corp(record: dict, corp_id: str | None = None) -> str:
    return _salveaza("corpuri", record, corp_id)


def incarca_corp(corp_id: str) -> dict | None:
    return _incarca("corpuri", corp_id)


def listeaza_corpuri() -> list[dict]:
    return _listeaza("corpuri")
