// US-3.3 – Roundtrip-Selbsttest: Ein exportiertes Bild wird mit dem eigenen
// Herkunfts-Check (checkProvenance / extractXmp) wieder eingelesen; der beim
// Export geschriebene DigitalSourceType muss erkannt werden.
//
// Aufruf (aus dem Repo-Root):
//   ln -sfn /opt/node22/lib/node_modules node_modules
//   node test/roundtrip.mjs ; rm -f node_modules
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';

const root = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/Benti_MVP.html'; fs.readFile(path.join(root, f), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, r)); const port = server.address().port;

const CASES = [
  { fmt: 'png',  type: 'ai-generated', expect: 'ai-generated' },
  { fmt: 'png',  type: 'ai-modified',  expect: 'ai-modified'  },
  { fmt: 'jpeg', type: 'ai-generated', expect: 'ai-generated' },
  { fmt: 'jpeg', type: 'ai-modified',  expect: 'ai-modified'  },
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newContext().then(x => x.newPage());
await p.addInitScript(() => { window.chrome = { storage: { local: { get: (k, cb) => cb({}), set: () => {} } } }; });
await p.goto(`http://127.0.0.1:${port}/Benti_MVP.html`);
await p.waitForTimeout(300);

// Testbild laden
const dataUrl = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1000; c.height = 700; const x = c.getContext('2d'); x.fillStyle = '#9ab27a'; x.fillRect(0, 0, 1000, 700); return c.toDataURL('image/png'); });
const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
await (await p.$('#fileInput')).setInputFiles({ name: 't.png', mimeType: 'image/png', buffer: buf });
await p.waitForTimeout(400);

const results = [];
for (const c of CASES) {
  const detected = await p.evaluate(async ({ fmt, type }) => {
    labelType = type;
    exportFormat = fmt;
    const urls = generateWatermarkDataUrl(loadedImage, analysisResult, null);
    if (!urls || !urls.finalBytes) return { err: 'kein Export' };
    const mime = fmt === 'png' ? 'image/png' : 'image/jpeg';
    const file = new File([urls.finalBytes], 'out.' + (fmt === 'png' ? 'png' : 'jpg'), { type: mime });
    const r = await checkProvenance(file);
    return { xmpDst: r.xmpDst, hasXmp: r.hasXmp };
  }, c).catch(e => ({ err: e.message }));
  const ok = detected && detected.xmpDst === c.expect;
  results.push({ c, detected, ok });
}

await b.close(); server.close();

let pass = 0;
for (const r of results) {
  if (r.ok) pass++;
  console.log((r.ok ? '✅' : '❌') + `  ${r.c.fmt.toUpperCase().padEnd(4)} ${r.c.type.padEnd(13)} → erwartet ${r.c.expect.padEnd(13)} · erkannt: ${JSON.stringify(r.detected)}`);
}
console.log(`\n${pass}/${results.length} Roundtrips bestanden`);
process.exit(pass === results.length ? 0 : 1);
