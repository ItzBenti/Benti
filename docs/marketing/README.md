# Marketing- & Store-Assets

Fertige Grafiken für die Chrome-Web-Store-Einreichung (Dark-Design).

## Store-Screenshots (1280 × 800, PNG)
| Datei | Zeigt |
|---|---|
| `store-1-kennzeichnen.png` | Kernnutzen: Bild geladen + EU-Label-Vorschau + Herkunfts-Check |
| `store-2-herkunft.png` | Automatische C2PA-/KI-Herkunftserkennung („signiert von OpenAI OpCo, LLC") |
| `store-3-formate.png` | Ergebnis mit sichtbarem EU-Label + Formate/Metadaten/Protokoll |

## Weitere Assets
| Datei | Zweck |
|---|---|
| `promo-440x280.png` | Kleine Promo-Kachel (empfohlen) |
| `beispiel-gekennzeichnet.png` | Beispiel-Ergebnis (Wohnzimmer, EU-Label) – frei verwendbar |
| `Wohnzimmer GPT.png`, `Schlafzimmer ChatGPT.png`, `ChatGPT Image ….png` | Original-KI-Bilder mit intakten C2PA-Metadaten (Quellmaterial) |

## Hinweise
- **Store-Icon** (128×128) ist bereits in `icons/icon128.png`.
- Der C2PA-Nachweis in `store-2` gibt die **echte** Extension-Ausgabe wieder
  (die WASM-Engine läuft in der headless-Render-Umgebung nicht, daher wurde der
  bereits verifizierte Text originalgetreu reproduziert).
- Erzeugt mit `scripts/` bzw. dem Render-Setup; Motiv: eines der drei Originale.
