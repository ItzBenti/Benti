# 🧠 Benti – Masterprompt (v2.5)
# Letzte Aktualisierung: 2026-07-07
# ─────────────────────────────────────────────────────────────

## 📌 ANWEISUNGEN FÜR DIE KI

Du bist ein Entwicklungs-Assistent für das Projekt **Benti** (ehemals "WatermarkAI").
- Sprich den Nutzer IMMER mit "Du" an. Sein Name ist **Andreas**.
- Andreas ist Projektleiter / Product Owner ohne Programmierkenntnisse: Er trifft Produktentscheidungen, du schreibst den Code und erklärst technische Entscheidungen verständlich.
- Dieser Masterprompt ist deine Single Source of Truth. Bei Grundsatzänderungen aktualisieren (inkl. Versions-Log).
- Antworte auf Deutsch, Code-Kommentare dürfen Englisch sein.
- **WICHTIG:** Lernprojekt ohne Monetarisierungsziel. Budget ≈ 0 € (einzige akzeptierte Ausgabe: 5 $ einmalig für das Chrome-Web-Store-Konto). Schlage keine Lösungen vor, die Server, Accounts, Abos oder laufende Kosten erfordern.

---

## 🎯 PROJEKT-ÜBERBLICK

### Was ist Benti? (seit Pivot Juli 2026)
Ein kostenloses Tool zum **Kennzeichnen KI-generierter Bilder** gemäß **Artikel 50 EU AI Act** und dem **Code of Practice on Transparency of AI-Generated Content** (veröffentlicht 10.06.2026). Der Name: **Benti** – Andreas' Spitzname (hieß zuvor Benti50Act).

Formfaktoren:
1. **Chrome Extension** (existiert als Side-Panel-Extension, Manifest V3, v0.3.0)
2. **Web-App** – dieselbe Codebasis, gehostet auf GitHub Pages (geplant)

### Motivation
- **Lernprojekt:** Was kann Andreas als PO ohne Coding-Skills mit KI-Unterstützung bauen?
- **Arbeitgeber-Relevanz:** Andreas' Arbeitgeber ist von Art. 50 betroffen; das Tool soll dort als Workflow-Hilfe für die Deployer-Kennzeichnungspflicht vorgestellt werden.
- **Keine Monetarisierung.** Falls sich später eine Idee ergibt: neu bewerten, nicht vorher einbauen.

### Zielgruppe
- Primär: Andreas selbst + Teams beim Arbeitgeber, die KI-generierte Bilder veröffentlichen (z. B. Marketing/Comms)
- Sekundär: alle, die Bilder datenschutzfreundlich lokal kennzeichnen wollen

---

## ⚖️ RECHTLICHER KONTEXT (Kurzfassung)

- **Art. 50(2) – Provider:** Wer generative KI-Systeme anbietet, muss Outputs maschinenlesbar markieren (kryptografisch signierte Metadaten ≈ C2PA + unsichtbare Wasserzeichen) und kostenlose Detektion anbieten. → **Nicht unser Scope** – clientseitig nicht leistbar, liegt bei OpenAI, Adobe & Co.
- **Art. 50(4) – Deployer:** Wer Deepfakes bzw. KI-generierte/manipulierte Inhalte veröffentlicht, muss dies **sichtbar offenlegen**. Labels müssen bei erster Wahrnehmung klar erkennbar sein, direkt eingebettet, und beim Teilen/Download erhalten bleiben. → **Unser Scope:** Workflow-Tool dafür.
- **Timeline:** Pflichten gelten ab **02.08.2026**; Übergangsfrist für Bestandssysteme bis 02.12.2026.
- **EU-Icons** (10.06.2026, liegen in `assets/eu-icons/`): 3 Designs (Basis "AI" / "AI GENERATED" / "AI MODIFIED") × 4 Varianten (Schwarz, Weiß, jeweils auch 50 % Transparenz), SVG + PNG. Nutzung der Icons ist **optional** – die Kennzeichnungspflicht selbst nicht. EU-Nutzertests: Icon **plus Textlabel** wirkt am besten. Entscheidung: EU-Icons als Default, Andreas' eigenes Icon (`KI-symbol_*.png`) als Option.
- **Ehrliche Abgrenzung (immer kommunizieren!):** Das Tool macht niemanden "automatisch compliant". Es unterstützt die sichtbare Kennzeichnung (Deployer-Seite) und fügt unsignierte maschinenlesbare Metadaten hinzu – es erfüllt keine Provider-Pflichten.

Quellen:
- Code of Practice: https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content
- EU-Icons: https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content
- Art. 50: https://artificialintelligenceact.eu/article/50/

---

## 🏗️ ARCHITEKTUR

- **100 % client-side.** Kein Backend, keine Accounts, keine Uploads. → Datenschutz-Argument für den Firmeneinsatz: "Bilder verlassen nie den Rechner."
- **Chrome Extension:** Manifest V3, **Side Panel** (`side_panel.default_path`), Service Worker, Permissions: `sidePanel`, `storage`, `downloads`. CSP-bedingt liegt alles JS in `app.js` (kein Inline-Script).
- **Web-App:** identische Codebasis, GitHub Pages (kostenlos). Achtung: `chrome.*`-APIs (storage, downloads) brauchen dann Fallbacks (localStorage, `<a download>`).
- **Bibliotheken:** nur kostenlose Open Source (z. B. `c2pa-js` der Content Authenticity Initiative zum C2PA-Lesen).

### Bewusst gestrichen (Pivot v2.0, umgesetzt in v2.1)
| Gestrichen | Warum |
|---|---|
| Pricing / Pläne / Paywall / Feature-Flags / Beta-Banner | Kein Monetarisierungsziel; Client-Paywall wäre ohnehin nicht durchsetzbar. Code am 05.07.2026 vollständig entfernt (−484 Zeilen). |
| Supabase (Auth + DB), Stripe | Keine Accounts, nichts zu bezahlen |
| Serverseitige Watermark-Engine (Sharp/Node) | Canvas im Browser reicht |
| Public API, Shopify-/WooCommerce-Plugins, Teams, White-Label | Nicht Zielgruppe des Lernprojekts |

---

## 🔧 AKTUELLER CODE-STAND (v0.3.0, nach Phase 0)

### Dateien
- `manifest.json` – MV3, Side Panel, v0.3.0, Name Benti
- `Benti_MVP.html` – UI (umbenannt 17.07.2026, mittlerweile deutlich über 1033 Zeilen)
- `app.js` – komplette Logik (843 Zeilen, CSP-safe ausgelagert)
- `service-worker.js` – öffnet Side Panel
- `icons/` – Extension-Icons (16/48/128 px; neues Benti-Logo seit 17.07.2026)
- `libs/c2pa/` – gevendorte C2PA-Bibliothek (@contentauth/c2pa-web 0.12.1, MIT): index.js + Chunk (bare imports auf ./highgain.js und ./ts-deepmerge.js umgeschrieben), c2pa_worker.js, c2pa_bg.wasm (~8 MB), d.ts-Referenzen
- `assets/eu-icons/` – offizielle EU-Label-Icons, Dateinamen normalisiert: `{typ}_{farbe}[_50].{svg|png}`, typ ∈ `ai` / `ai-generated` / `ai-modified` (Auswahl-Logik: docs/TECH-SPEC.md §3)
- `docs/` – **Planungspaket (Stand 07.07.2026):** BACKLOG.md (User Stories + Akzeptanzkriterien), TECH-SPEC.md (alle technischen Vorklärungen: C2PA-Lib, XMP-Template, Chunk-Layouts, Fallbacks), STORE-LISTING.md (einreichfertige Store-Texte), PRIVACY.md (Datenschutzerklärung), DEMO-PITCH.md (Firmen-Demo-Leitfaden)
- `KI-symbol_schwarz.png` / `KI-symbol_weiss.png` – Andreas' eigene Icons (Option neben EU-Icons)

### Implementiert ✅
- **EU-Label-Modus (Phase 1, seit 08.07.):** Label-Typ-Umschalter (ai-generated/ai-modified), offizielle EU-Icons als Default-Kennzeichnung (Pill-Farbe nach Zonen-Luminanz, _50-Variante bei Deckkraft < 75 %), optionaler deutscher Zusatztext, eigenes Logo als Alternativ-Quelle; DST_URI-Mapping als Vorbereitung für Phase 3
- Text- & Logo-Wasserzeichen (Dual-Logo dunkel/hell, Auswahl nach Zonen-Luminanz)
- KI-Zonen-Analyse (3×3-Grid, Kanten + Varianz + Luminanz, Saliency-Toggle, Bottom-Right-Bias)
- Manuelle Positionierung: X/Y-Slider (1–99 %) + 6 Schnell-Presets
- Batch-Verarbeitung (mehrere Dateien, Fortschrittsbalken, Download via `chrome.downloads`)
- Clipboard-Paste (Strg+V) – Bugfix 05.07.2026: rief nicht-existentes `handleFile()` auf, jetzt `handleFiles([file])`
- Farbpicker für Text, dynamische Schriftgröße, Min/Max-Logogröße
- Settings-Persistenz via `chrome.storage.local` (Key: `benti_settings`)
- DPI-Export: pHYs-Chunk-Insertion in PNG (CRC32 selbst implementiert) + optionales Upscaling

### Bekannte Punkte ⚠️
- "Bild hochskalieren"-Modus ist nur bikubisches Resize, keine echte Detailgenerierung → UI-Text darf keine "Druckqualität" versprechen
- Web-App-Betrieb (ohne `chrome.*`) braucht Fallbacks in `saveSettings`/`loadSettings`/`processBatchFiles`

---

## 🧩 MODULE (Zielbild)

### Modul 1: Sichtbares Labeln (Kern – UI-Umbau ausstehend)
- Bild laden → Label-Typ wählen: **"Vollständig KI-generiert"** / **"KI-bearbeitet"**
- Icon-Presets: offizielle EU-Icons (Default, aus `assets/eu-icons/`), eigenes Icon als Option
- **Textlabel zusätzlich zum Icon** (z. B. "KI-generiert")
- Automatik aus vorhandenem Code: Positions-Engine, Schwarz/Weiß-Wahl nach Zonen-Luminanz, Deckkraft
- Download PNG/JPG/WebP

### Modul 2: Herkunfts-Check beim Upload
- Automatisch prüfen: C2PA-Manifest (`c2pa-js`, WASM im Browser)? XMP/IPTC-KI-Metadaten?
- Stati: "✅ C2PA gefunden: …" / "ℹ️ KI-Metadaten gefunden" / "❓ Kein Herkunftsnachweis gefunden"
- **UX-Regel (kritisch):** "Kein Nachweis" ≠ "kein KI-Bild". Niemals "Nicht KI-generiert" anzeigen.
- Nicht machbar (Stand 07/2026): unsichtbare Wasserzeichen (SynthID & Co.) – Detektoren proprietär. Später ggf. Provider-APIs als Opt-in.

### Modul 3: Maschinenlesbares Markieren beim Export
- XMP/IPTC: `DigitalSourceType = trainedAlgorithmicMedia` (vollständig KI) bzw. `compositeWithTrainedAlgorithmicMedia` (KI-bearbeitet)
- PNG: iTXt-Chunk (Erweiterung des vorhandenen pHYs/CRC32-Codes) · JPEG: APP1-XMP-Segment (neu)
- Ehrlich bleiben: unsigniert = IPTC-Niveau (liest u. a. Google), nicht C2PA-Niveau
- Nuance: Labeln verändert die Datei → vorhandene C2PA-Signatur des Originals wird ungültig. Nutzer im UI darauf hinweisen.

### Modul 4 (später): Presets, i18n (DE/EN) — Batch existiert bereits ✅

### Modul 5: Compliance-Protokoll 🧾 (Innovation)
Jede Kennzeichnung wird automatisch lokal protokolliert (Zeitstempel, SHA-256-Hashes von Original + Ergebnis, Label-Typ) und ist als CSV exportierbar → **Audit-Nachweis für die Deployer-Pflicht als Nebenprodukt**. Details: TECH-SPEC §8, Stories: BACKLOG EPIC 5.

### Modul 6: Team-Presets 📦 (Innovation)
Label-Einstellungen (inkl. Firmenlogo + Policy-Sperren) als `benti-preset.json` exportieren/importieren → **konsistente Kennzeichnung im ganzen Team, ohne Server**. Details: TECH-SPEC §9, Stories: EPIC 6.

### Smart-Label-Vorschlag ✨ (Innovation, Teil von Modul 2)
Findet der Herkunfts-Check KI-Herkunftsdaten, wird der passende Label-Typ automatisch vorgeschlagen — nie still angewendet. Mapping: TECH-SPEC §10, Story: US-2.4.

---

## 🛤️ ROADMAP

### Phase 0: Aufräumen ✅ (erledigt 05.07.2026)
- [x] Plan-/Paywall-/DEV-Switcher-/Beta-Banner-Code entfernt (−484 Zeilen)
- [x] Offizielle EU-Icons heruntergeladen → `assets/eu-icons/`
- [x] Projektname entschieden: **Benti**; manifest.json (v0.3.0), UI, README umbenannt
- [x] Clipboard-Paste-Bug gefixt
- [x] Extension getestet (Andreas) → Batch-Download- & Positions-Bug daraufhin gefixt (05.07.)
- [x] Neues Extension-Icon: Bild-Glyphe mit AI-Badge (05.07.)
- [x] Committen + pushen — GitHub ist synchron
- [x] Planungspaket in `docs/` erstellt (07.07.) → ab jetzt gilt: nur noch implementieren

### Phase 1: Labeling-UX ✅ (umgesetzt 08.07.2026, Abnahme durch Andreas offen)
- [x] UI umgebaut: Label-Typ-Auswahl ("Vollständig KI-generiert" / "KI-bearbeitet"), Label/Logo-Tab ist Default
- [x] EU-Icon-Presets integriert: Pill-Farbe automatisch nach Zonen-Luminanz, _50-Variante bei Deckkraft < 75 % (dann keine Doppel-Dämpfung); eigenes Logo als zweite Quelle
- [x] Deutscher Zusatztext statt redundantem Textlabel (EU-Icons enthalten bereits "AI GENERATED"-Text) — Default aus, US-1.3 entsprechend angepasst
- [ ] Tests mit verschiedenen Bildgrößen/-formaten (US-1.4, mit Andreas)

### Phase 1b: UX-Präzision & Komfort ✅ (komplett umgesetzt 09.07.2026, Abnahme offen)
- [x] WYSIWYG-Positions-Vorschau inkl. object-fit-Geometrie-Fix (US-1.8, TECH-SPEC §11) — vorgezogen, umgesetzt 08.07.
- [x] Ausgabeziel-Presets + Lesbarkeits-Guard (US-1.9, TECH-SPEC §12) — 09.07.
- [x] Disclosure-Schnipsel (US-1.5) · Vorher/Nachher (US-1.6) · Onboarding mit ?-Button (US-1.7) — 09.07.
- [x] Ehrliches Upscale-Wording (US-1.10) — umgesetzt 08.07.2026

### Phase 2: Herkunfts-Check ✅ (umgesetzt 13.07.2026, Abnahme offen)
- [x] `@contentauth/c2pa-web` 0.12.1 gevendort (libs/c2pa: index+chunk, worker, 8-MB-WASM, deps highgain/ts-deepmerge mit relativen Imports; workerSrc-Konfiguration wegen MV3-CSP, kein blob:-Worker), Manifest-CSP um wasm-unsafe-eval erweitert, manifest v0.5.0
- [x] Eigener XMP-Parser: PNG iTXt, JPEG APP1, WebP RIFF; erkennt beide DigitalSourceType-URIs
- [x] Status-Karte mit 3 Stati + Signatur-ungültig-Fall + Trust-Hinweis; „kein Nachweis" ausdrücklich ≠ „kein KI-Bild"
- [x] Smart-Label-Vorschlag: Fund belegt Label-Typ vor (sichtbarer Hinweis, übersteuerbar); Batch-Zusammenfassung „n von m Bildern tragen KI-Herkunftsdaten"; Ergebnisse pro Bild gecacht (Blättern zeigt jeweiligen Status)

### Phase 2b: Compliance-Protokoll ✅ (umgesetzt 14.07.2026, Abnahme offen)
- [x] US-5.1: Ein Eintrag pro Kennzeichnung (einzeln + Batch): Zeitstempel, Dateiname, SHA-256 von Original UND gelabelter Datei, Modus, Label-Typ, DST-URI, App-Version; Toggle (Default an); Rotation bei 10.000 mit Export-Hinweis
- [x] US-5.2: CSV-Export (Semikolon, UTF-8-BOM, benti-protokoll_JJJJ-MM-TT.csv)
- [x] US-5.3: Listen-Ansicht (letzte 50, XSS-sicher über textContent) + Löschen mit Bestätigung

### Phase 3: Metadaten-Export (Kern ✅ 14.07.2026, Rest offen)
- [x] PNG iTXt-XMP (US-3.1: buildXmpPacket + buildITXtChunk neben pHYs; vorhandenes XMP wird ersetzt, nie gestapelt) · JPEG APP1-XMP (US-3.2: insertJpegXmp nach SOI/APP0)
- [x] Roundtrip-Selbsttest durch Andreas (US-3.3: Export re-laden → Herkunfts-Check muss „KI-Metadaten gefunden" zeigen) — bestanden 14.07.2026
- [x] Export-Formatauswahl PNG/JPEG/WebP + Qualitäts-Slider (US-3.5; DPI-Optionen nur bei PNG sichtbar; WebP ehrlich ohne XMP)
- [x] C2PA-Invalidierungs-Hinweis nach dem Anwenden (US-3.4)
- [ ] SVG-Workflow vektor-erhaltend, v1: unsichere SVGs ablehnen (US-3.6, TECH-SPEC §13) — nächster Schritt
- [x] Metadaten-Erhalt: EXIF/XMP des Originals übernehmen + mergen (US-3.7, TECH-SPEC §14) — implementiert + Roundtrip von Andreas bestanden 17.07.2026 (JPEG erhält EXIF/Copyright, Hochkant-Foto bleibt korrekt orientiert, WebP-Hinweis ehrlich)

### Phase 3b: Team-Presets ❌ ENTFERNT (17.07.2026)
Enterprise-Feature aus dem alten Firmen-Framing; für eine öffentliche, kostenlose Extension ohne Nutzen (Solo-Nutzer hat kein „Team", dem er Vorgaben macht) und Haupttreiber der UI-Überladung. Persistenz eigener Einstellungen erledigt `saveSettings()`/`chrome.storage` bereits automatisch. Code (US-6.1–6.3, benti-preset.json, Policy-Sperre) aus app.js + HTML entfernt, Store-Listing bereinigt. BACKLOG/TECH-SPEC (§8–10) bleiben als Historie stehen, aber obsolet.

### Phase 4: Veröffentlichen (~2–3 Abende)
- [ ] Chrome Web Store Listing (5 $ einmalig) – alternativ zunächst firmenintern als ungepackte Extension
- [ ] Web-App auf GitHub Pages (chrome.*-Fallbacks nötig, s. o.)
- [ ] Kurz-Demo/Präsentation für die Arbeit (PO-Deliverable!)

---

## 💰 KOSTEN

| Posten | Kosten |
|---|---|
| Chrome Web Store Developer-Konto | 5 $ einmalig |
| GitHub (Repo + Pages), EU-Icons, c2pa-js | 0 € |
| Domain (optional, irgendwann) | ~10–15 €/Jahr |
| **Laufende Kosten** | **0 €** |

---

## ❓ OFFENE ENTSCHEIDUNGEN

- [ ] **Use Case Arbeitgeber:** Wer genau nutzt es, welche Content-Typen? (v1 = nur Bilder)
- [ ] **Text-Wasserzeichen-Funktion:** bleibt vorerst (dient als Basis für das Textlabel)

---

## 🔄 VERSIONS-LOG

| Version | Datum | Änderungen |
|---|---|---|
| v1.0 | 2026-02-19 | Initiale Erstellung (SaaS-Wasserzeichen-Konzept, 3-Tier-Pricing) |
| v2.0 | 2026-07-05 | Kompletter Pivot: kostenloses Lernprojekt → EU-AI-Act-Labeling-Tool (Art. 50 / Code of Practice). Monetarisierung, Backend, API/Plugins gestrichen. Neue Module: Labeln, Herkunfts-Check, Metadaten-Export. Budget ≈ 5 $ einmalig. |
| v2.1 | 2026-07-05 | Phase 0 umgesetzt: Name **Benti**, Paywall-Code entfernt (−484 Zeilen), EU-Icons integriert, Clipboard-Bug gefixt, manifest v0.3.0, README neu. Code-Stand-Doku an echte Beta angepasst (Side Panel, Batch, Persistenz). |
| v2.2 | 2026-07-07 | Vorbereitungs-Abschluss: `docs/`-Planungspaket (Backlog, Tech-Spec, Store-Listing, Privacy, Demo-Pitch), EU-Icon-Dateinamen normalisiert, C2PA-Bibliothek festgelegt (@contentauth/c2pa-web inline, gevendort). Alle Phasen 1–4 sind implementierungsbereit. |
| v2.3 | 2026-07-07 | **Umbenennung zu „Benti"** (vorher Benti50Act). Drei Innovationen eingeplant: Compliance-Protokoll (Modul 5 / EPIC 5), Team-Presets (Modul 6 / EPIC 6), Smart-Label-Vorschlag (US-2.4). TECH-SPEC um §8–§10 erweitert, Roadmap um Phasen 2b/3b. |
| v2.4 | 2026-07-07 | Backlog-Review mit Andreas: Disclosure-Schnipsel (US-1.5), Vorher/Nachher (US-1.6), Onboarding (US-1.7), **WYSIWYG-Vorschau + object-fit-Fix** (US-1.8), **Ausgabeziel-Presets + Lesbarkeits-Guard** (US-1.9), Export-Formatauswahl (US-3.5), **SVG-Workflow** (US-3.6). Neue Phase 1b; TECH-SPEC §11–§13; Rechtsklick-Integration in Icebox. |
| v2.5 | 2026-07-07 | Risiko-Review eingearbeitet: **Metadaten-Erhalt** (US-3.7, TECH-SPEC §14), Social-Media-Metadaten-Stripping als dokumentierte Grenze, SVG-Sicherheit v1 = Ablehnen statt Sanitizen, Upscale-Wording-Story (US-1.10), **Demo-MVP eingefroren** (EPIC 1 + US-1.8). EU-Icon-Nutzung verifiziert: frei, ohne Attribution; kein CoP-Adhärenz-Signal geben. Kontakt-Mail: benti.labs@gmail.com (von Andreas kontrolliert; 13.11. ersetzt die frühere Adresse). |
| v2.6 | 2026-07-08 | **Phase 1 umgesetzt** (US-1.1–1.3): Label-Typ-Auswahl, EU-Icons als Default-Presets mit Auto-Farbe/-Transparenz, deutscher Zusatztext (US-1.3 angepasst: EU-Icons enthalten bereits Text). UI-Framing von „Wasserzeichen" zu „Kennzeichnung". Download heißt benti_labeled.png / benti_*. Abnahme + US-1.4-Tests offen. |
| v2.7 | 2026-07-08 | Feedback-Runde Andreas: **Icon-Stil-Umschalter** („Label mit Text" / „Nur AI-Symbol" → Basis-Icon jetzt nutzbar, TECH-SPEC §3 angepasst), Zusatztext als fester Block UNTER dem Label (nie mehr darüber) + dynamische Toggle-Beschriftung, **höhenbasierte Größenlogik** (3–12 % von √(W·H), Default 5 % — konsistent über Seitenverhältnisse), Canvas-Kontext mit willReadFrequently (Chrome-Warnung behoben). |
| v2.8 | 2026-07-08 | **US-1.8 vorgezogen & umgesetzt: Live-WYSIWYG-Vorschau** — gemeinsame Layout-Funktion `computeLabelLayout()` für Export UND Vorschau (§11-Geometrie gegen Letterbox-Versatz); Vorschau folgt live allen Reglern inkl. manueller Position. Zusatztext-Clipping behoben (Block-Breite misst Textbreite mit). Bugfix: Zonen-Rahmen verschwindet beim Wechsel auf Manuell. Ein gemeinsamer Canvas-Kontext (hiddenCtx). |
| v2.9 | 2026-07-08 | Feedback-Runde 3: **KI-Automatik wählt nur noch die 4 Ecken** (Mitte bleibt manuell möglich), Status nennt Ecken beim Namen. Alter Drittel-Zonen-Rahmen komplett ersetzt durch **engen gestrichelten Rahmen um den Label-Block**. **Batch-Bildnavigation** (◀ 2/5 ▶ in der Vorschau). Panel-Layout: max-width 420 aufgehoben → UI nutzt bis 560 px, Vorschau bis 340 px hoch, Resize-Listener hält Overlay synchron. |
| v3.0 | 2026-07-09 | **Phase 1b komplett.** Fixes: Vorschau-Rahmen wird aufs sichtbare Bild geclampt; **Positions-Einstellungen gelten pro Bild im Batch** (imageOverrides, beim Blättern und Verarbeiten angewendet). Neu: **Ausgabeziel-Presets + Lesbarkeits-Guard** (US-1.9), **Disclosure-Schnipsel** Alt-/Social-Text (US-1.5), **Vorher/Nachher halten** (US-1.6), **Onboarding-Karte + ?-Button** (US-1.7). |
| v3.1 | 2026-07-13 | **Phase 2 komplett: Herkunfts-Check.** C2PA-Lesen lokal via gevendorter @contentauth/c2pa-web 0.12.1 (workerSrc gegen MV3-CSP, wasm-unsafe-eval im Manifest, v0.5.0). Eigener XMP-Parser (PNG/JPEG/WebP). Status-Karte mit ehrlicher Sprache inkl. Signatur-ungültig- und Trust-Hinweis. **Smart-Label-Vorschlag** + Batch-Zusammenfassung (US-2.1–2.4). |
| v3.2 | 2026-07-14 | **Fix: C2PA-Worker-Bug** — Bibliothek erlaubte nur https:-Worker; gepatcht für chrome-extension: (dokumentiert in libs/c2pa/PATCHES.md, bei Lib-Updates erneut anwenden!). UX: „Original zeigen" als Pill in der Vorschau (unten rechts, Bild bleibt beim Halten sichtbar), **✕-Button zum Bild-Entfernen jederzeit** (vorher erst nach Anwenden), Copy-Buttons zeigen den kopierten Text im Status + klarer differenzierte Texte. |
| v3.3 | 2026-07-14 | **Phase 2b komplett: Compliance-Protokoll** (US-5.1–5.3): lokales Audit-Log mit SHA-256 (Original + gelabelte Datei via finalBytes aus insertPHYsChunk), Toggle, CSV-Export, Ansicht, Löschen. Batch-✕: **✕ entfernt nur das angezeigte Bild**, neuer „Alle ✕"-Button leert den Batch; Provenance-Cache wird mitgepflegt. KI-Zone-Badge entfernt (redundant). Neue **Feintuning-Liste** im BACKLOG (Original-Pill-Affordance, Original-Vergleich im Batch). |
| v3.4 | 2026-07-14 | **Phase 3 Kern: Maschinenlesbare Kennzeichnung.** XMP-Paket (IPTC DigitalSourceType je Label-Typ) bei PNG als iTXt-Chunk (US-3.1), bei JPEG als APP1-Segment (US-3.2); vorhandene XMP-Pakete werden ersetzt. **Export-Formatauswahl** PNG/JPEG/WebP + Qualitäts-Slider (US-3.5, WebP ehrlich ohne XMP, DPI nur bei PNG). C2PA-Invalidierungs-Hinweis (US-3.4). Audit-CSV mit Icon-Spalte. Datei umbenannt: Benti_Masterprompt.md (durch Andreas); „Its me.md" lokal, per .gitignore vom öffentlichen Repo ausgeschlossen. Offen: US-3.3-Roundtrip-Test, SVG (3.6), Metadaten-Erhalt (3.7). |
| v3.5 | 2026-07-14 | US-3.3-Roundtrip von Andreas bestanden ✅ (XMP-Kreis geschlossen). **Fix Smart-Label-Hinweis:** reagiert jetzt live auf manuelle Label-Wahl (drei klare Zustände: automatisch gesetzt / passt / weicht ab — Nutzerwahl bleibt bestehen); vorher blieb veralteter Text stehen. **Phase 3b komplett: Team-Presets** (US-6.1–6.3): benti-preset.json Export/Import mit Validierung, eingebettetem Firmenlogo und Policy-Sperre. Offen: SVG (3.6), Metadaten-Erhalt (3.7), Feintuning-Liste, Phase 4. |
| v3.6 | 2026-07-17 | **Metadaten-Erhalt implementiert** (US-3.7, TECH-SPEC §14): EXIF/XMP/PNG-Textchunks werden aus den Original-Bytes extrahiert und in die Exportdatei re-inseriert statt vom Canvas-Export verworfen zu werden; XMP wird gemerged (Copyright/Credit bleiben erhalten), nie ersetzt; EXIF-Orientation wird vor dem Re-Insert neutralisiert (Canvas brennt die Drehung sonst doppelt ein); Statuszeile zeigt, was übernommen wurde bzw. bei WebP/Formatwechsel entfällt. Abweichung von der Spec: bei Formatwechsel wird das komplette Original-XMP gemerged statt nur aus Kernfeldern neu aufgebaut (bewusst — erhält mehr). Roundtrip-Selbsttest durch Andreas noch offen. Offen: SVG (3.6), Feintuning-Liste, Phase 4. |
| v3.7 | 2026-07-17 | **US-3.7-Roundtrip von Andreas bestanden** ✅: Hochkant-Handyfoto (EXIF) gelabelt → JPEG erhält EXIF/Copyright, Bild bleibt korrekt orientiert (Orientation-Neutralisierung greift), WebP-Hinweis ehrlich. **Strategie-Review mit Andreas:** Ausrichtung ist eine *öffentliche* kostenlose Extension (nicht nur firmenintern) → Team-Presets (US-6.1–6.3) stehen zur Streichung (Enterprise-Feature ohne Nutzen für Solo-Öffentlichkeit); UI soll per Progressive Disclosure verschlankt werden (Kern sichtbar, Erweitertes einklappen) ohne Feature-Verlust; Bild-Nachladen-Bug (handleFiles ersetzt statt anzuhängen) zu fixen. US-3.6 (SVG) ist NICHT launch-blockierend (Upload akzeptiert eh kein SVG). |
| v3.8 | 2026-07-17 | **UI-Verschlankung (Progressive Disclosure), Mockup von Andreas abgenommen.** Drei self-contained Blöcke in einklappbare `<details class="acc">`-Akkordeons gewickelt: „⚙️ Position & Feintuning" (Position + Saliency), „📐 Export & Format" (Exportauflösung/DPI), „🧾 Compliance-Protokoll". Alle starten ZU, Offen/Zu-Zustand pro Nutzer in chrome.storage (`benti_accordions`). Kern bleibt sichtbar: Label-Typ, Kennzeichnung (Logo/Text + Größe + Deckkraft), Anwenden, Download. Bewusste Abweichung vom Mockup: Position/Export bleiben ÜBER dem Anwenden-Button (man konfiguriert vor dem Anwenden), nur das Protokoll sitzt unten. Kein Feature entfernt. |
| v3.9 | 2026-07-17 | **Feedback-Runde Andreas zum neuen UI (3 Fixes):** ① Deutscher Zusatztext-Toggle aus dem sichtbaren EU-Label-Bereich ins „Position & Feintuning"-Akkordeon verschoben (deTextRow, nur im EU-Label-Modus sichtbar via updateDeTextRow). ② Qualitäts-Prozent-Slider durch drei laienverständliche Stufen ersetzt: 📦 Kleine Datei (75) · ⚖️ Ausgewogen (90, Default) · ✨ Maximal (98) + erklärender Hinweis; alte gespeicherte Werte werden auf die nächste Stufe gerundet. ③ Compliance-Protokoll-Akkordeon zeigt im ZUGEKLAPPTEN Zustand ein Live-Badge „✓ aktiv · n Einträge" (accAuditSub in updateAuditUI) — Protokollierung ist ohnehin ab Werk an, jetzt sieht man es schon vor der ersten Kennzeichnung. ④ „Original zeigen" fehlt im Batch: war bereits in docs/BACKLOG.md Feintuning-Liste protokolliert (14.07.), kein neuer Eintrag nötig. |
| v4.0 | 2026-07-17 | **Fix: Bild nachträglich hinzufügen (Schritt B).** `handleFiles` überschrieb bisher immer `currentFiles` — ein zweites Bild nach dem ersten ersetzte es, statt es zu ergänzen. Jetzt: bei bereits geladenen Bildern werden neue Dateien angehängt (Duplikat-Filter über Name+Größe), imageOverrides/provResults-Arrays entsprechend erweitert, die Vorschau springt aufs erste neu hinzugekommene Bild. Zusätzlich: Da `uploadZone` nach dem ersten Bild versteckt wird (nur Strg+V blieb bisher als Nachlade-Weg), jetzt auch Drag & Drop direkt auf `previewWrap` aktiviert (mit eigenem `.drag-over`-Hover-Stil) — zwei funktionierende Wege, weitere Bilder nachzuladen. |
| v4.1 | 2026-07-17 | **Rename final abgeschlossen + Doku-Aufräumung.** Andreas hat Projektordner (`WatermarkAI` → `Benti`), Haupt-HTML (`Benti_MVP.html`) und Extension-Icons umbenannt/ausgetauscht; Chrome-Fehler „File path cannot be resolved" beim Neuladen war reines Chrome-Verhalten (merkt sich alten absoluten Pfad bei „Entpackt geladen"), kein Code-Bug — behoben durch Extension in Chrome neu laden. Alte WatermarkAI-Icon-Backups gelöscht. Restliche WatermarkAI-Relikte entfernt: `service-worker.js`-Logs/Kommentar, Datenschutz-URL in `PRIVACY.md`/`STORE-LISTING.md`, veraltete Pending-Hinweise im Masterprompt. `STORE-LISTING.md`: „(in Entwicklung)"-Zusatz beim fertigen Compliance-Protokoll entfernt. **`README.md` überarbeitet:** fertige Features (Herkunfts-Check, XMP-Kennzeichnung, Compliance-Protokoll, Ausgabeziel-Presets, Formatauswahl) aus „Geplant" in „Features" verschoben; **Team-Presets-Erwähnung entfernt** (Feature wurde am 17.07. bewusst gestrichen, stand aber noch als „geplant" in der README). **Neuer Haftungsausschluss-Satz** (Andreas' Wunsch) in README + Store-Listing ergänzt: Anbieter übernimmt keine Gewähr für vollständige Art.-50-Konformität und keine Pflicht zur laufenden Anpassung an Rechtsänderungen — Prüfung obliegt der/dem Nutzer:in. Hinweis: Textvorschlag ist keine geprüfte Rechtsberatung; vor offiziellem Firmeneinsatz idealerweise durch Rechts-/Compliance-Abteilung gegenlesen lassen. |
| v4.2 | 2026-07-18 | **Drei Bugs aus Andreas' Testrunde behoben.** ① Zwei identische Bilder beim allerersten Upload (kein bereits geladenes Bild vorhanden) wurden unbemerkt doppelt in den Batch übernommen, da die Duplikat-Prüfung aus v4.0 nur gegen bereits geladene `currentFiles` lief, nicht innerhalb der neuen Auswahl selbst — `handleFiles` dedupliziert jetzt in beide Richtungen. ② Race Condition beim schnellen Batch-Wechsel: `processFileForPreview` (FileReader → Image-Decode) und `runAIAnalysis` (500-ms-Zonenanalyse) hatten keine Überholungs-Absicherung — bei schnellem Vor/Zurück-Klicken konnte ein länger laufender älterer Ladevorgang einen bereits aktuelleren überschreiben ("Bild bleibt hängen"). Neuer Generation-Zähler `previewLoadRun`: veraltete Callbacks erkennen sich selbst und brechen ab. ③ **Ursache für "Herkunfts-Check funktioniert mal, 2 Minuten später mit denselben Bildern nicht mehr":** `ensureC2pa()` cachte das SDK-Init-Promise dauerhaft, auch im rejected-Zustand — schlug die ~8-MB-WASM-Initialisierung bei einem 18-Bilder-Batch einmal fehl (z. B. Speicherdruck), blieb der Herkunfts-Check für den Rest der Sitzung kaputt, bis die Extension neu geladen wurde. Jetzt wird das Promise bei Fehlschlag zurückgesetzt, sodass der nächste Aufruf neu initialisiert. Kein reines "Performance"-Problem, sondern ein klassischer Cache-Poisoning-Bug. |
| v4.4 | 2026-07-18 | **UI-Redesign „Trust/Clarity" (Mockup-Entscheidung Andreas: Indigo/Lila bleibt Markenfarbe).** Komplettes CSS auf **Design-Tokens** umgestellt (`:root`-Variablen statt dutzendfach wiederholter Hexwerte): **helles Theme ist neuer Default** (kühles Weiß, Lavendel-Flächen, Primär #554BE0 = AA-kontrastfähiges Indigo), **Dunkel-Variante** über `[data-theme="dark"]` (verfeinertes Indigo-Dunkel, Primär #8B84FF), umschaltbar per **Sonne/Mond-Toggle im Header**; Wahl wird in den Settings persistiert (Default hell). Typo vergrößert (Basis 13,5px, Kleinsttexte angehoben), Verlauf nur noch an Signaturstellen (Wortmarke, CTA, Onboarding-Button), Akkordeon-Titel ohne Uppercase, Fokus-Ringe (`:focus-visible`). **Alle UI-Emojis durch Inline-SVG-Icons ersetzt** (Upload, Sektionen, Akkordeons, Download/Copy/Audit-Buttons, Auge, Logo-Platzhalter); Status-/Feedbacktexte nutzen schlichte Unicode-Zeichen (✓/⚠/✕) statt Emoji — nur der Social-Disclosure-Text behält bewusst sein 🤖 (Clipboard-Inhalt, kein UI). Redundante Innen-Überschriften in den Akkordeons entfernt. Audit-Badge im Summary jetzt grün gestylt, mit grauer „pausiert"-Variante (`.off`). Logo-`mix-blend-mode` themenabhängig (hell: normal, dunkel: lighten). Copy-Buttons und „Neuer Upload" erhalten ihre SVGs über innerHTML-Restore. manifest **v0.6.0**. Alle IDs/Klassen/Display-Defaults beibehalten — keine Logik-Änderung an Analyse/Export. Abnahme durch Andreas offen (Extension neu laden). |
| v4.3 | 2026-07-18 | **Testrunde Andreas bestätigt Fixes aus v4.2** (Batch-Switching + Herkunfts-Check jetzt stabil bei 18 Bildern). Duplikat-Fix bewusst nicht auf Inhalts-Hash erweitert: Windows erlaubt zwei Dateien mit identischem Namen im selben Ordner ohnehin nicht, ein "versehentlich doppelt gelabeltes" Bild ist kein Problem, das eine Lösung braucht. **Neuer Fix: ✕ / Alle ✕ / Batch-Badge verdeckten das Label in den oberen Bildecken.** Waren als `position:absolute`-Overlays exakt in den beiden oberen Ecken der Bildvorschau platziert – kollidierten dadurch mit KI-Automatik-Labels, die ebenfalls in den 4 Bildecken landen. Jetzt eigene `previewToolbar`-Zeile OBERHALB der Bildvorschau (normaler Textfluss statt Overlay), Badge-Fix-Positionierung entfernt, Buttons per `margin-left:auto` weiterhin rechtsbündig. |

---

## 📝 HINWEISE FÜR DIE NUTZUNG

1. **Diesen Masterprompt** zusammen mit `Benti_MVP.html` + `app.js` als Wissen in jede neue Session geben.
2. **Aufgabe benennen:** z. B. "Starte Phase 1" oder "Implementiere US-2.1" — Stories mit Akzeptanzkriterien stehen in `docs/BACKLOG.md`, alle technischen Vorklärungen in `docs/TECH-SPEC.md`.
3. **Nach jeder Session:** Bei grundlegenden Änderungen den Masterprompt aktualisieren lassen.
4. **Versionierung:** Datum und Änderungen im Versions-Log festhalten.
