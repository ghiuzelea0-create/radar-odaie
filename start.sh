#!/usr/bin/env bash
#
# Porneste ambele aplicatii Arca (macOS / Linux):
#   - aplicatia Arca (Flask)      pe http://localhost:5000  — aici introduci datele
#   - dashboardul Operations      pe http://localhost:3000  — aici vezi situatia
#
# Prima rulare instaleaza singura tot ce trebuie si dureaza cateva minute.
# Rularile urmatoare pornesc in cateva secunde.
#
# Oprire: Ctrl+C (opreste ambele aplicatii).

set -euo pipefail

RADACINA="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_FLASK="$RADACINA/arca-app"
APP_DASHBOARD="$RADACINA/arca-operations"

info() { printf '\n\033[1;33m==> %s\033[0m\n' "$1"; }
eroare() { printf '\n\033[1;31mEROARE: %s\033[0m\n' "$1" >&2; exit 1; }

# --- Verificari preliminare ------------------------------------------------

command -v python3 >/dev/null 2>&1 || eroare "Python 3 nu este instalat. Vezi INSTALARE.md."
command -v node >/dev/null 2>&1 || eroare "Node.js nu este instalat. Vezi INSTALARE.md."

VERSIUNE_NODE="$(node -v | sed 's/^v//' | cut -d. -f1)"
if [ "$VERSIUNE_NODE" -lt 20 ]; then
  eroare "Node.js este versiunea $VERSIUNE_NODE, dar e nevoie de 20 sau mai nou. Vezi INSTALARE.md."
fi

# --- Aplicatia Flask -------------------------------------------------------

if [ ! -d "$APP_FLASK/.venv" ]; then
  info "Pregatesc aplicatia Arca (prima rulare, dureaza un minut)..."
  python3 -m venv "$APP_FLASK/.venv"
  "$APP_FLASK/.venv/bin/pip" install --quiet --upgrade pip
  "$APP_FLASK/.venv/bin/pip" install --quiet -r "$APP_FLASK/requirements.txt"
fi

# --- Dashboardul Next.js ---------------------------------------------------

if [ ! -d "$APP_DASHBOARD/node_modules" ]; then
  info "Pregatesc dashboardul (prima rulare, dureaza cateva minute)..."
  (cd "$APP_DASHBOARD" && npm install --no-audit --no-fund)
fi

if [ ! -d "$APP_DASHBOARD/.next" ]; then
  info "Construiesc dashboardul..."
  (cd "$APP_DASHBOARD" && npm run build)
fi

# --- Pornire ---------------------------------------------------------------

# Oprim ambele aplicatii la Ctrl+C.
#
# `npm run start` porneste `next start` ca proces-copil, iar oprirea doar a
# wrapper-ului npm ar lasa serverul pornit si portul ocupat. De aceea oprim
# intreg arborele de procese, de la frunze catre radacina.
PIDS=()

opreste_arborele() {
  local pid=$1 copil
  for copil in $(pgrep -P "$pid" 2>/dev/null); do
    opreste_arborele "$copil"
  done
  kill "$pid" 2>/dev/null || true
}

opreste() {
  info "Opresc aplicatiile..."
  for pid in "${PIDS[@]:-}"; do
    opreste_arborele "$pid"
  done
  wait 2>/dev/null || true
  exit 0
}
trap opreste INT TERM

info "Pornesc aplicatia Arca pe http://localhost:5000"
(cd "$APP_FLASK" && PORT=5000 ./.venv/bin/python app.py) &
PIDS+=($!)

info "Pornesc dashboardul pe http://localhost:3000"
(cd "$APP_DASHBOARD" && npm run start -- -p 3000) &
PIDS+=($!)

# Adresa in reteaua locala, ca sa poti deschide aplicatia si de pe telefon.
if command -v hostname >/dev/null 2>&1 && hostname -I >/dev/null 2>&1; then
  IP_RETEA="$(hostname -I | awk '{print $1}')"      # Linux
else
  IP_RETEA="$(ipconfig getifaddr en0 2>/dev/null || true)"   # macOS, Wi-Fi
fi

cat <<MESAJ

────────────────────────────────────────────────────────────
  Gata. Deschide in browser:

    Dashboard (situatia zilei)   http://localhost:3000
    Aplicatia Arca (introduci)   http://localhost:5000
MESAJ

if [ -n "${IP_RETEA:-}" ]; then
  cat <<MESAJ

  De pe telefon, pe acelasi Wi-Fi:

    Dashboard                    http://$IP_RETEA:3000
    Aplicatia Arca               http://$IP_RETEA:5000
MESAJ
fi

cat <<'MESAJ'

  Proiectele se adauga in aplicatia Arca, la Management.
  Dashboardul le arata dupa ce reincarci pagina.

  Opreste totul cu Ctrl+C.
────────────────────────────────────────────────────────────

MESAJ

wait
