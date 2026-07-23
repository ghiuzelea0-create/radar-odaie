import json

import pytest

import agent


# ---------------------------------------------------------------------------
# parse_json
# ---------------------------------------------------------------------------

def test_parse_json_plain_array():
    raw = '[{"nume": "Vaza"}]'
    assert agent.parse_json(raw) == [{"nume": "Vaza"}]


def test_parse_json_strips_markdown_fences():
    raw = '```json\n[{"nume": "Vaza"}]\n```'
    assert agent.parse_json(raw) == [{"nume": "Vaza"}]


def test_parse_json_ignores_leading_text_before_array():
    raw = 'Iată produsele:\n[{"nume": "Vaza"}]'
    assert agent.parse_json(raw) == [{"nume": "Vaza"}]


def test_parse_json_repairs_truncated_array():
    # Second object got cut off mid-value; parse_json should recover the
    # first complete object instead of raising.
    raw = '[{"nume": "Vaza"}, {"nume": "Lamp'
    assert agent.parse_json(raw) == [{"nume": "Vaza"}]


def test_parse_json_no_array_found_raises():
    with pytest.raises(RuntimeError, match="Nu am găsit JSON"):
        agent.parse_json("nu e niciun json aici")


def test_parse_json_unrecoverable_truncation_raises():
    # No closing brace at all -- nothing to repair, must propagate.
    with pytest.raises(json.JSONDecodeError):
        agent.parse_json('[{"nume": "Vaza"')


# ---------------------------------------------------------------------------
# scrie_products_json
# ---------------------------------------------------------------------------

def test_scrie_products_json_maps_known_category(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    produse = [{"nume": "Lampă", "categorie": "iluminat", "pretRon": 199,
                "descriere": "desc", "scorViral": 80, "deCeTrend": "trend", "sursa": "sursa"}]
    out = agent.scrie_products_json(produse)
    assert out[0]["cat"] == "iluminat"
    assert out[0]["catName"] == "Iluminat"
    assert out[0]["id"] == 13
    assert out[0]["price"] == 199


def test_scrie_products_json_unknown_category_falls_back_to_accente(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    produse = [{"nume": "Ceva", "categorie": "nu-exista", "pretRon": 50}]
    out = agent.scrie_products_json(produse)
    assert out[0]["cat"] == "accente"
    assert out[0]["catName"] == "Accente"


def test_scrie_products_json_missing_category_falls_back_to_accente(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    produse = [{"nume": "Ceva", "pretRon": 50}]
    out = agent.scrie_products_json(produse)
    assert out[0]["cat"] == "accente"


def test_scrie_products_json_missing_price_defaults_to_zero(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    produse = [{"nume": "Ceva", "categorie": "textile"}]
    out = agent.scrie_products_json(produse)
    assert out[0]["price"] == 0


def test_scrie_products_json_rounds_price(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    produse = [{"nume": "Ceva", "categorie": "textile", "pretRon": 149.6}]
    out = agent.scrie_products_json(produse)
    assert out[0]["price"] == 150


def test_scrie_products_json_ids_increment_from_13(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    produse = [{"nume": "A", "categorie": "ceramica"}, {"nume": "B", "categorie": "textile"}]
    out = agent.scrie_products_json(produse)
    assert [p["id"] for p in out] == [13, 14]


def test_scrie_products_json_writes_file(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    produse = [{"nume": "Ceva", "categorie": "textile", "pretRon": 50}]
    agent.scrie_products_json(produse)
    written = json.loads((tmp_path / "products.json").read_text(encoding="utf-8"))
    assert written[0]["name"] == "Ceva"


# ---------------------------------------------------------------------------
# cere_produse (HTTP call mocked)
# ---------------------------------------------------------------------------

class FakeResponse:
    def __init__(self, status_code=200, json_data=None, text=""):
        self.status_code = status_code
        self._json_data = json_data or {}
        self.text = text

    def json(self):
        return self._json_data


def test_cere_produse_parses_text_blocks(monkeypatch):
    fake = FakeResponse(200, {"content": [{"type": "text", "text": '[{"nume": "Vaza"}]'}]})
    monkeypatch.setattr(agent.requests, "post", lambda *a, **k: fake)
    assert agent.cere_produse() == [{"nume": "Vaza"}]


def test_cere_produse_raises_on_non_200(monkeypatch):
    fake = FakeResponse(500, text="server error")
    monkeypatch.setattr(agent.requests, "post", lambda *a, **k: fake)
    with pytest.raises(RuntimeError, match="Eroare API"):
        agent.cere_produse()


def test_cere_produse_raises_on_empty_text(monkeypatch):
    fake = FakeResponse(200, {"content": []})
    monkeypatch.setattr(agent.requests, "post", lambda *a, **k: fake)
    with pytest.raises(RuntimeError, match="Răspuns gol"):
        agent.cere_produse()


# ---------------------------------------------------------------------------
# trimite_telegram
# ---------------------------------------------------------------------------

def test_trimite_telegram_skips_when_not_configured(monkeypatch, capsys):
    monkeypatch.setattr(agent, "TELEGRAM_BOT_TOKEN", "")
    monkeypatch.setattr(agent, "TELEGRAM_CHAT_ID", "")
    calls = []
    monkeypatch.setattr(agent.requests, "post", lambda *a, **k: calls.append((a, k)))
    agent.trimite_telegram([{"name": "Ceva", "scorViral": 10, "catName": "Textile", "price": 50}])
    assert not calls
    assert "neconfigurat" in capsys.readouterr().out


def test_trimite_telegram_posts_when_configured(monkeypatch):
    monkeypatch.setattr(agent, "TELEGRAM_BOT_TOKEN", "token")
    monkeypatch.setattr(agent, "TELEGRAM_CHAT_ID", "chat")
    captured = {}

    def fake_post(url, json, timeout):
        captured["url"] = url
        captured["json"] = json
        return FakeResponse(200)

    monkeypatch.setattr(agent.requests, "post", fake_post)
    produse = [{"name": "Ceva", "scorViral": 10, "catName": "Textile", "price": 50, "deCeTrend": "e trendy"}]
    agent.trimite_telegram(produse)
    assert captured["url"].startswith("https://api.telegram.org/bottoken/sendMessage")
    assert captured["json"]["chat_id"] == "chat"
    assert "Ceva" in captured["json"]["text"]


def test_trimite_telegram_sorts_by_scorviral_descending(monkeypatch):
    monkeypatch.setattr(agent, "TELEGRAM_BOT_TOKEN", "token")
    monkeypatch.setattr(agent, "TELEGRAM_CHAT_ID", "chat")
    captured = {}

    def fake_post(url, json, timeout):
        captured["text"] = json["text"]
        return FakeResponse(200)

    monkeypatch.setattr(agent.requests, "post", fake_post)
    produse = [
        {"name": "Scazut", "scorViral": 10, "catName": "Textile", "price": 50},
        {"name": "Ridicat", "scorViral": 90, "catName": "Ceramică", "price": 80},
    ]
    agent.trimite_telegram(produse)
    assert captured["text"].index("Ridicat") < captured["text"].index("Scazut")


def test_trimite_telegram_reports_failure(monkeypatch, capsys):
    monkeypatch.setattr(agent, "TELEGRAM_BOT_TOKEN", "token")
    monkeypatch.setattr(agent, "TELEGRAM_CHAT_ID", "chat")
    monkeypatch.setattr(agent.requests, "post", lambda *a, **k: FakeResponse(403, text="forbidden"))
    agent.trimite_telegram([{"name": "Ceva", "scorViral": 10, "catName": "Textile", "price": 50}])
    assert "a eșuat" in capsys.readouterr().out


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def test_main_exits_when_api_key_missing(monkeypatch, capsys):
    monkeypatch.setattr(agent, "ANTHROPIC_API_KEY", "")
    with pytest.raises(SystemExit) as exc:
        agent.main()
    assert exc.value.code == 1
    assert "Lipsește ANTHROPIC_API_KEY" in capsys.readouterr().out


def test_main_exits_when_produse_invalid(monkeypatch):
    monkeypatch.setattr(agent, "ANTHROPIC_API_KEY", "key")
    monkeypatch.setattr(agent, "cere_produse", lambda: [])
    with pytest.raises(SystemExit) as exc:
        agent.main()
    assert exc.value.code == 1


def test_main_happy_path(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(agent, "ANTHROPIC_API_KEY", "key")
    monkeypatch.setattr(agent, "cere_produse", lambda: [{"nume": "Ceva", "categorie": "textile", "pretRon": 50}])
    telegram_calls = []
    monkeypatch.setattr(agent, "trimite_telegram", lambda produse: telegram_calls.append(produse))
    agent.main()
    assert telegram_calls
    assert (tmp_path / "products.json").exists()
