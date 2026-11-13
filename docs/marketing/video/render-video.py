#!/usr/bin/env python3
"""Rendert das Benti-Highlight-Video (1920x1080, 30 fps, H.264-MP4, ohne Ton).

Steuert headless Edge/Chrome per DevTools-Protokoll: fuer jeden Frame wird
render(t) in szenen.html aufgerufen und ein Screenshot an ffmpeg gereicht.

Voraussetzungen: Python 3, Edge oder Chrome, `pip install websocket-client imageio-ffmpeg`
(imageio-ffmpeg bringt ffmpeg mit).

Aufruf (vom Repo-Root):
  python docs/marketing/video/render-video.py                 -> docs/marketing/benti-highlight.mp4
  python docs/marketing/video/render-video.py --stills 2 12 21  -> nur Einzelbilder zur Kontrolle
"""
import argparse, base64, json, os, pathlib, shutil, subprocess, sys, tempfile, time, urllib.request
import websocket
import imageio_ffmpeg

ROOT = pathlib.Path(__file__).resolve().parents[3]
PAGE = 'docs/marketing/video/szenen.html'
FPS, DURATION, W, H = 30, 35.0, 1920, 1080
HTTP_PORT, CDP_PORT = 8767, 9334
BROWSERS = [r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
            r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            shutil.which('chromium') or '', shutil.which('google-chrome') or '']

ap = argparse.ArgumentParser()
ap.add_argument('--stills', nargs='*', type=float, help='nur Einzelbilder zu diesen Sekunden')
ap.add_argument('--out', default=str(ROOT / 'docs/marketing/benti-highlight.mp4'))
args = ap.parse_args()

browser = next((b for b in BROWSERS if b and os.path.exists(b)), None)
if not browser:
    sys.exit('Kein Edge/Chrome gefunden.')

srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(HTTP_PORT), '--bind', '127.0.0.1',
                        '--directory', str(ROOT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
prof = tempfile.mkdtemp(prefix='benti-video-')
br = subprocess.Popen([browser, '--headless=new', f'--remote-debugging-port={CDP_PORT}', f'--user-data-dir={prof}',
                       '--no-first-run', '--hide-scrollbars', f'--window-size={W},{H}', 'about:blank'],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ff = None
try:
    page = None
    for _ in range(100):
        try:
            tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{CDP_PORT}/json'))
            page = next(t for t in tabs if t['type'] == 'page'); break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=120)
    n = [0]

    def cdp(method, **params):
        n[0] += 1
        ws.send(json.dumps({'id': n[0], 'method': method, 'params': params}))
        while True:
            m = json.loads(ws.recv())
            if m.get('id') == n[0]:
                if 'error' in m:
                    raise RuntimeError(m['error'])
                return m.get('result', {})

    def js(expr):
        r = cdp('Runtime.evaluate', expression=expr, awaitPromise=True, returnByValue=True)
        if 'exceptionDetails' in r:
            raise RuntimeError(r['exceptionDetails'])
        return r['result'].get('value')

    cdp('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=1, mobile=False)
    cdp('Page.enable')
    cdp('Page.navigate', url=f'http://127.0.0.1:{HTTP_PORT}/{PAGE}')
    for _ in range(100):
        time.sleep(0.2)
        try:
            if js('typeof window.READY') == 'object':
                break
        except Exception:
            pass
    print('Label-Box:', js('window.READY'))

    def frame(t, fmt='jpeg'):
        js(f'render({t:.4f})')
        r = cdp('Page.captureScreenshot', format=fmt, quality=96) if fmt == 'jpeg' else cdp('Page.captureScreenshot', format=fmt)
        return base64.b64decode(r['data'])

    if args.stills is not None:
        outdir = pathlib.Path(args.out).with_suffix('').parent / 'video-stills'
        outdir.mkdir(parents=True, exist_ok=True)
        for t in args.stills:
            p = outdir / f'still-{t:05.1f}.png'
            p.write_bytes(frame(t, 'png')); print('Standbild', p)
    else:
        ff = subprocess.Popen([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error',
                               '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
                               # Standard-Videobereich (tv/bt709) statt vollem JPEG-Bereich -> korrekte Farben in PowerPoint/Beamer
                               '-vf', 'scale=out_range=tv:out_color_matrix=bt709,format=yuv420p',
                               '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
                               '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
                               '-movflags', '+faststart', args.out], stdin=subprocess.PIPE)
        total = int(DURATION * FPS)
        t0 = time.time()
        for i in range(total):
            ff.stdin.write(frame(i / FPS))
            if i % 150 == 0:
                print(f'  Frame {i}/{total}  ({time.time() - t0:.0f} s)', flush=True)
        ff.stdin.close(); ff.wait()
        print('Fertig:', args.out, f'{os.path.getsize(args.out) / 1e6:.1f} MB')
    ws.close()
finally:
    if ff and ff.poll() is None:
        ff.kill()
    # Browser sauber per DevTools schliessen: unter Windows beendet terminate()
    # nur den Starter, der eigentliche Headless-Browser liefe sonst weiter.
    try:
        ver = json.load(urllib.request.urlopen(f'http://127.0.0.1:{CDP_PORT}/json/version', timeout=3))
        bws = websocket.create_connection(ver['webSocketDebuggerUrl'], timeout=5)
        bws.send(json.dumps({'id': 1, 'method': 'Browser.close'})); bws.close()
    except Exception:
        pass
    br.terminate(); srv.terminate()
    time.sleep(0.5)
    shutil.rmtree(prof, ignore_errors=True)
