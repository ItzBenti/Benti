#!/usr/bin/env bash
# Packt Benti als Chrome-Web-Store-taugliches ZIP (US-4.1).
# Die eigentliche Logik steckt in build-extension.py (laeuft auch unter Windows,
# wo es kein `zip` gibt). Dieses Skript bleibt als bequemer Einstieg erhalten.
#
# Aufruf (aus dem Repo-Root):  bash scripts/build-extension.sh
set -euo pipefail
cd "$(dirname "$0")/.."
if command -v python3 >/dev/null 2>&1; then PY=python3; else PY=python; fi
exec "$PY" scripts/build-extension.py "$@"
