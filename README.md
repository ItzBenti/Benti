# Benti

**KI-generierte Bilder kennzeichnen gemäß Artikel 50 EU AI Act.**

Kostenlose Chrome Extension (+ Web-App geplant), die KI-generierte oder KI-bearbeitete Bilder sichtbar labelt – mit den offiziellen EU-Icons oder eigenem Logo – und maschinenlesbar markiert. 100 % lokal im Browser: keine Uploads, kein Account, keine Kosten.

## Features

- 💧 **Sichtbares Labeln:** Text- oder Logo-Label, automatisch optimal positioniert (Zonen-/Salienz-Analyse), Schwarz/Weiß-Variante je nach Bildhelligkeit
- 🇪🇺 **Offizielle EU-Icons** (`assets/eu-icons/`): 3 Designs × 4 Farbvarianten, SVG + PNG
- 🔍 **Herkunfts-Check beim Upload:** liest C2PA Content Credentials und KI-Metadaten, schlägt automatisch den passenden Label-Typ vor (**Smart-Label-Vorschlag**)
- 🏷️ **Maschinenlesbare Kennzeichnung:** XMP/IPTC `DigitalSourceType` beim Export, inkl. Erhalt der Original-Metadaten (EXIF/Copyright) des Quellbilds
- 🧾 **Compliance-Protokoll:** lokales Kennzeichnungs-Verzeichnis mit CSV-Export als Audit-Nachweis
- 📐 **Export-Formatauswahl:** PNG (mit DPI-Metadaten, pHYs-Chunk) / JPEG / WebP, mit **Ausgabeziel-Presets** (Social/Web/Print) inkl. Lesbarkeits-Guard
- 🛡️ **Downscale-Robustheit:** damit das Label auch beim nachträglichen Verkleinern (Agenturen, Typenpläne, Mobile-View) lesbar bleibt:
  - **Kontrast-Plakette** hinter dem Label (harte Kontrastkante, übersteht das Herunterskalieren)
  - Ausgabeziel **„Mobile / stark verkleinert"** mit downscale-bewusster Lesbarkeitsprüfung
  - **Exakte Ausgabegröße (Pixel):** Bild wird zuerst auf die Zielmaße gerechnet, dann das Label gesetzt → nie zu klein (Details: [`docs/downscale-robustness.md`](docs/downscale-robustness.md))
- ⭐ **Custom-Presets:** eigene Ausgabegrößen benennen, speichern und im Dropdown wiederverwenden (lokal persistiert)
- ✒️ **SVG-Workflow (vektor-erhaltend):** SVG-Grafiken werden nicht gerastert – das EU-Icon wird als Vektor eingebettet, der `DigitalSourceType` ins `<metadata>` geschrieben. Das Label bleibt bei jeder Größe scharf. Aus Sicherheitsgründen werden SVGs mit Skripten oder externen Referenzen abgelehnt (v1)
- 🔏 **Unsichtbares Wasserzeichen (experimentell, opt-in):** bettet zusätzlich eine unsichtbare Markierung in die Pixel ein, die das Entfernen der Metadaten (Screenshot, Re-Save, Formatwechsel) und Re-Kompression übersteht; mit „Prüfen"-Modus zum Nachweis. Ehrliche Grenze: **nicht** zuverlässig bei starker Verkleinerung (Details: [`docs/downscale-robustness.md`](docs/downscale-robustness.md))
- 💾 **Dateiname & Ablageort:** frei konfigurierbares Namensschema mit Tokens (`{name}`, `{n}`/`{n:3}`, `{date}`, `{time}`, `{type}`, `{w}`×`{h}`) inkl. Live-Vorschau; Ablage in einen **Downloads-Unterordner** oder einen **frei gewählten Ordner** (File System Access API, auch für Batch)
- 📦 **Batch-Verarbeitung:** mehrere Bilder auf einmal, auch nachträglich per Drag & Drop oder Strg+V ergänzbar
- 🎯 **Manuelle Positionierung:** X/Y-Slider + Schnell-Presets

Geplant: **Web-App** (identische Codebasis, GitHub Pages) sowie eine downscale-feste v2 des unsichtbaren Wasserzeichens (Synchronisation + ECC).

## Installation (Entwicklung)

1. Chrome → `chrome://extensions` → **Entwicklermodus** aktivieren
2. **"Entpackte Erweiterung laden"** → diesen Projektordner auswählen
3. Extension-Icon anklicken → Side Panel öffnet sich

## Rechtlicher Hinweis

Dieses Tool unterstützt die sichtbare Kennzeichnungspflicht für Deployer (Art. 50 Abs. 4 EU AI Act, gültig ab 02.08.2026). Es ersetzt keine Rechtsberatung und erfüllt keine Provider-Pflichten (Art. 50 Abs. 2, z. B. C2PA-Signierung). Der Anbieter übernimmt keine Gewähr dafür, dass die Nutzung von Benti die Anforderungen des Art. 50 EU AI Act vollständig erfüllt, und keine Verpflichtung, das Tool fortlaufend an Änderungen der Rechtslage anzupassen. Die Prüfung der rechtlichen Korrektheit obliegt stets der Nutzerin bzw. dem Nutzer.

## Lizenz

MIT-Lizenz © 2026 Benti.Labs – siehe [`LICENSE`](LICENSE). Mitgelieferte Fremdkomponenten (C2PA-Bibliothek in `libs/c2pa/`, offizielle EU-Icons in `assets/eu-icons/`) behalten ihre eigenen Lizenzen bzw. Nutzungsbedingungen.

Kontakt: benti.labs@gmail.com
