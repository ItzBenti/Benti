# 🎤 Benti – Demo-Leitfaden für die Firmen-Präsentation
Stand: 2026-07-07 · Dauer: ~10 Min + Demo · Zielgruppe: Team/Management, betroffen von Art. 50 EU AI Act

## Dramaturgie (6 Schritte)

### 1. Der Aufhänger (1 Folie)
„Seit dem 2. August 2026 gilt Artikel 50 des EU AI Act: Wer KI-generierte Inhalte veröffentlicht, muss das transparent machen." → Frage ans Publikum: „Wer von uns hat diesen Monat ein KI-Bild in einer Präsentation, einem Post oder einem Dokument verwendet?"

### 2. Was das Gesetz von UNS verlangt (1 Folie)
- **Provider** (OpenAI, Adobe …): maschinenlesbare Markierung — nicht unser Job
- **Wir als Deployer**: sichtbare Offenlegung bei veröffentlichten KI-Inhalten (Art. 50 Abs. 4)
- Es gibt offizielle EU-Icons dafür (10.06.2026 veröffentlicht) — aber kein Tool im Workflow, das sie anwendet ← **die Lücke**

### 3. Live-Demo (kein Foliensatz — das Tool selbst)
Drehbuch, vorher 2× proben:
1. KI-Bild per **Strg+V** einfügen („direkt aus dem KI-Tool, ohne Datei zu speichern")
2. Label-Typ wählen → EU-Icon erscheint automatisch positioniert („die Analyse meidet das Motiv")
3. Download → fertig gekennzeichnetes Bild zeigen
4. **Batch**: 5 Bilder auf einmal → „skaliert auch für die Kampagne"
5. Falls Phase 2 fertig: Fremdbild laden → Herkunfts-Check zeigt C2PA-Daten, Label-Typ wird automatisch vorgeschlagen
6. Falls Modul 5 fertig: Protokoll als CSV exportieren → „Jede Kennzeichnung wird automatisch dokumentiert — der Audit-Nachweis fällt als Nebenprodukt ab"
7. Falls Modul 6 fertig: Firmen-Preset importieren → „So kennzeichnet das ganze Team identisch — ohne Server, ohne Admin-Aufwand"

### 4. Das Datenschutz-Argument (1 Folie — für IT/Security im Raum)
„Kein Bild verlässt den Rechner. Kein Server, kein Konto, kein Cloud-Dienst. Der Quellcode ist offen einsehbar." → Das beantwortet die DLP-/Datenschutz-Frage, bevor sie gestellt wird.

### 5. Ehrliche Grenzen (1 Folie — macht glaubwürdig!)
- Tool ≠ automatische Compliance: Es unterstützt die sichtbare Kennzeichnung; Prozess-/Rechtsfragen bleiben bei uns
- Erfüllt keine Provider-Pflichten (C2PA-Signierung, unsichtbare Wasserzeichen)
- „Kein Nachweis gefunden" heißt nie „kein KI-Bild"
- Unsichtbare Metadaten überleben Social-Media-Uploads nicht (Plattformen entfernen sie) — auf Social zählt allein das sichtbare Label

### 6. Ask (1 Folie)
Konkret formulieren, z. B.: „Ich möchte das Tool 4 Wochen im Marketing-Team pilotieren. Feedback fließt direkt in die Entwicklung ein. Kosten: keine."

## Vorbereitung
- [ ] 3 Beispielbilder bereitlegen (1 mit Himmel, 1 dunkel, 1 Produktfoto)
- [ ] Extension frisch geladen, Settings zurückgesetzt
- [ ] Fallback-Screenshots, falls Beamer/Chrome zickt
- [ ] Antwort auf die sichere Frage „Was ist mit Texten/Videos?": „Bewusst Bilder zuerst — Text/Video haben andere Kennzeichnungswege; Roadmap-Thema."
- [ ] Antwort auf die Frage „Sollten wir als Firma den Code of Practice unterzeichnen?": „Kann sinnvoll sein — Unterzeichner bekommen Planungssicherheit gegenüber der Aufsicht. Das ist aber eine Entscheidung der Rechtsabteilung auf Unternehmensebene; Benti funktioniert unabhängig davon."
