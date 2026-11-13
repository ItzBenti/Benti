# Prototyp: Robustes unsichtbares Wasserzeichen (Ebene 3)

**Status:** ergebnisoffener Prototyp, **nicht** in die Extension integriert. Dient
der Entscheidung, ob/wie ein resize-überlebendes Wasserzeichen gebaut wird
(siehe `docs/downscale-robustness.md`).

## Was er macht

Bettet eine 16-Bit-Kennung (Platzhalter für „KI-generiert") **blind** in ein Bild
ein und liest sie ohne Originalbild wieder aus – über alle üblichen Störungen, die
im Agentur-/Typenplan-/Mobile-Workflow auftreten.

- **Verfahren:** 8×8-Block-DCT (wie JPEG), ein mittelfrequenter Koeffizient je Block
  trägt 1 Bit über **QIM** (Quantisierungs-Parität, Schrittweite Δ).
- **Redundanz:** Die 16 Bit werden über alle Blöcke wiederholt gestreut, Auslesen per
  **Mehrheitsentscheid**.
- **Störungen** (echt, über Chromium-Canvas): JPEG-Recompress (q85/q60), Downscale auf
  75 %/50 % mit Resync (zurück auf Nominalgröße), Downscale + JPEG kombiniert, sowie
  Downscale **ohne** Resync (Detektion bei Empfangsgröße).

## Ausführen

```bash
# aus dem Repo-Root, Chromium ist vorinstalliert
ln -sfn /opt/node22/lib/node_modules node_modules
node prototype/invisible-watermark/run.mjs
rm -f node_modules
```

## Messergebnis (Δ = QIM-Schrittweite; % = Block-Bitfehlerrate; ✓ = 16-Bit voll erkannt)

| Bild   | Δ  | PSNR | clean | jpeg85 | jpeg60 | ↓75 %→↑ | ↓50 %→↑ | ↓50 %+jpeg75 | ↓50 % ohne Resync |
|--------|----|------|-------|--------|--------|---------|---------|--------------|-------------------|
| glatt  | 12 | 46.6 | ✓ 0%  | ✓ 0%   | ✓ 0%   | ✓ 0%    | ✓ 5%    | ✓ 10%        | ✗ 56%             |
| glatt  | 24 | 41.3 | ✓ 0%  | ✓ 22%  | ✗ 56%  | ✓ 0%    | ✓ 2%    | ✗ 56%        | ✗ 56%             |
| textur | 12 | 49.0 | ✓ 0%  | ✓ 36%  | ✓ 33%  | ✓ 10%   | ✓ 31%   | ✗ 44%        | ✗ 48%             |
| textur | 24 | 43.0 | ✓ 0%  | ✓ 18%  | ✗ 30%  | ✓ 0%    | ✓ 10%   | ✗ 39%        | ✗ 55%             |
| formen | 12 | 47.0 | ✓ 0%  | ✓ 14%  | ✓ 12%  | ✓ 7%    | ✓ 16%   | ✗ 31%        | ✗ 56%             |
| formen | 24 | 41.6 | ✓ 0%  | ✓ 15%  | ✗ 49%  | ✓ 1%    | ✓ 5%    | ✗ 52%        | ✗ 55%             |

## Erkenntnisse

1. **Machbar im Prinzip.** Sauber eingebettet ist die Kennung unsichtbar
   (PSNR ≈ 41–49 dB) und wird fehlerfrei ausgelesen. JPEG-Recompress und Downscale
   **mit Resync** übersteht die Redundanz zuverlässig – bis 50 % Verkleinerung.
2. **Das Kernproblem ist die Synchronisation, nicht die Einbettung.** Wird bei
   Empfangsgröße detektiert (**ohne Resync**), liegt die Bitfehlerrate bei ~50 %
   (Zufall): Nach beliebiger Skalierung passt das 8×8-Blockraster nicht mehr zum
   eingebetteten Raster. Genau das ist der reale Agentur-Fall (die Datei *bleibt*
   klein). Ein produktives Wasserzeichen braucht daher **Resynchronisation**
   (Sync-Template, Autokorrelations-Peaks oder ein skaleninvarianter Transform –
   z. B. Fourier-Mellin/log-polar), nicht nur DCT-QIM.
3. **Δ nicht einfach hochdrehen.** Größeres Δ = robuster gegen Rauschen, aber
   sichtbarer **und** empfindlicher gegen JPEG (die eigene Quantisierung des Codecs
   kollidiert mit der QIM-Parität → mehrere ✗ bei Δ=24). Δ muss zur JPEG-Qualität
   passen; besser adaptiv je Block.
4. **Redundanz allein reicht nicht für kombinierte Störungen.** Downscale **und**
   Recompress zusammen bricht der reine Mehrheitsentscheid oft ein → echte
   Fehlerkorrektur (Reed-Solomon o. ä.) statt simpler Wiederholung nötig.

## Empfehlung für die nächste Iteration

- **Zuerst die Synchronisation lösen** (der eigentliche Blocker), z. B. Sync-Template
  + Detektion über Skalen-Suche, oder Wechsel in eine skaleninvariante Domäne.
- **Reed-Solomon-ECC** statt Wiederholungscode.
- **Adaptives Δ** an lokale Textur/JPEG-Qualität koppeln.
- Parallel die **Produktfrage** klären (offen, s. `docs/downscale-robustness.md`):
  Braucht Benti einen **„Prüfen"-Modus**? Ohne Detektor im Produkt ist die
  Einbettung folgenlos. Und: eigenes Schema vs. Anlehnung an einen Standard
  (C2PA soft binding) – Interoperabilität spricht klar für den Standardbezug.

> Fazit: Ein eingebranntes Label (Ebene 1+2) bleibt die primäre, rechtlich
> geforderte Kennzeichnung. Das unsichtbare Wasserzeichen ist die Ergänzung für den
> Fall, dass das sichtbare Label wegskaliert wird – technisch machbar, aber der
> Aufwand steckt in Synchronisation + ECC, nicht im Grundverfahren.
