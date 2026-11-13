#!/usr/bin/env python3
"""Packt Benti als Chrome-Web-Store-taugliches ZIP (US-4.1).

Plattformunabhaengig (Windows/macOS/Linux), braucht nur Python 3.
Enthaelt nur, was die Extension zur Laufzeit braucht - Doku, Tests, Prototyp,
Web-App-Einstieg und Repo-Interna bleiben aussen vor.

Aufruf (aus dem Repo-Root):  python scripts/build-extension.py
"""
import json
import os
import sys
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'benti-extension.zip')

# Von der Extension benoetigte Dateien/Ordner.
# assets/eu-icons/svg wird vom SVG-Workflow (US-3.6) zur Laufzeit geladen.
INCLUDE = [
    'LICENSE',          # MIT-Hinweis muss mit jeder Kopie mitgeliefert werden
    'manifest.json',
    'service-worker.js',
    'Benti_MVP.html',
    'app.js',
    'icons',
    'assets/eu-icons/png',
    'assets/eu-icons/svg',
    'libs',
]
EXCLUDE_NAMES = {'.DS_Store', 'PATCHES.md', 'Thumbs.db'}
EXCLUDE_SUFFIXES = ('.d.ts',)


def files_for(rel):
    path = os.path.join(ROOT, rel)
    if os.path.isfile(path):
        yield rel
        return
    if not os.path.isdir(path):
        sys.exit('FEHLER: fehlt im Repo: ' + rel)
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = sorted(d for d in dirnames if d != '.git')
        for name in sorted(filenames):
            if name in EXCLUDE_NAMES or name.endswith(EXCLUDE_SUFFIXES):
                continue
            yield os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, '/')


def main():
    with open(os.path.join(ROOT, 'manifest.json'), encoding='utf-8') as fh:
        manifest = json.load(fh)

    files = [f for rel in INCLUDE for f in files_for(rel)]

    # Plausibilitaet: alles, was das Manifest referenziert, muss im Paket sein
    referenced = set(manifest.get('icons', {}).values())
    referenced |= set(manifest.get('action', {}).get('default_icon', {}).values())
    referenced.add(manifest['side_panel']['default_path'])
    referenced.add(manifest['background']['service_worker'])
    missing = sorted(r for r in referenced if r not in files)
    if missing:
        sys.exit('FEHLER: vom Manifest referenziert, aber nicht im Paket: ' + ', '.join(missing))

    if os.path.exists(OUT):
        os.remove(OUT)
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            zf.write(os.path.join(ROOT, f), f)

    print('Erstellt: benti-extension.zip (Version %s)' % manifest['version'])
    for f in files:
        print('  ' + f)
    print('\nDateien: %d - Groesse: %.1f MB' % (len(files), os.path.getsize(OUT) / 1e6))
    print('Naechster Schritt (Andreas): im Chrome Web Store Developer Dashboard hochladen.')


if __name__ == '__main__':
    main()
