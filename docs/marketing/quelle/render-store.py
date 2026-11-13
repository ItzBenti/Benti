#!/usr/bin/env python3
"""Rendert die drei Store-Screenshots (1280 x 800) aus store-vorlage.html.

Braucht nur Python und Microsoft Edge oder Google Chrome (headless).
Aufruf (aus diesem Ordner oder vom Repo-Root):  python docs/marketing/quelle/render-store.py

Die Panel-Bilder (panel-oben.png, panel-herkunft.png) sind echte Aufnahmen der
Extension-Oberflaeche (440 px breit, 2x). Nach UI-Aenderungen neu aufnehmen.
"""
import os
import pathlib
import shutil
import subprocess
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent
TEMPLATE = HERE / 'store-vorlage.html'
NAMES = {1: 'store-1-kennzeichnen.png', 2: 'store-2-herkunft.png', 3: 'store-3-formate.png'}
CANDIDATES = [
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    shutil.which('chromium') or '', shutil.which('google-chrome') or '',
]
browser = next((c for c in CANDIDATES if c and os.path.exists(c)), None)
if not browser:
    raise SystemExit('Kein Edge/Chrome gefunden.')

for s, name in NAMES.items():
    # je Bild ein eigenes Profil: ein noch laufender Edge wuerde den Aufruf sonst
    # uebernehmen und keinen Screenshot schreiben (ignore_cleanup_errors: Lock-Datei)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as prof:
        target = OUT / name
        if target.exists():
            target.unlink()
        subprocess.run([browser, '--headless=new', '--hide-scrollbars', '--no-first-run',
                        f'--user-data-dir={prof}', '--force-device-scale-factor=1',
                        '--window-size=1280,800', '--virtual-time-budget=3000',
                        f'--screenshot={target}', TEMPLATE.as_uri() + f'?s={s}'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Edge schreibt die Datei unter Windows teils erst nach dem Rueckkehren
        for _ in range(100):
            if target.exists() and target.stat().st_size > 0:
                break
            time.sleep(0.2)
        else:
            raise SystemExit('Screenshot wurde nicht erzeugt: ' + name)
        time.sleep(0.5)
        print('gerendert', target.relative_to(OUT.parent.parent))
