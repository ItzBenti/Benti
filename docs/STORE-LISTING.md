# 🏪 Benti – Chrome Web Store: Listing-Paket
Stand: 2026-11-13 (Funktionsumfang v0.7) · Alle Texte sind einreichfertig formuliert — bei der Einreichung nur noch kopieren.

## Checkliste (in dieser Reihenfolge)

- [ ] Developer-Konto registrieren: https://chrome.google.com/webstore/devconsole — 5 $ einmalig (Andreas, Google-Konto nötig)
- [x] Extension als ZIP packen → **`python scripts/build-extension.py`** (läuft auch unter Windows; alternativ `bash scripts/build-extension.sh`) erzeugt `benti-extension.zip` (nur Laufzeit-Dateien, ohne `docs/`, `.git/`, `test/`, `prototype/`, `index.html`; prüft, dass alle Manifest-Referenzen enthalten sind)
- [ ] Texte aus diesem Dokument einfügen (unten)
- [ ] Grafiken hochladen (Anforderungen unten)
- [ ] Datenschutz-Angaben ausfüllen (unten vorformuliert)
- [ ] Einreichen → Review dauert typisch 1–3 Werktage

## Store-Texte (DE)

**Name:** `Benti – KI-Bilder kennzeichnen (EU AI Act)`

**Kurzbeschreibung (max. 132 Zeichen):**
`KI-generierte Bilder gemäß Art. 50 EU AI Act sichtbar labeln – mit offiziellen EU-Icons. 100 % lokal, ohne Upload.`

**Ausführliche Beschreibung:**
```
Ab dem 2. August 2026 verlangt der EU AI Act (Artikel 50), dass KI-generierte
Inhalte transparent gekennzeichnet werden. Benti macht das für Bilder
einfach: Bild laden, Label-Typ wählen, fertig.

✔ Offizielle EU-Icons ("AI generated" / "AI modified") als eingebaute Vorlagen
✔ Intelligente Positionierung: Das Label landet automatisch dort, wo es lesbar
  ist, aber das Motiv nicht stört
✔ Automatische Schwarz/Weiß-Wahl je nach Bildhelligkeit
✔ Eigenes Logo als Alternative zum EU-Icon
✔ Batch-Verarbeitung für viele Bilder auf einmal
✔ Screenshot direkt mit Strg+V einfügen
✔ Compliance-Protokoll: Jede Kennzeichnung wird lokal dokumentiert und ist
  als CSV exportierbar – der Audit-Nachweis fällt nebenbei ab
✔ Herkunfts-Check: Zeigt beim Laden an, ob ein Bild C2PA Content
  Credentials oder KI-Metadaten trägt – und schlägt den passenden
  Label-Typ automatisch vor
✔ Maschinenlesbar: schreibt beim Export den IPTC-"DigitalSourceType" in
  die Metadaten – vorhandene Angaben wie Copyright und EXIF bleiben erhalten
✔ PNG, JPEG und WebP mit Qualitätsstufen, DPI-Angabe und Ausgabeziel-
  Vorgaben (Social, Web, Print, Mobile) inkl. Lesbarkeits-Prüfung
✔ SVG bleibt Vektor: Das EU-Icon wird als Vektor eingebettet, nichts wird
  gerastert
✔ Eigene Dateinamen-Muster (z. B. {name}_{date}) und frei wählbarer
  Ablageordner
✔ Team-Vorlagen: Einstellungen als Datei exportieren und an Kolleg:innen
  weitergeben – alle kennzeichnen einheitlich
✔ Optional (experimentell): unsichtbares Wasserzeichen, das auch das
  Entfernen der Metadaten übersteht

🔒 Datenschutz per Architektur: Alle Berechnungen laufen lokal in Ihrem
Browser. Kein Bild verlässt jemals Ihren Rechner, kein Konto, keine Werbung,
komplett kostenlos und Open Source (MIT-Lizenz).

Hinweis: Benti unterstützt die sichtbare Kennzeichnung (Deployer-Pflicht
nach Art. 50 Abs. 4). Es ersetzt keine Rechtsberatung und erfüllt keine
Provider-Pflichten (Art. 50 Abs. 2). Der Anbieter übernimmt keine Gewähr
dafür, dass die Nutzung von Benti die Anforderungen des Art. 50 EU AI Act
vollständig erfüllt, und keine Verpflichtung, das Tool fortlaufend an
Änderungen der Rechtslage anzupassen. Die Prüfung der rechtlichen
Korrektheit obliegt stets der Nutzerin bzw. dem Nutzer.
```

**Kategorie:** Produktivität → Tools · **Sprache:** Deutsch

## Grafiken

| Asset | Größe | Pflicht | Plan |
|---|---|---|---|
| Store-Icon | 128×128 PNG | ja | vorhanden: `icons/icon128.png` |
| Screenshots (1–5) | 1280×800 oder 640×400 | mind. 1 | ✅ fertig: `docs/marketing/store-1-kennzeichnen.png`, `store-2-herkunft.png`, `store-3-formate.png` |
| Small Promo Tile | 440×280 | empfohlen | ✅ fertig: `docs/marketing/promo-440x280.png` |

## Datenschutz-Angaben im Dashboard

- **Single purpose:** „Sichtbare Kennzeichnung KI-generierter Bilder gemäß Art. 50 EU AI Act, lokal im Browser."
- **Berechtigungs-Begründungen:**
  - `sidePanel`: „Stellt die Benutzeroberfläche als Chrome-Seitenleiste bereit."
  - `storage`: „Speichert Nutzereinstellungen (z. B. Label-Typ, Deckkraft, eigene Vorlagen) und das optionale Kennzeichnungs-Protokoll lokal im Browser."
  - `downloads`: „Speichert die gekennzeichneten Bilder im Download-Ordner des Nutzers."
- **Remote Code:** „Nein" — alle Skripte und die C2PA-Bibliothek (WebAssembly, daher `wasm-unsafe-eval` in der CSP) sind im Paket enthalten; zur Laufzeit wird nichts nachgeladen.
- **Datenerhebung:** „Keine" (alle Checkboxen für Datenerhebung verneinen — es gibt keinerlei Telemetrie, Analytics oder Netzwerk-Requests)
- **Datenschutzerklärung-URL:** `https://github.com/ItzBenti/Benti/blob/main/docs/PRIVACY.md`
