# Benti – Tests

Automatisierte Tests laufen über Chromium (vorinstalliert) mit Playwright und
einem kleinen lokalen Static-Server. Es wird nichts installiert.

## Regressionstest Bildformate (US-1.4)

`regression.mjs` lädt Benti als Web-App, spielt für kritische Bildfälle je ein
synthetisches Bild ein, wendet die Kennzeichnung an und prüft pro Fall:

- kein JavaScript-Fehler (Konsole/pageerror),
- Export-Canvas hat die erwarteten Maße,
- der Label-Block liegt vollständig im Bild (`inBounds`),
- der Download-Bereich erscheint.

Abgedeckte Fälle: winzig (320×240), sehr groß (8200×2000), extrem quer (3:1),
extrem hoch (1:3), PNG mit Transparenz, JPEG, WebP.

### Ausführen

```bash
# aus dem Repo-Root
ln -sfn /opt/node22/lib/node_modules node_modules
node test/regression.mjs
rm -f node_modules
```

Exit-Code 0 = alle Fälle bestanden. Letzter Lauf (2026-07-23): **7/7 bestanden**.

## Roundtrip-Selbsttest (US-3.3)

`roundtrip.mjs` exportiert ein gelabeltes Bild und liest es mit dem eigenen
Herkunfts-Check (`checkProvenance` / `extractXmp`) wieder ein. Der beim Export
geschriebene `DigitalSourceType` muss erkannt werden – für PNG und JPEG, je
Label-Typ (`ai-generated` / `ai-modified`).

```bash
ln -sfn /opt/node22/lib/node_modules node_modules
node test/roundtrip.mjs
rm -f node_modules
```

Letzter Lauf (2026-07-23): **4/4 bestanden**.

## SVG-Workflow (US-3.6)

`svg.mjs` prüft: unsichere SVGs (Skript/externe Referenz) werden abgelehnt,
sichere angenommen; die gelabelte Ausgabe ist valides SVG mit `<metadata>` +
`DigitalSourceType`, eingebettetem Vektor-Icon (`data:`-URI) und erhaltener
`viewBox`; beide Label-Typen schreiben den korrekten DST.

```bash
ln -sfn /opt/node22/lib/node_modules node_modules
node test/svg.mjs
rm -f node_modules
```

Letzter Lauf (2026-07-23): **alle Prüfungen grün, keine JS-Fehler**.

## Unsichtbares Wasserzeichen (US-3.8)

`watermark.mjs` prüft Einbetten → Detektion (nativ), korrekte Typ-Erkennung
(`ai-generated`/`ai-modified`), **keinen Falschtreffer** auf unmarkierten Bildern
und den „Prüfen"-Button. Die reale Robustheit über Resize/JPEG-Stufen ist in
`docs/downscale-robustness.md` (Ebene 3) ehrlich dokumentiert – starke
Verkleinerung wird bewusst nicht als Bestehen gewertet.

```bash
ln -sfn /opt/node22/lib/node_modules node_modules
node test/watermark.mjs
rm -f node_modules
```

Letzter Lauf (2026-07-23): **6/6 bestanden**.

## Dateiname-Muster & Ablageort (US-3.9)

`naming.mjs` prüft die Token-Ersetzung (`{name}`, `{n:3}`, `{date}`, `{type}` …),
den Literaltext-Erhalt, den Fallback bei leerem Muster, den Einzel-Download-Namen
und den Downloads-Unterordner-Pfad. (Der File-System-Access-Ordnerpicker braucht
eine echte Nutzergeste und wird headless nicht getestet.)

```bash
ln -sfn /opt/node22/lib/node_modules node_modules
node test/naming.mjs
rm -f node_modules
```

Letzter Lauf (2026-07-24): **8/8 bestanden**.
