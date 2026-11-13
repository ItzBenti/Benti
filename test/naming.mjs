// Dateiname-Muster (Token) + Ablageort (Downloads-Unterordner). Der
// File-System-Access-Ordnerpicker lässt sich headless nicht auslösen; getestet
// wird die Namens-/Unterordner-Logik und der Downloads-Pfad.
//
//   ln -sfn /opt/node22/lib/node_modules node_modules
//   node test/naming.mjs ; rm -f node_modules
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/Benti_MVP.html'; fs.readFile(path.join(root, f), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, r)); const port = server.address().port;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newContext().then(x => x.newPage());
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__dl = []; window.chrome = { storage: { local: { get: (k, cb) => cb({}), set: () => {} } }, downloads: { download: (o, cb) => { window.__dl.push(o.filename); cb && cb(1); } }, runtime: {} }; });
await p.goto(`http://127.0.0.1:${port}/Benti_MVP.html`); await p.waitForTimeout(300);

const results = [];
const eq = (name, got, want) => results.push({ name, ok: got === want, got, want });

const c = await p.evaluate(() => {
  const o = {};
  namePattern = '{name}_KI-gek.'; o.default = buildFilename('Produktfoto.png', { n: 1, w: 1600, h: 1200, ext: 'png' });
  namePattern = '{name}_{type}_{date}'; o.typed = buildFilename('Bild.jpg', { n: 1, ext: 'jpg' }).replace(/\d{4}-\d{2}-\d{2}/, 'DATE');
  namePattern = 'Foto_{n:3}'; o.counter = buildFilename('x.png', { n: 7, ext: 'png' });
  namePattern = '{name}_KI-gek._Logo'; o.literal = buildFilename('Auto.png', { n: 1, ext: 'png' });
  namePattern = ''; o.empty = buildFilename('Leer.png', { n: 1, ext: 'png' });
  downloadSubfolder = 'Benti/{date}'; o.sub = sanitizeSubfolder(downloadSubfolder).replace(/\d{4}-\d{2}-\d{2}/, 'DATE');
  return o;
});
eq('Standard-Muster', c.default, 'Produktfoto_KI-gek.png');
eq('{type}+{date}', c.typed, 'Bild_KI-generiert_DATE.jpg');
eq('Zähler {n:3}', c.counter, 'Foto_007.png');
eq('Literaltext bleibt', c.literal, 'Auto_KI-gek._Logo.png');
eq('leeres Muster → Fallback', c.empty, 'Leer_KI-gek.png');
eq('Unterordner mit {date}', c.sub, 'Benti/DATE');

// Einzel-Download übernimmt Muster
const durl = await p.evaluate(() => { const cv = document.createElement('canvas'); cv.width = 800; cv.height = 600; const x = cv.getContext('2d'); x.fillStyle = '#9a7'; x.fillRect(0, 0, 800, 600); return cv.toDataURL('image/png'); });
await (await p.$('#fileInput')).setInputFiles({ name: 'Testbild.png', mimeType: 'image/png', buffer: Buffer.from(durl.split(',')[1], 'base64') }); await p.waitForTimeout(400);
await p.evaluate(() => { const i = document.getElementById('namePattern'); i.value = '{name}_KI-gek.'; i.dispatchEvent(new Event('input')); });
await p.evaluate(async () => { await applyWatermark(); });
eq('Einzel-Download-Name', await p.evaluate(() => document.getElementById('btnDownload').download), 'Testbild_KI-gek.png');

// Downloads-Unterordner-Pfad
const dl = await p.evaluate(async () => { saveMode = 'downloads'; downloadSubfolder = 'Benti/Test'; await saveLabeledFile(new Uint8Array([1, 2, 3]), 'foo.png'); return window.__dl[window.__dl.length - 1]; });
eq('Downloads-Pfad mit Unterordner', dl, 'Benti/Test/foo.png');

let pass = 0;
for (const r of results) { if (r.ok) pass++; console.log((r.ok ? '✅' : '❌') + '  ' + r.name.padEnd(28) + (r.ok ? '' : ` (bekam „${r.got}", erwartet „${r.want}")`)); }
console.log('ERRORS:', errs.length ? errs.join(' || ') : 'keine');
console.log(`\n${pass}/${results.length} bestanden`);
await b.close(); server.close();
process.exit(pass === results.length && errs.length === 0 ? 0 : 1);
