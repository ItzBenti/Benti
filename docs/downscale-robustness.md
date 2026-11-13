# Robustheit gegen Verkleinerung (Downscaling)

**Problem aus der Praxis:** Ausgangsdateien werden durch Agenturen, in Typenplänen,
in der Mobile-View usw. **nachträglich verkleinert**. Das eingebrannte KI-Label
schrumpft dabei proportional mit und wird teilweise unlesbar – besonders die feine
Textzeile („KI-generiert") und dünne Icon-Kanten.

Das ist keine Fehlfunktion, sondern eine physikalische Grenze eines **Raster-Labels**:
Wird das ganze Bild kleiner gerechnet, wird auch jedes eingebrannte Pixel kleiner.
Vollständig verhindern lässt sich das nicht – aber die Robustheit lässt sich stark
erhöhen. Wir arbeiten mit drei Ebenen.

---

## Ebene 1 – Kontrast-Plakette (umgesetzt)

Eine solide, halbtransparente abgerundete Platte hinter dem Label. Sie ersetzt das
alleinige „Verlassen auf einen weichen Schatten" durch eine **harte Kontrastkante**,
die das Herunterskalieren übersteht – unabhängig vom Bildhintergrund.

- Farbe automatisch nach Zonenhelligkeit: helle Platte auf hellen Zonen (dunkles
  Label), dunkle Platte auf dunklen Zonen.
- Rand (`platePad`) wird beim Anker mit eingeplant, damit die Platte nie über den
  Bildrand ragt.
- Deckkraft koppelt an die Label-Deckkraft, hat aber eine Untergrenze (~0.45), damit
  selbst dezente Labels beim Verkleinern lesbar bleiben.
- Toggle „🛡️ Kontrast-Plakette", Standard **an**.

Code: `computeLabelLayout()` (Plaketten-Geometrie), `generateWatermarkDataUrl()`
(Canvas-Render vor dem Logo), `updateLabelPreview()` (WYSIWYG-Vorschau).

**Verifiziert:** Downscale-Test (2000 px → 1200/600/320 px, anschließend Ausschnitt
vergrößert). Ohne Plakette verschwimmt das schwarze Symbol mit dem Hintergrund; mit
Plakette bleibt es bis 320 px klar abgegrenzt und lesbar.

## Ebene 2 – Downscale-bewusstes Ausgabeziel „Mobile / stark verkleinert" (umgesetzt)

Benti kann nicht wissen, wie klein Dritte später skalieren – deshalb gibt der Nutzer
die **kleinste Anzeigebreite** vor (Ziel „📱 Mobile / stark verkleinert",
`minDisplay: 480`).

- Die Lesbarkeitsprüfung bewertet die Label-Höhe **nach** dem Verkleinern
  (`effectiveLh = lh · minDisplay / exportWidth`), nicht bei Export-Auflösung.
- „Empfehlung anwenden" aktiviert die robusteste Kombination: Plakette an, Wechsel
  auf das kompakte „AI"-Symbol (übersteht Verkleinern deutlich besser als die feine
  Textzeile im vollen Pill) und rechnet die nötige Export-Größe hoch.
- Reicht selbst die Slider-Obergrenze (12 %) nicht, **bleibt die Warnung stehen** –
  ein ehrliches Signal, dass ein eingebranntes Label für diesen Extremfall nicht mehr
  ausreicht und Ebene 3 nötig ist.

Code: `OUTPUT_TARGETS.mobile`, `checkReadability()`, `rwFix`-Handler.

## Ebene 3 – Unsichtbares Wasserzeichen ✅ (v1 umgesetzt 23.07.2026, opt-in „experimentell")

Ein unsichtbares, in die **Pixel** eingebettetes Wasserzeichen. Reine XMP-/C2PA-
**Metadaten** werden beim Re-Export/Screenshot regelmäßig gestrippt – ein
inhaltsbasiertes Wasserzeichen nicht. Genau das ist der häufigste Verlustpfad.

### Was umgesetzt ist
- **Verfahren:** 8×8-Block-DCT, ein mittelfrequenter Koeffizient je Block trägt 1 Bit
  über QIM (Quantisierungs-Parität, Δ=12). Nutzlast = fester **Magic-Prefix** (8 Bit,
  gegen Falschtreffer) + 2 Bit Label-Typ, über alle Blöcke wiederholt gestreut,
  Auslesen per Mehrheitsentscheid. Reines JS (kein WASM nötig; schnell genug).
- **Einbetten:** opt-in Toggle „🔏 Unsichtbares Wasserzeichen (experimentell)"; wird
  auf den finalen Export-Canvas (Raster) angewandt, vor dem Enkodieren.
- **Prüfen-Modus:** Button „Auf unsichtbares Wasserzeichen prüfen" im Herkunfts-Check;
  blinder Detektor mit **Skalen-Suche** (rechnet das Bild testweise auf mutmaßliche
  Originalgrößen zurück, um moderates Verkleinern auszugleichen). Meldet Fund + Typ +
  Konfidenz. Magic-Prefix verhindert Falschtreffer.
- Code in `app.js`: `embedInvisibleWatermark`, `wmEmbedData`, `wmDetectData`,
  `detectInvisibleWatermark`. Tests: `test/watermark.mjs`.

### Ehrlich gemessene Robustheit (Envelope)
| Störung | Ergebnis |
|---|---|
| Metadaten-Strippen (Re-Save, PNG↔, Formatwechsel) | ✅ zuverlässig (Konfidenz ~100 %) |
| JPEG-Recompression (q75–q90) | ✅ zuverlässig |
| „glatte" Verkleinerung (50 %, 80 %) | ⚠️ teils (Skalen-Suche greift) |
| beliebige Verkleinerung (75 %, 66 %, 90 %) | ❌ nicht zuverlässig |
| Verkleinerung **+** JPEG kombiniert | ❌ nicht zuverlässig |
| unmarkiertes Bild | ✅ kein Falschtreffer |

**Kernwert:** überlebt das **Strippen der Metadaten** und Re-Kompression – also den
häufigsten Verlustweg, den XMP/C2PA gerade *nicht* überlebt. **Ehrliche Grenze:**
starke/beliebige Größenänderung übersteht v1 nicht – der Blocker ist die
**Synchronisation** nach dem Skalieren (das Blockraster passt nicht mehr).

### Offene Punkte für v2 (echte Downscale-Robustheit)
- **Synchronisation lösen** (der eigentliche Blocker): Sync-Template /
  Autokorrelations-Peaks oder skaleninvariante Domäne (Fourier-Mellin/log-polar),
  statt Skalen-Suche zu raten.
- **Reed-Solomon-ECC** statt Wiederholungscode (für kombinierte Störungen).
- **Adaptives Δ** an lokale Textur/JPEG-Qualität koppeln.
- **Standardbezug** (C2PA „soft binding") statt Eigenschema, sobald Downscale-fest –
  für externe Prüfbarkeit. (v1 ist bewusst ein Benti-eigenes Schema, weil volles
  C2PA-Soft-Binding Signatur-/Zertifikats-Infrastruktur bräuchte, die Benti als
  *Deployer*-Tool nicht hat.)

### Rechtlicher Anspruch
Art. 50 verlangt eine **wahrnehmbare** Kennzeichnung. Das unsichtbare Wasserzeichen
ist **Ergänzung**, niemals Ersatz für das sichtbare Label.

Der ursprüngliche Mess-Prototyp liegt weiter auf Branch `claude/watermark-prototype`.
