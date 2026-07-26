# Registrul capabilităților ARCA AI

> Se completează/verifică în mediul REAL Claude Code (versiune instalată).
> Marchează orice element neverificat. Nu inventa capabilități.

## Agenți (subagenți .claude/agents/)
| Agent | Rol | Instrumente (frontmatter) | Note |
|---|---|---|---|
| arca-proiectare | Tehnic mobilier | Read, Grep, Glob, WebSearch, WebFetch | milimetri; „DE VERIFICAT" |
| arca-management | Operațiuni/ERP | Read, Grep, Glob, WebSearch, WebFetch | scalat la 11 angajați |
| arca-costing | Deviz/ofertă | + Bash, Write | formule adaos/marjă |
| arca-web | Web/e-commerce | + Write | prototip, nu deploy |
| arca-product | Produs premium | Read, Grep, Glob, WebSearch, WebFetch | serie mică |
| arca-qa | Verificare | Read, Grep, Glob (read-only) | scor 1–10 |

## De verificat în mediul tău (bifează după instalare)
- [ ] Versiunea Claude Code și suportul pentru frontmatter `tools` / `model: inherit`.
- [ ] Dacă versiunea permite restricționarea explicită a subagenților lansabili (allowlist).
- [ ] Conectori MCP activi (Drive, Gmail, Asana, HubSpot, Canva, Figma, M365) și numele lor de tool.
- [ ] Skills disponibile în proiect (native + plugin) care acoperă deja funcții propuse.

## Skills propuse (NU instalate) — vezi .claude/skills/
| Skill | Stare |
|---|---|
| arca-project-intake | PROPUNERE — NECESITĂ APROBARE |
| arca-furniture-costing | PROPUNERE — NECESITĂ APROBARE |
| arca-commercial-offer | PROPUNERE — NECESITĂ APROBARE |
| arca-technical-qa | PROPUNERE — NECESITĂ APROBARE |
