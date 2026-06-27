#!/usr/bin/env python3
"""
Radar ODAIE — robot zilnic de produse virale.
Caută pe web decorațiuni în trend, le dă un scor viral,
scrie products.json (format ODAIE) și trimite o alertă pe Telegram.
"""

import os
import json
import sys
import datetime
import requests

# ------------------------------------------------------------------
# Configurare — vin din "secrets" (vezi README), NU le scrie aici.
# ------------------------------------------------------------------
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# Sub-nișă opțională (lasă gol pentru tot ce e în trend în decorațiuni)
NISA = os.environ.get("NISA", "").strip()

MODEL = "claude-sonnet-4-6"
WEB_SEARCH_TOOL = "web_search_20250305"  # dacă API-ul cere altă versiune, schimbi doar aici
MAX_SEARCHES = 5

CAT_NAME = {
    "iluminat": "Iluminat",
    "ceramica": "Ceramică",
    "textile": "Textile",
    "perete": "Decor perete",
    "arome": "Arome",
    "accente": "Accente",
}


def cere_produse():
    """Întreabă Claude (cu căutare web) ce e în trend acum și primește JSON."""
    nisa = NISA or ("decorațiuni pentru casă (iluminat, ceramică, textile, "
                    "decor perete, arome, accente)")
    system = (
        "Ești analist de product research pentru un magazin de dropshipping de "
        "decorațiuni premium. Cauți pe web produse VIRALE / în trend ACUM. "
        "Folosește căutarea web înainte de a răspunde. Răspunde DOAR cu un array "
        "JSON valid, fără text și fără markdown în afara JSON-ului."
    )
    user = (
        f"Caută 5 produse de decorațiuni casă virale / în trend acum, pentru nișa: {nisa}. "
        "Pentru fiecare returnează un obiect cu EXACT cheile (text în română, scurt): "
        '{"nume": str, "descriere": str (max 14 cuvinte), "deCeTrend": str (o propoziție), '
        '"categorie": una din "iluminat"|"ceramica"|"textile"|"perete"|"arome"|"accente", '
        '"pretRon": număr (preț de vânzare recomandat, lei), "sursa": str scurt, '
        '"scorViral": 0-100, "trend": 0-100, "social": 0-100, '
        '"competitie": 0-100 (mare = competiție mică), "marja": 0-100}. '
        "Returnează DOAR array-ul JSON."
    )

    payload = {
        "model": MODEL,
        "max_tokens": 2500,
        "system": system,
        "messages": [{"role": "user", "content": user}],
        "tools": [{"type": WEB_SEARCH_TOOL, "name": "web_search", "max_uses": MAX_SEARCHES}],
    }
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    r = requests.post("https://api.anthropic.com/v1/messages",
                      headers=headers, json=payload, timeout=120)
    if r.status_code != 200:
        raise RuntimeError(f"Eroare API ({r.status_code}): {r.text[:400]}")

    data = r.json()
    text = "\n".join(b.get("text", "") for b in data.get("content", [])
                     if b.get("type") == "text").strip()
    if not text:
        raise RuntimeError("Răspuns gol de la model.")
    return parse_json(text)


def parse_json(raw):
    """Extrage array-ul JSON, cu reparare dacă a fost tăiat."""
    t = raw.replace("```json", "").replace("```", "").strip()
    start = t.find("[")
    if start == -1:
        raise RuntimeError("Nu am găsit JSON în răspuns.")
    t = t[start:]
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        last = t.rfind("}")
        if last != -1:
            return json.loads(t[:last + 1] + "]")
        raise


def scrie_products_json(produse):
    """Salvează în format compatibil cu array-ul products din ODAIE."""
    out = []
    for i, p in enumerate(produse):
        cat = p.get("categorie") if p.get("categorie") in CAT_NAME else "accente"
        out.append({
            "id": 13 + i,
            "name": p.get("nume", ""),
            "cat": cat,
            "catName": CAT_NAME[cat],
            "price": round(float(p.get("pretRon", 0) or 0)),
            "desc": p.get("descriere", ""),
            "img": "LINK_POZA",
            "tag": "Trending",
            # extra (pentru tine / dashboard) — site-ul le poate ignora
            "scorViral": p.get("scorViral", 0),
            "deCeTrend": p.get("deCeTrend", ""),
            "sursa": p.get("sursa", ""),
        })
    with open("products.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"products.json scris: {len(out)} produse.")
    return out


def trimite_telegram(produse):
    if not (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID):
        print("Telegram neconfigurat — sar peste alertă.")
        return
    azi = datetime.date.today().strftime("%d.%m.%Y")
    produse = sorted(produse, key=lambda x: x.get("scorViral", 0), reverse=True)
    linii = [f"🔥 <b>Radar ODAIE — {azi}</b>", ""]
    for p in produse:
        linii.append(f"<b>{p.get('name','')}</b> — scor {p.get('scorViral',0)}/100")
        linii.append(f"{p.get('catName','')} · ~{p.get('price',0)} lei")
        if p.get("deCeTrend"):
            linii.append(f"<i>{p['deCeTrend']}</i>")
        linii.append("")
    linii.append("Produsele sunt și în products.json, gata de adăugat pe site.")
    text = "\n".join(linii)[:4000]

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    r = requests.post(url, json={
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }, timeout=30)
    if r.status_code != 200:
        print(f"Telegram a eșuat ({r.status_code}): {r.text[:300]}")
    else:
        print("Alertă Telegram trimisă.")


def main():
    if not ANTHROPIC_API_KEY:
        print("Lipsește ANTHROPIC_API_KEY.")
        sys.exit(1)
    print("Caut produse în trend...")
    produse = cere_produse()
    if not isinstance(produse, list) or not produse:
        print("Nu am primit produse valide.")
        sys.exit(1)
    salvate = scrie_products_json(produse)
    trimite_telegram(salvate)
    print("Gata.")


if __name__ == "__main__":
    main()
