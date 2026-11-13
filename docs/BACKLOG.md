# 📋 Benti – Product Backlog
Stand: 2026-11-13 · Owner: Andreas · Priorisierung: oben = zuerst

**Definition of Done (gilt für jede Story):**
Funktioniert in der neu geladenen Extension (Side Panel) · keine Konsolen-Fehler · Settings überleben Neustart (sofern relevant) · Masterprompt bei Grundsatzänderungen aktualisiert.

**Empfohlene Umsetzungs-Reihenfolge:** EPIC 1 → EPIC 2 (inkl. US-2.4) → EPIC 5 → EPIC 3 → EPIC 6 → EPIC 4

**🎯 Demo-MVP (eingefroren am 07.07.2026):** Für die Firmen-Demo zählt ausschließlich **EPIC 1 + US-1.8 (WYSIWYG-Vorschau)**. Alles andere ist bewusst „nach der Demo" — neue Ideen landen erst in der Icebox, nicht im Demo-Scope.

---

## EPIC 1: Labeling-UX (Phase 1)

### US-1.1 Label-Typ wählen ✅ (umgesetzt 08.07.2026, Abnahme offen)
**Als** Nutzer **möchte ich** zwischen „Vollständig KI-generiert" und „KI-bearbeitet" wählen, **damit** das korrekte EU-Icon und später der korrekte Metadaten-Wert gesetzt wird.
**Akzeptanzkriterien:**
- [ ] Zwei-Tab-Auswahl oberhalb der Wasserzeichen-Sektion; Default: „Vollständig KI-generiert"
- [ ] Auswahl steuert Icon-Set (`ai-generated_*` vs. `ai-modified_*`, s. TECH-SPEC §3)
- [ ] Auswahl wird in Settings persistiert
- [ ] Auswahl bestimmt den späteren `DigitalSourceType`-Wert (Vorbereitung für US-3.1)

### US-1.2 EU-Icons als eingebaute Presets ✅ (umgesetzt 08.07.2026, Abnahme offen)
**Als** Nutzer **möchte ich** die offiziellen EU-Icons ohne manuellen Upload nutzen, **damit** ich in 3 Klicks ein konformes Label habe.
**Akzeptanzkriterien:**
- [ ] Im Logo-Panel neuer Bereich „EU-Label (empfohlen)" mit Vorschau des aktiven Icons
- [ ] Schwarz/Weiß-Wahl automatisch nach Zonen-Luminanz (vorhandene Logik: `zoneLum > 128` → schwarz)
- [ ] Deckkraft < 75 % → `_50`-Variante verwenden, sonst Vollton (Zuordnung s. TECH-SPEC §3)
- [ ] Eigenes Logo bleibt als zweite Option unverändert erhalten (Dual-Upload)
- [ ] EU-Icon-Modus ist Default für neue Nutzer

### US-1.3 Deutscher Zusatztext zum EU-Label ✅ (angepasst + umgesetzt 08.07.2026)
**Angepasst am 08.07.:** Die offiziellen GENERATED/MODIFIED-Icons enthalten den Text bereits („AI GENERATED" als Pill) — ein zweites Textlabel daneben wäre redundant. Die EU-Nutzertest-Empfehlung „Icon + Text" bezog sich auf das Basis-Icon ohne Text. Daher: optionaler **deutscher** Zusatztext, Default aus.
- [x] Toggle „Deutscher Zusatztext" (Default: aus); Text folgt Label-Typ: „KI-generiert" / „KI-bearbeitet"
- [x] Text unter dem Icon (weicht automatisch nach oben aus, wenn unten kein Platz), Farbe folgt Pill-Farbe
- [x] Schriftgröße skaliert mit Icon-Höhe (Minimum 11 px)

### US-1.4 Regressionstest Bildformate ✅ (automatisiert 23.07.2026 – `test/regression.mjs`, 7/7 bestanden)
- [x] Automatischer Testlauf (Chromium/Playwright) mit: sehr klein (320×240), sehr groß (8200×2000), extrem quer (3:1), extrem hoch (1:3), PNG mit Transparenz, JPEG, WEBP — je: kein JS-Fehler, korrekte Export-Maße, Label im Bild, Download bereit

### US-1.5 Disclosure-Schnipsel 📋 (Innovation) ✅ (umgesetzt 09.07.2026, Abnahme offen)
**Als** Nutzer **möchte ich** nach dem Labeln passende Textbausteine kopieren können, **damit** die Kennzeichnung auch außerhalb des Bildes ankommt (Screenreader lesen kein Icon!).
**Akzeptanzkriterien:**
- [ ] Nach „Anwenden": zwei Copy-Buttons — Alt-Text („KI-generiertes Bild: …") und Social-/Web-Disclosure-Satz („Dieses Bild wurde mit KI erstellt/bearbeitet.")
- [ ] Texte folgen dem Label-Typ aus US-1.1
- [ ] Kopieren via `navigator.clipboard.writeText` + kurzes Bestätigungs-Feedback

### US-1.6 Vorher/Nachher-Vergleich ✅ (umgesetzt 09.07.2026, Abnahme offen)
- [ ] Nach „Anwenden": „Original zeigen"-Button (gedrückt halten) wechselt die Vorschau temporär aufs Original
- [ ] Funktioniert auch nach erneutem Anwenden mit geänderten Einstellungen

### US-1.7 First-Run-Onboarding ✅ (umgesetzt 09.07.2026, Abnahme offen)
- [ ] Beim ersten Start (Flag in Settings): 3-Schritte-Hinweis (Bild laden → Label-Typ wählen → Anwenden & Download)
- [ ] Dauerhaft wegklickbar; erneut aufrufbar über „?"-Symbol im Header
- [ ] Muss spätestens vor dem Firmen-Pilot fertig sein (Kolleg:innen bekommen keine Schulung)

### US-1.8 WYSIWYG-Positions-Vorschau 🎯 ✅ (vorgezogen + umgesetzt 08.07.2026, Abnahme offen)
**Als** Nutzer **möchte ich** vor dem Anwenden exakt sehen, wo und wie groß das Label landet, **damit** ich nicht anhand eines groben Rahmens raten muss.
**Akzeptanzkriterien:**
- [ ] Grober Zonen-Rahmen wird ersetzt durch eine maßstabsgetreue Live-Vorschau des Icons/Texts an der berechneten Position
- [ ] Bugfix: Overlay-Geometrie berücksichtigt `object-fit: contain` (Letterbox) — Vorschau liegt exakt auf dem sichtbaren Bild, kein Überstehen mehr (Berechnung s. TECH-SPEC §11)
- [ ] Vorschau aktualisiert live bei Änderung von Größe, Deckkraft und Position

### US-1.9 Ausgabeziel-Presets + Lesbarkeits-Guard 📐 (Innovation) ✅ (umgesetzt 09.07.2026, Abnahme offen)
**Als** Nutzer **möchte ich** den Einsatzzweck wählen (Social, Web, Präsentation, Print), **damit** das Label in der tatsächlichen Anzeigegröße lesbar bleibt.
**Akzeptanzkriterien:**
- [ ] Auswahl „Ausgabeziel" mit Presets (Größen-Tabelle s. TECH-SPEC §12); steuert relative Label-Größe + Mindest-Pixelhöhe
- [ ] Lesbarkeits-Guard: unterschreitet die berechnete Label-Höhe den Ziel-Schwellwert → Warnung + Ein-Klick-Korrektur („Auf empfohlene Größe setzen")
- [ ] Ausgabeziel ist Teil von `benti-preset.json` (Synergie mit EPIC 6: die Firma legt Kanal-Standards fest)

### US-1.10 Ehrliches Upscale-Wording ✅ (umgesetzt 08.07.2026)
- [x] DPI-Modus „Bild hochskalieren" umtextet: „Größere Pixelmaße (Interpolation) – erzeugt keine neuen Details"; das Versprechen „Mehr Pixel für Druckqualität" entfernt

### US-1.11 Downscale-Robustheit: Kontrast-Plakette + Mobile-Ziel 🛡️ ✅ (umgesetzt 23.07.2026)
**Als** Nutzer **möchte ich**, dass das Label auch dann lesbar bleibt, wenn die Datei nachträglich durch Dritte (Agenturen, Typenpläne, Mobile-View) verkleinert wird.
- [x] Kontrast-Plakette hinter dem Label (solide Platte = harte Kontrastkante), Farbe/Deckkraft nach Zonenhelligkeit; Toggle, Default aus, Auto-AN beim Mobile-Ziel
- [x] Ausgabeziel „Mobile / stark verkleinert" mit downscale-bewusster Lesbarkeitsprüfung (`minDisplay`) statt Bewertung bei Export-Auflösung
- [x] „Empfehlung anwenden" aktiviert robusteste Kombination (Plakette + kompaktes Symbol + Größe)
- [x] Analyse + Ebenen-Konzept dokumentiert in `docs/downscale-robustness.md`; Ebene 3 (unsichtbares Wasserzeichen) als Prototyp auf `claude/watermark-prototype`

### US-1.12 Exakte Ausgabegröße (Pixel) 📐 ✅ (umgesetzt 23.07.2026)
**Als** Nutzer **möchte ich** die finale Pixelgröße vorgeben, **damit** das Label für die Endgröße proportioniert wird und nicht zu klein werden kann.
- [x] Toggle „Exakte Ausgabegröße"; Bild wird zuerst auf die Zielmaße gerechnet, dann das Label gesetzt (resize-then-stamp)
- [x] Breite eingeben, Höhe folgt (Seitenverhältnis-Sperre, lösbar für freie B×H); Höhe passt sich bei Bildwechsel an
- [x] Bei aktiver exakter Größe wird die DPI-Hochskalierung übersprungen; Vorschau + Warnung rechnen mit den Zielmaßen

### US-1.13 Speicherbare Custom-Presets ⭐ ✅ (umgesetzt 23.07.2026)
**Als** Vielnutzer (z. B. oft Mobile-Bilder) **möchte ich** eigene Ausgabegrößen speichern und wiederverwenden.
- [x] „Als Preset speichern" legt aus der aktuellen Ausgabegröße ein benanntes Preset an (Zielbreite + Lesbarkeits-Untergrenze), im Dropdown wählbar, löschbar
- [x] Persistiert in `chrome.storage`; Auswahl aktiviert die exakte Ausgabegröße mit der Preset-Breite

---

## EPIC 2: Herkunfts-Check (Phase 2)

### US-2.1 C2PA-Manifest lesen ✅ (umgesetzt 13.07.2026, Abnahme offen)
**Als** Nutzer **möchte ich** beim Bild-Laden sehen, ob das Bild C2PA Content Credentials trägt, **damit** ich weiß, ob es als KI-generiert ausgewiesen ist.
**Akzeptanzkriterien:**
- [ ] `@contentauth/c2pa-web/inline` gevendort unter `libs/` (kein CDN-Call zur Laufzeit! s. TECH-SPEC §1)
- [ ] Manifest-CSP um `wasm-unsafe-eval` erweitert
- [ ] Anzeige bei Fund: Erzeuger-Tool (claim generator), Aussteller der Signatur, Zeitstempel
- [ ] Prüfung läuft lokal; keine Netzwerk-Requests (Datenschutz-Versprechen!)

### US-2.2 XMP/IPTC-Metadaten lesen ✅ (umgesetzt 13.07.2026: PNG iTXt, JPEG APP1, WebP RIFF)
- [ ] PNG: iTXt/tEXt-Chunks parsen; JPEG: APP1-XMP-Segment parsen (Layouts s. TECH-SPEC §4/§5)
- [ ] Erkennung von `DigitalSourceType` (beide KI-Werte, s. TECH-SPEC §2)

### US-2.3 Status-Anzeige mit ehrlicher Sprache ✅ (umgesetzt 13.07.2026)
**Akzeptanzkriterien:**
- [ ] Genau drei Stati: „✅ C2PA-Herkunftsnachweis gefunden: …" / „ℹ️ KI-Metadaten gefunden: …" / „❓ Kein Herkunftsnachweis gefunden"
- [ ] **Verboten:** jede Formulierung, die „kein Nachweis" als „kein KI-Bild" deutet
- [ ] Tooltip/Info-Text erklärt: Metadaten sind entfernbar, Screenshot genügt

### US-2.4 Smart-Label-Vorschlag ✨ (Innovation) ✅ (umgesetzt 13.07.2026 inkl. Batch-Zusammenfassung)
**Als** Nutzer **möchte ich**, dass Benti mir nach dem Herkunfts-Check automatisch den passenden Label-Typ vorschlägt, **damit** Erkennung und Kennzeichnung ein einziger Arbeitsschritt werden.
**Akzeptanzkriterien:**
- [ ] Fund von KI-Herkunftsdaten → Label-Typ wird vorbelegt (Mapping s. TECH-SPEC §10) + Hinweis „Vorschlag basierend auf Herkunftsdaten des Bildes"
- [ ] Nur Vorschlag, nie stille Automatik: Nutzer kann jederzeit übersteuern
- [ ] Batch: Zusammenfassung vor Start („3 von 5 Bildern tragen KI-Herkunftsdaten")

---

## EPIC 3: Maschinenlesbares Markieren (Phase 3)

### US-3.1 XMP beim PNG-Export einbetten ✅ (umgesetzt 14.07.2026, Abnahme offen)
- [ ] iTXt-Chunk mit XMP-Paket (Template s. TECH-SPEC §2/§4), Wert gemäß Label-Typ aus US-1.1
- [ ] Bestehender pHYs-Code wird wiederverwendet (Chunk-Insertion + CRC32)

### US-3.2 XMP beim JPEG-Export einbetten ✅ (umgesetzt 14.07.2026)
- [ ] JPEG-Export-Option (canvas.toBlob('image/jpeg')) + APP1-XMP-Segment (Layout s. TECH-SPEC §5)

### US-3.3 Roundtrip-Selbsttest 🧪 ✅ (automatisiert 23.07.2026 – `test/roundtrip.mjs`, 4/4 bestanden)
- [x] Exportierte Datei mit Modul 2 (US-2.2) wieder einlesen → Metadaten werden erkannt (PNG + JPEG, beide Label-Typen)

### US-3.4 C2PA-Invalidierungs-Hinweis ✅ (umgesetzt 14.07.2026)
- [ ] Wenn beim Upload C2PA gefunden wurde (US-2.1): Hinweis vor Export, dass die Original-Signatur durch die Bearbeitung ungültig wird

### US-3.5 Export-Formatauswahl ✅ (umgesetzt 14.07.2026; WebP bewusst ohne XMP mit ehrlichem UI-Hinweis)
**Als** Nutzer **möchte ich** das Ausgabeformat wählen, **damit** aus einem 800-KB-JPEG kein 4-MB-PNG wird.
**Akzeptanzkriterien:**
- [ ] Export als PNG, JPEG oder WebP (`canvas.toBlob` + Qualitäts-Slider für JPEG/WebP)
- [ ] XMP-Einbettung je Format: PNG iTXt (§4) / JPEG APP1 (§5); WebP: XMP-Chunk im RIFF-Container — falls unverhältnismäßig aufwendig, ehrlicher Hinweis „WebP-Export ohne Metadaten"
- [ ] Voraussichtliche Dateigröße vor dem Download anzeigen

### US-3.6 SVG-Workflow (vektor-erhaltend) ✒️ ✅ (umgesetzt 23.07.2026 – Einzel + Batch, End-to-End getestet)
**Als** Marketing-Nutzer **möchte ich** SVG-Grafiken labeln, ohne sie zu rastern, **damit** die Vektorqualität für alle Einsatzgrößen erhalten bleibt.
**Akzeptanzkriterien:**
- [x] SVG als Eingabe; für die Positions-Analyse wird offscreen gerastert (SVG in `<img>` → Canvas)
- [x] Ausgabe bleibt SVG: Original + EU-Icon als eingebettetes, self-contained Vektor-Element (`<image>` mit `data:image/svg+xml`) an der berechneten Position, inkl. Kontrast-Plakette/Caption; kein Rastern
- [x] XMP-Kennzeichnung (`DigitalSourceType`) im `<metadata>`-Element des SVG
- [x] Sicherheit (v1 = ablehnen statt reparieren): SVGs mit Skripten, Event-Attributen, `foreignObject`, DTD/Entities oder **externen Referenzen** werden mit verständlicher Meldung abgelehnt (`svgSecurityReject`); Vorschau ausschließlich über `<img>`
- [x] Ehrliche Grenzen: Raster-Input wird nicht zu „Fake-Vektor"-SVG; EPS/AI/PDF im Browser nicht machbar (nicht angenommen); exakte Pixel-Ausgabegröße/DPI gilt nur für Raster
- Tests: `svgSecurityReject` (Skript/extern abgelehnt, sicher akzeptiert), valide Ausgabe mit `<metadata>`+DST+eingebettetem Vektor-Icon, beide Label-Typen, visuell verifiziert

### US-3.7 Metadaten-Erhalt 🛡️ ✅ (umgesetzt 17.07.2026; `extractOriginalMeta` + Re-Insertion PNG/JPEG, `preservedMetaNote`)
**Als** Marketing-Nutzer **möchte ich**, dass vorhandene Bild-Metadaten (Copyright, Fotografen-Credit, EXIF) beim Labeln erhalten bleiben, **damit** die Kennzeichnung die Urheberinformationen **erweitert statt zerstört**.
**Akzeptanzkriterien:**
- [ ] JPEG→JPEG: EXIF- und XMP-APP1-Segmente aus den Original-Bytes in den Export übernehmen (Canvas strippt sie — Re-Insertion nötig, s. TECH-SPEC §14)
- [ ] PNG→PNG: iTXt/tEXt/zTXt- und eXIf-Chunks übernehmen
- [ ] Vorhandenes XMP wird **gemerged** (unser `DigitalSourceType` ergänzt), niemals ersetzt
- [ ] Bei Formatwechsel: Kernfelder (Urheber, Rechte) ins neue XMP übernehmen; sichtbarer Hinweis, was nicht übernommen werden kann

### US-3.8 Unsichtbares Wasserzeichen 🔏 ✅ (v1 umgesetzt 23.07.2026, opt-in „experimentell")
**Als** Nutzer **möchte ich** zusätzlich eine unsichtbare, in die Pixel eingebettete Markierung, **damit** die Kennzeichnung auch das Entfernen der Metadaten übersteht.
- [x] Einbetten (opt-in Toggle): DCT-QIM, Magic-Prefix gegen Falschtreffer, Label-Typ in der Nutzlast; auf dem finalen Raster-Export-Canvas
- [x] „Prüfen"-Modus im Herkunfts-Check: blinder Detektor mit Skalen-Suche, meldet Fund + Typ + Konfidenz
- [x] Ehrliche Robustheit dokumentiert (`docs/downscale-robustness.md`): überlebt Metadaten-Strippen + Re-Kompression, **nicht** zuverlässig bei starker Verkleinerung; kein Ersatz fürs sichtbare Label
- [x] Tests: `test/watermark.mjs` (Einbetten→Detektion, Typ, kein Falschtreffer, Prüfen-Button)
- Offen für v2: Synchronisation (Sync-Template/skaleninvariant) + Reed-Solomon-ECC für echte Downscale-Festigkeit; ggf. C2PA-Soft-Binding-Standardbezug

### US-3.9 Dateiname-Muster & Ablageort 💾 ✅ (umgesetzt 24.07.2026)
**Als** Nutzer **möchte ich** den Dateinamen der gekennzeichneten Bilder frei bestimmen und den Ablageort wählen, **damit** die Assets sinnvoll benannt und abgelegt werden (nicht `benti_*` plain in Downloads).
- [x] Namensschema mit Tokens (IrfanView-artig, lesbare `{…}`-Syntax): `{name}`, `{n}`/`{n:3}`, `{date}`, `{time}`, `{type}`, `{w}`,`{h}`; Freitext bleibt wörtlich; Live-Vorschau; Default `{name}_KI-gek.`
- [x] Gilt für Einzel-, Batch- und SVG-Export; ungültige Zeichen werden bereinigt
- [x] Ablageort: **Downloads-Unterordner** (Pfad im Dateinamen, Tokens erlaubt, z. B. `Benti/{date}`) ODER **frei gewählter Ordner** via File System Access API (Handle in IndexedDB persistiert, Freigabe bleibt bis Widerruf); sauberer Fallback auf Downloads
- [x] Einstellungen persistiert; Tests in `test/naming.mjs`

---

## EPIC 4: Veröffentlichung (Phase 4)

### US-4.1 Chrome Web Store Listing
- [x] Packaging-Skript erzeugt ein store-taugliches ZIP (nur Laufzeit-Dateien; docs/test/prototype/index.html ausgeschlossen) — seit 13.11. `scripts/build-extension.py` (Windows-tauglich, prüft Manifest-Referenzen); `.sh` delegiert dorthin
- [x] **Fix 13.11.:** `assets/eu-icons/svg/` fehlte im ZIP → der SVG-Workflow hätte in der Store-Version kein EU-Icon gesetzt und trotzdem eine „gekennzeichnete" SVG exportiert und protokolliert. Ordner ist jetzt im Paket; zusätzlich bricht der SVG-Export ab, statt eine SVG ohne sichtbares Label auszugeben. Gepacktes ZIP im Browser geprüft: SVG (beide Label-Typen), PNG-Export inkl. DST-Roundtrip + pHYs, keine JS-Fehler; C2PA-Erkennung in der Extension von Andreas bestätigt (13.11.)
- [x] Version 1.0.0 für die Store-Einreichung; Kontakt-Mail in PRIVACY.md auf benti.labs@gmail.com umgestellt
- [x] Store-Texte + Datenschutz-Angaben in docs/STORE-LISTING.md einreichfertig
- [x] Developer-Konto (5 $) registriert
- [x] Screenshots (1280×800) + Promo-Tile (440×280) — fertig in `docs/marketing/`
- [x] Store-Texte 13.11. auf aktuellen Funktionsumfang gebracht (Formate, SVG, Metadaten-Erhalt, Dateinamen, Team-Vorlagen, Wasserzeichen) + Remote-Code-Angabe
- [x] ZIP 1.0.0 hochgeladen, Texte/Grafiken eingefügt, **am 13.11.2026 zur Prüfung eingereicht** (Datennutzung: nichts erfasst; drei Zusicherungen bestätigt)
- [ ] Nach Freigabe: Store-Link in README + Datenschutzerklärung ergänzen
- [ ] Optional: große Werbekachel (1400×560) — nur relevant, falls Google Benti hervorhebt; jederzeit ohne neue Prüfung nachreichbar

### US-4.2 Web-App auf GitHub Pages
- [x] `chrome.*`-Fallbacks (s. TECH-SPEC §6): storage → localStorage (`bentiStore`-Abstraktion), downloads → Anchor (bereits vorhanden), `chrome.runtime`/Manifest-Version abgesichert
- [x] `index.html` als Web-App-Einstieg (leitet auf Benti_MVP.html) — Root-URL funktioniert
- [ ] **[Andreas]** GitHub Pages im Repo aktivieren (Settings → Pages → main branch)
- [x] Datenschutzerklärung (docs/PRIVACY.md) verlinkt — UI-Footer + Store-Listing; 13.11. um Ablageordner-Freigabe ergänzt

### US-4.3 Firmen-Demo
- [ ] Präsentation nach docs/DEMO-PITCH.md vorbereitet; Live-Demo mit 3 Beispielbildern geprobt

---

## EPIC 5: Compliance-Protokoll 🧾 (Innovation — empfohlen direkt nach EPIC 2)

### US-5.1 Kennzeichnungs-Protokoll führen ✅ (umgesetzt 14.07.2026, Abnahme offen)
**Als** Compliance-Verantwortlicher **möchte ich**, dass jede Kennzeichnung automatisch lokal protokolliert wird, **damit** wir die Erfüllung der Art.-50-Pflicht jederzeit belegen können.
**Akzeptanzkriterien:**
- [ ] Pro gelabeltem Bild (auch im Batch) ein Eintrag: Zeitstempel, Dateiname, SHA-256 von Original UND gelabeltem Bild, Label-Typ, Icon-Variante (Datenmodell s. TECH-SPEC §8)
- [ ] Protokollierung per Toggle abschaltbar (Default: an); Speicherung ausschließlich lokal
- [ ] Rotations-Regel ab 10.000 Einträgen mit Export-Hinweis

### US-5.2 Protokoll exportieren ✅ (umgesetzt 14.07.2026)
- [ ] Export als CSV (Excel-tauglich: Semikolon, UTF-8-BOM) über die Einstellungen
- [ ] Dateiname `benti-protokoll_JJJJ-MM-TT.csv`

### US-5.3 Protokoll einsehen & löschen ✅ (umgesetzt 14.07.2026)
- [ ] Einfache Listen-Ansicht (letzte 50 Einträge) + „Alles löschen" mit Bestätigung (DSGVO-freundlich)

---

## EPIC 6: Team-Presets 📦 (Innovation — Firmen-Rollout ohne Server)

### US-6.1 Preset exportieren ✅ (umgesetzt 14.07.2026, Abnahme offen)
**Als** Team-Verantwortlicher **möchte ich** unsere Label-Einstellungen als Datei exportieren, **damit** alle Kolleg:innen identisch kennzeichnen.
**Akzeptanzkriterien:**
- [ ] Export als `benti-preset.json` (Schema s. TECH-SPEC §9), optional mit eingebettetem Firmenlogo
- [ ] Preset-Name + Ersteller werden beim Export abgefragt

### US-6.2 Preset importieren ✅ (umgesetzt 14.07.2026)
- [ ] Import per Datei-Auswahl; Validierung (formatVersion, Feld-Whitelist) mit verständlicher Fehlermeldung
- [ ] Nach Import: Bestätigung + aktiver Preset-Name sichtbar im UI

### US-6.3 Policy-Modus ✅ (umgesetzt 14.07.2026: allowCustomLogo sperrt Eigenes-Logo-Quelle inkl. Tooltip)
- [ ] Preset kann Optionen fixieren (z. B. `allowCustomLogo: false`) → betroffene UI-Bereiche zeigen „Durch Firmen-Preset festgelegt"
- [ ] Ehrlichkeit: Sperre = Konsistenz-Komfort, kein Sicherheitsfeature (Tooltip erklärt das)

---

## 🔧 Feintuning-Liste (aus Andreas' Tests — vor Phase 4 gesammelt abarbeiten)
- **UI-Anordnung überarbeiten:** Buttons und Slider sind mittlerweile sehr vollgepackt → Layout-Review (Gruppierung, ggf. Einklapp-Sektionen, Reihenfolge nach Nutzungshäufigkeit) — Andreas, 14.07. *(25.07. umgesetzt, Abnahme offen: „Kennzeichnung" ist jetzt ein Akkordeon, neues Akkordeon „Größe & Lesbarkeit"; Reihenfolge Label-Typ → Kennzeichnung → Position & Feintuning → Größe & Lesbarkeit → Export & Format)*
- Protokoll-„Anzeigen"-Ansicht: Mehrwert unklar (Andreas, 14.07.) → aufwerten (z. B. Icon/Modus je Zeile, Tages-Gruppierung, klickbare Details) oder entfernen — Entscheidung Andreas *(offen — Entscheidung Andreas)*
- ✅ UI-Klarheit Label-Typ vs. Icon-Stil (23.07.): als Hinweistext ergänzt — **25.07. gekürzt**: die Erklärungsabsätze waren Andreas zu viel Text, Inhalt steckt jetzt in den Tooltips der Tabs
- ✅ „Original zeigen"-Pill (23.07.): Beschriftung „Original (halten)" macht die Halten-Geste selbsterklärend (Emoji 25.07. durch SVG-Icon ersetzt)
- Original-Vergleich funktioniert im Batch nicht (Batch erzeugt keine gelabelte Vorschau pro Bild) → Konzept nötig — 14.07. *(offen)*
- ❌ **Verworfen (25.07.):** „✓ automatisch"-Badges an Auto-Einstellungen + einmaliger Hinweis am Anwenden-Button. War umgesetzt, wurde von Andreas nach Ansicht abgelehnt und zurückgerollt — „zu viel visuelles Rauschen, kein Mehrwert". Ein Badge neben „KI-Automatisch" verdoppelt nur die Aussage des Tab-Namens. Nicht erneut anfassen.
- Onboarding-Reste (aus Produkt-Review 18.07.), beide **nach** Launch:
  - Kennzeichnungs-Block eindampfen: „Nur Text" + „Eigenes Logo" in ein Akkordeon „Andere Kennzeichnungs-Arten" — teilweise durch den Akkordeon-Umbau vom 25.07. erledigt
  - „Sofort-Modus": prominenter Ein-Klick-Button „Mit Empfehlungen kennzeichnen", darunter klein „Anpassen…" — nach Launch bewerten

### Session 25.07.: Oberfläche + Export (Abnahme offen außer wo vermerkt)
- ✅ **abgenommen** — Texte unter Label-Typ/Logo gekürzt; Token-Erklärung beim Namensschema entfernt (steht als Tooltip am Feld), Default `{name}_KI-gek`
- Emojis vollständig durch Inline-SVG im `.ic`-Stil ersetzt (13 Stellen in der UI, dazu die Statusmeldungen in `app.js`); Theme-Umschalter größer (17 px) und farbig — Sonne bernstein, Mond indigo
- **Nebenbefund behoben:** die Bereiche aus US-1.12/1.13/3.8/3.9 hatten noch hartkodierte Dunkel-Farben und waren im hellen Theme unlesbar → auf Design-Tokens umgestellt
- Ausgabeziel: „Präsentation / TV" entfernt, echte Werte im Dropdown (`Label 5 %, min. 24 px`) statt unsichtbarer Vorbelegung
- **US-3.5 Dateigröße nachgezogen** — war als ✅ geführt, existierte im Code aber nicht: die drei Qualitätsstufen zeigen jetzt die real enkodierte Größe
- **DPI jetzt auch für JPEG** (`setJpegDpi`, JFIF-APP0 `units=1` + X/Y-Density) — vorher nur PNG via pHYs; WebP hat kein Dichte-Feld und bleibt außen vor
- **Irreführende Beschriftung korrigiert:** „Nur Metadaten anpassen"/„Bild hochskalieren" → „Pixel behalten"/„Pixel vergrößern". Die DPI-Angabe wurde immer in beiden Modi geschrieben; die Auswahl steuert nur die Pixelmaße
- **Struktur:** vorher steckten Position, Export, Anwenden-Button und Compliance-Protokoll verschachtelt im Kennzeichnungs-Block (fehlendes `</div>`, vom Browser still korrigiert) — jetzt saubere Geschwister unter `main`
- Ausgabeziel/Label-Höhe/Plakette wirken nur im Logo-Modus (`layout.mode === 'logo'`) und blenden sich im Text-Modus aus; „Exakte Ausgabegröße" gilt für beide und bleibt sichtbar

---

## Icebox (bewusst zurückgestellt)
- Rechtsklick-Kontextmenü „Bild mit Benti labeln" — starker Workflow-Gewinn, erfordert aber Website-Berechtigungen und weicht damit das Minimal-Permissions-Argument auf; erst nach Store-Launch neu bewerten
- i18n EN · Kachel-/Diagonal-Wasserzeichen · Provider-Detektions-APIs (Opt-in, sobald verfügbar)
