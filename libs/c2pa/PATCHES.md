# Benti-Patches an der gevendorten C2PA-Bibliothek

Basis: `@contentauth/c2pa-web@0.12.1` (MIT) + Abhängigkeiten `highgain@0.1.0`, `ts-deepmerge@7.0.3`.

**Bei jedem Update der Bibliothek müssen diese Patches erneut angewendet werden:**

1. **`c2pa-Sp6ssDto.js` – bare imports → relativ:**
   `from "highgain"` → `from "./highgain.js"`, `from "ts-deepmerge"` → `from "./ts-deepmerge.js"`
   (Browser können bare specifiers ohne Import-Map nicht auflösen.)

2. **`c2pa-Sp6ssDto.js` – Worker-URL-Validierung (Funktion `J`):**
   Original erlaubt nur `https:`. Gepatcht: zusätzlich `chrome-extension:` und `moz-extension:` zulassen —
   in MV3-Extensions ist die Erweiterungs-URL die einzig CSP-konforme Worker-Quelle
   (Fehlerbild sonst: „Worker source URL must use https, but got chrome-extension:").

Kein weiterer Code wurde verändert. Prüfung nach Update: Bild mit C2PA laden → Status-Karte muss „C2PA-Herkunftsnachweis gefunden" zeigen.
