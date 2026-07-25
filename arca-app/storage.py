"""Persistenta simpla pe fisiere JSON pentru devizele salvate."""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone

DEVIZE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "devize")


def _ensure_dir() -> None:
    os.makedirs(DEVIZE_DIR, exist_ok=True)


def salveaza_deviz(record: dict, deviz_id: str | None = None) -> str:
    _ensure_dir()
    if deviz_id is None:
        deviz_id = uuid.uuid4().hex[:12]
    record = dict(record)
    record["id"] = deviz_id
    record.setdefault("creat_la", datetime.now(timezone.utc).isoformat())
    record["actualizat_la"] = datetime.now(timezone.utc).isoformat()
    with open(os.path.join(DEVIZE_DIR, f"{deviz_id}.json"), "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)
    return deviz_id


def incarca_deviz(deviz_id: str) -> dict | None:
    path = os.path.join(DEVIZE_DIR, f"{deviz_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def listeaza_devize() -> list[dict]:
    _ensure_dir()
    rezultate = []
    for fname in sorted(os.listdir(DEVIZE_DIR), reverse=True):
        if fname.endswith(".json"):
            with open(os.path.join(DEVIZE_DIR, fname), encoding="utf-8") as f:
                rezultate.append(json.load(f))
    rezultate.sort(key=lambda r: r.get("creat_la", ""), reverse=True)
    return rezultate
