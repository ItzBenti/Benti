# Marketing- & Store-Assets

Fertige Grafiken für die Chrome-Web-Store-Einreichung (Dark-Design).

## Store-Screenshots (1280 × 800, PNG)
| Datei | Zeigt |
|---|---|
| `store-1-kennzeichnen.png` | Kernnutzen: Bild geladen + EU-Label-Vorschau + Herkunfts-Check |
| `store-2-herkunft.png` | Automatische KI-Herkunftserkennung („signiert von OpenAI OpCo, LLC") |
| `store-3-formate.png` | Ergebnis mit sichtbarem EU-Label + Formate/Metadaten/Protokoll |

**Neu erzeugen** (13.11.2026 eingeführt): Texte in `quelle/store-vorlage.html` ändern, dann
`python docs/marketing/quelle/render-store.py` – braucht nur Python + Edge/Chrome.
`quelle/panel-oben.png` und `quelle/panel-herkunft.png` sind echte Aufnahmen der
Extension (440 px Side-Panel-Breite, 2-fach) mit echtem C2PA-Fund; nach UI-Änderungen neu aufnehmen.
Texte bewusst ohne Fachbegriffe (kein C2PA/XMP/IPTC/WYSIWYG) – Zielgruppe sind Nicht-Techniker.

## Weitere Assets
| Datei | Zweck |
|---|---|
| `promo-440x280.png` | Kleine Promo-Kachel (empfohlen) |
| `beispiel-gekennzeichnet.png` | Beispiel-Ergebnis (Wohnzimmer, EU-Label) – frei verwendbar |
| `Wohnzimmer GPT.png`, `Schlafzimmer ChatGPT.png`, `ChatGPT Image ….png` | Original-KI-Bilder mit intakten C2PA-Metadaten (Quellmaterial) |

## Hinweise
- **Store-Icon** (128×128) ist bereits in `icons/icon128.png`.
- Der C2PA-Nachweis in den Screenshots ist die **echte** Ausgabe der Extension (nicht nachgestellt).
- Motiv: `Wohnzimmer GPT.png` (Original mit intakten C2PA-Metadaten).
