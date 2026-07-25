"""Agent QA si Validare — verifica un deviz calculat folosind Claude API.

Necesita variabila de mediu ANTHROPIC_API_KEY. Daca lipseste, apelantul
primeste o eroare clara (QAIndisponibil) in loc de un rezultat inventat.
"""
from __future__ import annotations

import json
import os

DEFAULT_MODEL = os.environ.get("ARCA_QA_MODEL", "claude-sonnet-5")

SYSTEM_PROMPT = """Esti Agentul QA si Validare din arhitectura ARCA AI ORCHESTRATOR,
folosit de Arca Interiors / Arca Fancons SRL (producator de mobilier la comanda din PAL,
MDF vopsit, lemn masiv si metal).

Responsabilitatile tale, aplicate strict pe devizul JSON primit:
- verifica toate calculele (materiale, manopera, sinteza cost, TVA, marja);
- identifica presupunerile ascunse sau nedeclarate;
- verifica dimensiunile, cantitatile si unitatile de masura pentru plauzibilitate;
- cauta contradictii intre linii (ex: ore de manopera 0 pentru un proces evident necesar,
  cantitati de material 0 sau negative, pret unitar 0 nejustificat);
- controleaza fezabilitatea tehnica si comerciala a devizului;
- verifica daca marja bruta este rezonabila fata de pragul definit;
- acorda un scor de incredere intre 1 si 10;
- daca exista probleme importante, cere explicit corecturi inainte de livrare catre client.

Raspunde STRICT in limba romana, format Markdown, cu urmatoarea structura:
## Verificare QA
### Constatari
(lista scurta cu observatii, sau "Niciuna" daca nu exista probleme)
### Presupuneri identificate
(lista, sau "Niciuna")
### Recomandare
(o propozitie: aprobat / aprobat cu observatii / necesita corectii)
### Scor de incredere
X/10 — motivatie intr-o propozitie.

Nu inventa date lipsa din deviz. Daca lipsesc informatii esentiale pentru validare,
mentioneaza explicit ce lipseste."""


class QAIndisponibil(RuntimeError):
    pass


def verifica_deviz(deviz_record: dict) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise QAIndisponibil(
            "ANTHROPIC_API_KEY nu este setat in mediu. Seteaza variabila de mediu "
            "pentru a activa Agentul QA (vezi README)."
        )

    try:
        import anthropic
    except ImportError as exc:
        raise QAIndisponibil("Pachetul 'anthropic' nu este instalat (pip install anthropic).") from exc

    client = anthropic.Anthropic(api_key=api_key)

    continut_deviz = json.dumps(
        {
            "proiect": deviz_record.get("proiect"),
            "client": deviz_record.get("client"),
            "materiale": deviz_record.get("rezultat", {}).get("materiale"),
            "manopera": deviz_record.get("rezultat", {}).get("manopera"),
            "sinteza": deviz_record.get("rezultat", {}).get("sinteza"),
            "verificare_marja": deviz_record.get("rezultat", {}).get("verificare_marja"),
        },
        ensure_ascii=False,
        indent=2,
    )

    message = client.messages.create(
        model=DEFAULT_MODEL,
        max_tokens=1200,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Verifica acest deviz:\n\n```json\n{continut_deviz}\n```"}],
    )

    return "".join(block.text for block in message.content if hasattr(block, "text"))
