// US-1.4 – Automatischer Regressionstest über kritische Bildformate/-verhältnisse.
// Lädt Benti als Web-App in Chromium, spielt für jeden Fall ein synthetisches Bild
// ein, wendet die Kennzeichnung an und prüft: kein JS-Fehler, Export-Canvas hat
// die erwarteten Maße, und das Label-Block liegt vollständig im Bild.
//
// Aufruf (aus dem Repo-Root):
//   ln -sfn /opt/node22/lib/node_modules node_modules
//   node test/regression.mjs ; rm -f node_modules
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';

const root = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/Benti_MVP.html'; fs.readFile(path.join(root, f), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, r)); const port = server.address().port;

const CASES = [
  { name: 'winzig 320×240 PNG',      w: 320,  h: 240,  mime: 'image/png' },
  { name: 'sehr groß 8200×2000 PNG', w: 8200, h: 2000, mime: 'image/png' },
  { name: 'extrem quer 3000×1000',   w: 3000, h: 1000, mime: 'image/png' },
  { name: 'extrem hoch 1000×3000',   w: 1000, h: 3000, mime: 'image/png' },
  { name: 'PNG transparent',         w: 1200, h: 800,  mime: 'image/png', alpha: true },
  { name: 'JPEG',                    w: 1600, h: 1000, mime: 'image/jpeg' },
  { name: 'WebP',                    w: 1600, h: 1000, mime: 'image/webp' },
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const results = [];

for (const c of CASES) {
  const p = await b.newContext().then(x => x.newPage());
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/c2pa|wasm|worker|404|Provenance|Herkunft/i.test(t)) errs.push(t);
  });
  // chrome-Stub OHNE runtime.getURL -> c2pa nutzt die URL-Fallback-Variante
  await p.addInitScript(() => { window.chrome = { storage: { local: { get: (k, cb) => cb({}), set: () => {} } } }; });
  await p.goto(`http://127.0.0.1:${port}/Benti_MVP.html`);
  await p.waitForTimeout(300);

  const dataUrl = await p.evaluate(({ w, h, mime, alpha }) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d');
    if (!alpha) { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#8ab'); g.addColorStop(1, '#dc9'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
    else { x.clearRect(0, 0, w, h); x.fillStyle = 'rgba(200,80,80,0.6)'; x.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6); }
    return cv.toDataURL(mime, 0.9);
  }, c);
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const ext = c.mime.split('/')[1];
  await (await p.$('#fileInput')).setInputFiles({ name: 'case.' + ext, mimeType: c.mime, buffer: buf });
  await p.waitForTimeout(500);

  const r = await p.evaluate(async () => {
    if (typeof loadedImage === 'undefined' || !loadedImage) return { err: 'Bild nicht geladen' };
    await applyWatermark();
    const dims = effectiveOutputDims();
    const layout = computeLabelLayout(dims.W, dims.H, analysisResult);
    const inBounds = layout && layout.blockX >= 0 && layout.blockY >= 0 &&
      (layout.blockX + layout.blockW) <= dims.W && (layout.blockY + layout.blockH) <= dims.H;
    return {
      canvasW: hiddenCanvas.width, canvasH: hiddenCanvas.height,
      srcW: loadedImage.naturalWidth, srcH: loadedImage.naturalHeight,
      inBounds, hasLayout: !!layout,
      hasDownload: document.getElementById('downloadSection').style.display === 'flex',
    };
  }, c).catch(e => ({ err: e.message }));

  const ok = r && !r.err && r.hasLayout && r.inBounds && r.hasDownload &&
    r.canvasW === c.w && r.canvasH === c.h && errs.length === 0;
  results.push({ name: c.name, ok, detail: r, errs });
  await p.close();
}

await b.close(); server.close();

let pass = 0;
for (const r of results) {
  if (r.ok) pass++;
  const line = (r.ok ? '✅' : '❌') + '  ' + r.name.padEnd(24);
  const info = r.detail && r.detail.err ? ('FEHLER: ' + r.detail.err)
    : (r.detail ? `canvas ${r.detail.canvasW}×${r.detail.canvasH} · inBounds=${r.detail.inBounds} · download=${r.detail.hasDownload}` : '');
  console.log(line, info, r.errs.length ? (' · JS-Fehler: ' + r.errs.join('; ')) : '');
}
console.log(`\n${pass}/${results.length} Fälle bestanden`);
process.exit(pass === results.length ? 0 : 1);
