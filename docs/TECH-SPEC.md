# 🔧 Benti – Technische Spezifikation
Stand: 2026-07-07 · Zweck: Alle technischen Fragen sind hier vorab geklärt — beim Implementieren muss nichts mehr recherchiert werden.

---

## §1 C2PA-Bibliothek (für Herkunfts-Check, US-2.1)

**Entscheidung: `@contentauth/c2pa-web` (v0.7.x), Variante `/inline`** — die offizielle JS-Bibliothek der Content Authenticity Initiative.

Warum die Inline-Variante:
- WASM ist als Base64 in die JS-Datei eingebettet → **eine einzige Datei**, keine separaten Worker-/WASM-Requests
- Funktioniert dadurch komplett **offline und ohne CDN** → hält unser Versprechen „keine Netzwerk-Requests"
- Nachteil (akzeptiert): größere Datei, kein compileStreaming — für unseren Anwendungsfall (einzelne Bilder) irrelevant

**Vendoring ohne npm/Node** (einmalig, z. B. per curl):
- Paketdateien von jsDelivr beziehen: `https://cdn.jsdelivr.net/npm/@contentauth/c2pa-web@<version>/` (Verzeichnis-Listing im Browser prüfen, ESM-Build der Inline-Variante nach `libs/c2pa/` kopieren)
- Fallback, falls sich das Paket als sperrig erweist: Legacy-SDK `c2pa@0.24.x` via `https://cdn.jsdelivr.net/npm/c2pa@0.24.2/+esm` + `dist/assets/wasm/toolkit_bg.wasm` — dann müssen WASM- und Worker-Datei mit gevendort und beim `createC2pa()` als lokale Pfade konfiguriert werden
- Doku: https://opensource.contentauthenticity.org/docs/js-sdk/getting-started/quick-start/ · Repo: https://github.com/contentauth/c2pa-js

**Manifest-Änderung (Pflicht für WASM in MV3):**
```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

**API-Fluss:** SDK initialisieren → `read(blob)` → `manifestStore.activeManifest` → relevante Felder: `claimGenerator` (Erzeuger-Tool), Signatur-Aussteller + Zeit, Assertions (z. B. `c2pa.actions`). Validierungsstatus beachten: Manifest kann vorhanden, aber Signatur ungültig sein → als „gefunden, Signatur ungültig (Datei wurde verändert)" anzeigen.

---

## §2 XMP-Paket für KI-Kennzeichnung (US-3.1/3.2)

IPTC-Standard-Property `DigitalSourceType` (liest u. a. Google für die Suche-Kennzeichnung):

| Label-Typ (US-1.1) | Wert (URI) |
|---|---|
| Vollständig KI-generiert | `http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia` |
| KI-bearbeitet | `http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia` |

**XMP-Paket-Template** (UTF-8, in PNG-iTXt bzw. JPEG-APP1 einbetten):
```xml
<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
      xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"
      xmlns:dc="http://purl.org/dc/elements/1.1/">
   <Iptc4xmpExt:DigitalSourceType>{{URI_AUS_TABELLE}}</Iptc4xmpExt:DigitalSourceType>
   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">Labelled with Benti (EU AI Act Art. 50)</rdf:li></rdf:Alt></dc:description>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
```
Hinweis: `﻿` = BOM-Zeichen (nicht der Literaltext). `<?xpacket end="w"?>` = beschreibbar; Padding optional.

---

## §3 EU-Icon-Assets & Auswahl-Logik (US-1.2)

Dateien unter `assets/eu-icons/{svg,png}/`, Schema `{typ}_{farbe}[_50].{ext}`:

| Label-Typ | Basis-Dateiname |
|---|---|
| Vollständig KI-generiert | `ai-generated` |
| KI-bearbeitet | `ai-modified` |
| Kompakt-Stil „Nur AI-Symbol" (Icon-Stil-Umschalter, seit 08.07.) | `ai` |

**Auswahl-Logik:**
1. Typ ← US-1.1-Auswahl
2. Farbe: `zoneLum > 128` → `black`, sonst `white` (vorhandene Dual-Logo-Logik)
3. Variante: Deckkraft-Slider ≥ 75 % → Vollton, sonst `_50` (dann `globalAlpha` auf 1.0 setzen — die Transparenz steckt schon im Icon; nicht doppelt dämpfen!)
4. Rendering: PNG-Variante ins `Image`-Objekt laden (SVG nur für Web-Doku)
5. **Größe (seit 08.07.): Label-HÖHE = Slider-% (3–12, Default 5) × √(Bildbreite × Bildhöhe).** Höhenbasiert + Diagonalen-Bezug macht die wahrgenommene Größe konsistent über Seitenverhältnisse (Panorama vs. Quadrat) und zwischen breiter Text-Pill und kompaktem Quadrat-Icon. Klemmen: min. 24 px Höhe, max. 40 % Bildhöhe / 50 % Bildbreite.
6. Deutscher Zusatztext wird als Teil des Anker-Blocks gerendert (immer UNTER dem Label, Blockhöhe = Label + Abstand + Text)

---

## §4 PNG: XMP als iTXt-Chunk (US-3.1)

Aufbau des iTXt-Datenblocks (danach wie pHYs: Länge + Typ `iTXt` + Daten + CRC32, Insertion nach IHDR — vorhandenen Code wiederverwenden):
```
Keyword:            "XML:com.adobe.xmp"  (17 Bytes)
Null-Separator:     0x00
Compression flag:   0x00  (unkomprimiert)
Compression method: 0x00
Language tag:       ""  + 0x00
Translated keyword: ""  + 0x00
Text:               <XMP-Paket aus §2, UTF-8>
```
Bestehenden iTXt-XMP-Chunk vor dem Einfügen entfernen (analog `removePHYsChunk`).

---

## §5 JPEG: XMP als APP1-Segment (US-3.2)

```
0xFF 0xE1                          Marker APP1
<2 Bytes Länge, big-endian>        = 2 + 29 + XMP-Länge
"http://ns.adobe.com/xap/1.0/\0"   Namespace-Header (29 Bytes)
<XMP-Paket aus §2>
```
- Einfügeposition: direkt nach SOI (0xFFD8), ggf. nach vorhandenem APP0/JFIF
- Limit: Segment max. 65.535 Bytes → unser XMP (<2 KB) unkritisch
- Voraussetzung: JPEG-Export via `canvas.toBlob('image/jpeg', quality)` (aktuell exportiert das Tool nur PNG — Exportformat-Auswahl gehört zu US-3.2)

---

## §6 Web-App-Fallbacks (US-4.2)

| Extension-API | Web-Fallback |
|---|---|
| `chrome.storage.local.get/set` | Wrapper: wenn `typeof chrome === 'undefined' \|\| !chrome.storage` → `localStorage` (JSON) |
| `chrome.downloads.download` | vorhandenes `triggerAnchorDownload()` (bereits implementiert) |
| Side-Panel-Breite (max-width 420) | im Web: zentrierte Karte, gleiche Breite |

Wichtig: `saveSettings`/`loadSettings` referenzieren `chrome.storage` aktuell ungeschützt → im Browser wirft das `ReferenceError`. Der Wrapper aus dieser Tabelle behebt das.

---

## §7 Bekannte Grenzen (nicht implementierbar / bewusst außen vor)

- **Unsichtbare Wasserzeichen** (SynthID etc.): keine öffentlichen Detektoren → kein Feature. Falls Provider gemäß Code of Practice Detektions-APIs veröffentlichen: nur als Opt-in (externe Requests!).
- **C2PA-Signieren**: bräuchte Zertifikats-/Key-Infrastruktur → Tool schreibt unsignierte IPTC/XMP-Metadaten (ehrlich kommunizieren).
- **Labeln invalidiert vorhandene C2PA-Signaturen** des Originals (Pixel ändern sich) → Hinweis-Pflicht US-3.4.
- **Social-Media-Plattformen strippen Metadaten beim Upload** (Instagram, Facebook, WhatsApp …) → die maschinenlesbare Kennzeichnung (Modul 3) wirkt nur auf eigenen Kanälen (Website, CMS, Datei-Weitergabe); auf Social zählt allein das sichtbare Label. In Demo und Nutzer-Doku aktiv kommunizieren.
- **Kein CoP-Adhärenz-Signal:** Die EU-Icons sind frei nutzbar (ohne Attribution), aber Benti darf nirgends behaupten oder suggerieren, Unterzeichner des Code of Practice zu sein.

---

## §8 Compliance-Protokoll (EPIC 5)

Zweck: Belegbarkeit der Kennzeichnung — Deployer-Dokumentation für Audits, komplett lokal.

**Datenmodell** (ein Eintrag pro gelabeltem Bild; `chrome.storage.local`, Key `benti_audit_log`):
```
{ ts: ISO-8601, file: Dateiname,
  sha256Original: hex, sha256Labeled: hex,
  labelType: 'ai-generated' | 'ai-modified',
  icon: Icon-Dateiname, textLabel: bool,
  dst: IPTC-URI (sobald Phase 3 live), appVersion: string }
```
- **Hashing:** `crypto.subtle.digest('SHA-256', arrayBuffer)` — browsernativ, keine Bibliothek nötig
- **Speicher:** Einträge ~300 B; ab 10.000 Einträgen älteste rotieren + Export-Hinweis anzeigen
- **CSV-Export:** Blob + vorhandenes `triggerAnchorDownload()`; Semikolon-getrennt mit UTF-8-BOM (Excel-kompatibel)
- **Datenschutz:** nur Hashes + Metadaten, niemals Bildinhalte; Protokoll jederzeit lokal löschbar

---

## §9 Team-Presets / Policy-Datei (EPIC 6)

Dateiformat `benti-preset.json` (Export/Import über die Einstellungen):
```json
{
  "formatVersion": 1,
  "presetName": "Marketing DE", "createdBy": "…", "createdAt": "ISO-8601",
  "policy": {
    "labelType": "ai-generated", "euIconMode": true, "textLabel": true,
    "opacityMin": 70, "position": "ai", "allowCustomLogo": false
  },
  "customLogo": { "dark": "dataURL|null", "light": "dataURL|null" }
}
```
- Import: JSON parsen → `formatVersion` prüfen → Felder gegen Whitelist validieren → Settings übernehmen → Bestätigung
- Policy-Modus: fixierte Optionen sperren die zugehörigen UI-Bereiche (Label „Durch Firmen-Preset festgelegt"); die Sperre dient der Konsistenz, nicht der Sicherheit — so dokumentieren
- Verteilung ohne Server: per Mail / Intranet-Ablage / MDM

---

## §10 Smart-Label-Vorschlag (US-2.4)

| Fund beim Herkunfts-Check | Vorschlag |
|---|---|
| `DigitalSourceType = trainedAlgorithmicMedia` | „Vollständig KI-generiert" |
| `DigitalSourceType = compositeWithTrainedAlgorithmicMedia` | „KI-bearbeitet" |
| C2PA-Assertion weist KI-Erzeugung aus (z. B. `digitalSourceType` in `c2pa.actions`) | analog zur Aktion |
| C2PA vorhanden, aber ohne KI-Kennung | kein Vorschlag — nur Herkunfts-Info anzeigen |

Grundregel: **Vorschlag ≠ Automatik.** Immer anzeigen, worauf der Vorschlag basiert; Nutzer entscheidet.

---

## §11 Vorschau-Geometrie (US-1.8, Bugfix)

**Problem:** `#previewImg` nutzt `object-fit: contain` — das Bild wird mit Letterbox-Rändern in die Element-Box eingepasst. Das Zonen-Overlay rechnet aber mit `clientWidth/clientHeight` der Box → Rahmen liegt versetzt bzw. ragt über das sichtbare Bild hinaus.

**Berechnung des sichtbaren Bild-Rechtecks:**
```
scale   = min(boxW / naturalW, boxH / naturalH)
dispW   = naturalW * scale      dispH = naturalH * scale
offsetX = (boxW - dispW) / 2    offsetY = (boxH - dispH) / 2
Overlay-Koordinate = offset + (Bildkoordinate × scale)
```
**WYSIWYG-Vorschau:** Statt Zonen-Rahmen ein absolut positioniertes Vorschau-Element (Icon-Bild bzw. Text), das exakt dieselben Formeln nutzt wie das Canvas-Rendering (anchorX/Y, Margins, Größen-Prozent) — nur eben mit `scale` multipliziert. Eine Berechnungsfunktion für beide Pfade (Vorschau + Export) verwenden, damit nichts auseinanderläuft.

---

## §12 Ausgabeziel-Presets & Lesbarkeits-Guard (US-1.9)

**Physikalische Grundwahrheit (ehrlich dokumentieren):** Eine Rasterdatei hat genau EIN festes Label-zu-Bild-Verhältnis. „Bei jeder Anzeigegröße lesbar" ist prinzipiell nicht garantierbar — ein 3-cm-Thumbnail macht jedes Label unlesbar. Die Strategie ist deshalb dreistufig: **zielgerechte Voreinstellung + harte Untergrenzen + Warnung.**

**Preset-Tabelle** (Startwerte — im Firmen-Pilot kalibrieren):

| Ausgabeziel | typische Anzeigebreite | Label-Breite (relativ) | Mindest-Labelhöhe im Original |
|---|---|---|---|
| Social Media (Feed) | 400–800 px | 14 % | 28 px |
| Web / Blog | 800–1600 px | 9 % | 24 px |
| Präsentation / TV | ~1920 px | 7 % | 32 px |
| Print (mit DPI-Modul) | 300 DPI | 6 % | ≥ 5 mm ≈ 60 px @ 300 DPI |

**Guard-Regel:** `labelHöhePx = Bildbreite × rel% × Icon-Seitenverhältnis`. Liegt der Wert unter der Mindesthöhe des gewählten Ziels → gelbe Warnung im UI + Button „Auf empfohlene Größe setzen". Bestehende globale Klemmen bleiben: min. 24 px, max. 50 % Bildbreite.

**Bezug zum Code of Practice:** „adequate sizing", „clearly perceivable at first exposure" — die Presets operationalisieren genau das.

**Umsetzung 09.07.2026 (an die höhenbasierte Größenlogik von §3.5 angepasst):** Slider-Prozente (Label-Höhe von √(W·H)): Social 8 % / Web 5 % / Präsentation 4 % / Print 4 %; Mindesthöhen: 28 / 24 / 32 / 60 px. Guard prüft `layout.lh` gegen die Mindesthöhe des gewählten Ziels; „Empfehlung anwenden" hebt den Slider auf den nötigen Prozentwert (geklemmt auf 3–12).

---

## §13 SVG-Workflow (US-3.6)

- **Analyse:** SVG in `<img>` laden → offscreen auf Canvas rastern (feste Breite, z. B. 1024 px) → vorhandene Zonen-Analyse verwenden
- **Ausgabe (bleibt Vektor):** neues SVG-Dokument = Original-Inhalt + EU-Icon-SVG inline als `<svg x y width height>`-Element an der berechneten Position + `<metadata>` mit XMP-Paket (§2)
- **Sicherheit (v1 = ablehnen statt reparieren):** SVGs mit `<script>`, `on*`-Event-Attributen, `<foreignObject>` oder externen Referenzen (`href`/`url()` auf fremde Quellen — die würden beim Rendern Netzwerk-Requests auslösen und das Lokal-Versprechen brechen) werden nicht verarbeitet, sondern mit verständlicher Meldung abgelehnt. Vorschau ausschließlich über `<img src=blob:>` (skriptfrei), nie via `innerHTML`. Sanitizing-„Reparatur" bewusst verschoben: unvollständiges Sanitizing ist gefährlicher als ehrliches Ablehnen.
- **Grenzen:** kein Raster→Vektor („Fake-SVG" mit eingebettetem Pixelbild wird bewusst nicht angeboten); EPS/AI/PDF benötigen Desktop-Werkzeuge — außerhalb des Browser-Scopes

---

## §14 Metadaten-Erhalt (US-3.7)

**Problem:** Der Canvas-Export erzeugt eine komplett neue Datei — sämtliche Original-Metadaten (EXIF, XMP mit Copyright/Credit, Farbprofil) gehen stillschweigend verloren. Für ein Transparenz-Tool inakzeptabel: Wir würden Urheberinfos zerstören, während wir Herkunftsinfos hinzufügen.

**Ansatz:** Metadaten direkt aus den Original-Bytes extrahieren (die Datei liegt als `File`/ArrayBuffer vor) und in die exportierte Datei re-inserieren:

| Weg | Übernahme |
|---|---|
| JPEG → JPEG | APP1-EXIF-Segment + APP1-XMP byteweise kopieren; unser `DigitalSourceType` wird ins bestehende XMP **gemerged** |
| PNG → PNG | iTXt/tEXt/zTXt- + eXIf-Chunks kopieren (Chunk-Parser existiert bereits) |
| Formatwechsel | XMP neu aufbauen inkl. übernommener Kernfelder (`dc:creator`, `dc:rights`, `photoshop:Credit`); Hinweis anzeigen, was entfällt |

**XMP-Merge:** bestehendes Paket parsen, `Iptc4xmpExt:DigitalSourceType` ergänzen bzw. aktualisieren, alle übrigen Felder unangetastet lassen.

**Dokumentierte Grenze:** ICC-Farbprofile werden vom Canvas-Rendering selbst nicht angewendet (sRGB-Konvertierung) — Wide-Gamut-Bilder können leicht abweichende Farben zeigen; das Kopieren des Profil-Chunks allein behöbe das nicht ehrlich.
