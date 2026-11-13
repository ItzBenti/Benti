import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/Benti_MVP.html'; fs.readFile(path.join(root, f), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, r)); const port = server.address().port;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newContext().then(x => x.newPage());
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.chrome = { storage: { local: { get: (k, cb) => cb({}), set: () => {} } } }; });
await p.goto(`http://127.0.0.1:${port}/Benti_MVP.html`);
await p.waitForTimeout(300);

const SAFE = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#8ab"/><circle cx="200" cy="150" r="80" fill="#dc9"/></svg>';
const EVIL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><script>alert(1)</script><rect width="100" height="100"/></svg>';
const EXT  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><image href="https://evil.example/x.png"/></svg>';

// 1) unsichere SVGs müssen abgelehnt werden (svgSecurityReject)
const rej = await p.evaluate(({ EVIL, EXT }) => ({ evil: svgSecurityReject(EVIL), ext: svgSecurityReject(EXT), safe: svgSecurityReject('<svg><rect/></svg>') }), { EVIL, EXT });
console.log('Ablehnung EVIL (soll Grund):', rej.evil);
console.log('Ablehnung EXT  (soll Grund):', rej.ext);
console.log('Ablehnung SAFE (soll null):', rej.safe);

// 2) sichere SVG laden
const buf = Buffer.from(SAFE);
await (await p.$('#fileInput')).setInputFiles({ name: 'safe.svg', mimeType: 'image/svg+xml', buffer: buf });
await p.waitForTimeout(500);
const loaded = await p.evaluate(() => ({ isSvg: isSvgInput, hasText: !!svgText }));
console.log('geladen als SVG:', JSON.stringify(loaded));

// 3) Label anwenden -> SVG-Ausgabe prüfen
const out = await p.evaluate(async () => {
  labelType = 'ai-generated';
  const urls = await generateSvgOutput(svgText, analysisResult);
  if (!urls) return { err: 'kein Output' };
  const txt = new TextDecoder().decode(urls.finalBytes);
  // Re-parse zur Gültigkeitsprüfung
  const reparsed = new DOMParser().parseFromString(txt, 'image/svg+xml');
  return {
    ext: urls.ext,
    valid: reparsed.getElementsByTagName('parsererror').length === 0,
    hasMetadata: /<metadata/.test(txt),
    hasDst: /trainedAlgorithmicMedia/.test(txt),
    hasImageDataUri: /<image[^>]+data:image\/svg\+xml/.test(txt),
    hasViewBox: /viewBox="0 0 400 300"/.test(txt),
    hasLabelGroup: /data-benti-label/.test(txt),
    len: txt.length,
  };
});
console.log('SVG-Ausgabe:', JSON.stringify(out, null, 0));

// 4) ai-modified -> compositeWith...
const mod = await p.evaluate(async () => { labelType = 'ai-modified'; const u = await generateSvgOutput(svgText, analysisResult); const t = new TextDecoder().decode(u.finalBytes); return /compositeWithTrainedAlgorithmicMedia/.test(t); });
console.log('ai-modified schreibt composite-DST:', mod);

// 5) SVG-Roundtrip: gelabelte SVG wieder einlesen -> DST muss erkannt werden
for (const type of ['ai-generated', 'ai-modified']) {
  const detected = await p.evaluate(async (t) => {
    labelType = t;
    const u = await generateSvgOutput(svgText, analysisResult);
    const f = new File([u.finalBytes], 'out.svg', { type: 'image/svg+xml' });
    return (await checkProvenance(f)).xmpDst;
  }, type);
  console.log(`SVG-Roundtrip ${type} → erkannt: ${detected} ${detected === type ? 'OK' : 'FAIL'}`);
}

console.log('ERRORS:', errs.length ? errs.join(' || ') : 'keine');
await b.close(); server.close();
