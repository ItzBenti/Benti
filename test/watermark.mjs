// Unsichtbares Wasserzeichen (Ebene 3): Einbetten -> Detektion, Typ-Erkennung,
// „Prüfen"-Button und Falschtreffer-Schutz. Robustheits-Envelope siehe
// docs/downscale-robustness.md (Downscale wird bewusst NICHT als Pass gewertet).
//
//   ln -sfn /opt/node22/lib/node_modules node_modules
//   node test/watermark.mjs ; rm -f node_modules
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/Benti_MVP.html'; fs.readFile(path.join(root, f), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, r)); const port = server.address().port;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newContext().then(x => x.newPage());
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.chrome = { storage: { local: { get: (k, cb) => cb({}), set: () => {} } } }; });
await p.goto(`http://127.0.0.1:${port}/Benti_MVP.html`); await p.waitForTimeout(300);

const durl = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 1200, 900); g.addColorStop(0, '#9ab'); g.addColorStop(1, '#dc8'); x.fillStyle = g; x.fillRect(0, 0, 1200, 900); for (let i = 0; i < 5000; i++) { x.fillStyle = 'rgba(' + (Math.random() * 255 | 0) + ',0,0,0.1)'; x.fillRect(Math.random() * 1200, Math.random() * 900, 3, 3); } return c.toDataURL('image/png'); });
await (await p.$('#fileInput')).setInputFiles({ name: 't.png', mimeType: 'image/png', buffer: Buffer.from(durl.split(',')[1], 'base64') });
await p.waitForTimeout(400);

const results = [];
const check = (name, cond) => { results.push({ name, ok: !!cond }); };

// 1) Toggle aktiviert wmInvisibleOn
await p.evaluate(() => { const t = document.getElementById('wmInvisibleToggle'); t.checked = true; t.dispatchEvent(new Event('change')); });
check('Toggle setzt wmInvisibleOn', await p.evaluate(() => wmInvisibleOn === true));

// 2) Einbetten -> Detektion (nativ), Typ-Erkennung
const gen = await p.evaluate(async () => {
  const L = (u) => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
  labelType = 'ai-generated'; exportFormat = 'png';
  const u = generateWatermarkDataUrl(loadedImage, analysisResult, null);
  const img = await L(URL.createObjectURL(new Blob([u.finalBytes], { type: 'image/png' })));
  return detectInvisibleWatermark(img);
});
check('Wasserzeichen wird erkannt', gen.found);
check('Typ korrekt (ai-generated)', gen.type === 'ai-generated');

// 3) ai-modified
const mod = await p.evaluate(async () => {
  const L = (u) => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
  labelType = 'ai-modified';
  const u = generateWatermarkDataUrl(loadedImage, analysisResult, null);
  const img = await L(URL.createObjectURL(new Blob([u.finalBytes], { type: 'image/png' })));
  return detectInvisibleWatermark(img).type;
});
check('Typ korrekt (ai-modified)', mod === 'ai-modified');

// 4) Kein Falschtreffer auf unmarkiertem Bild
const fp = await p.evaluate(() => detectInvisibleWatermark(loadedImage).found);
check('Kein Falschtreffer (unmarkiert)', fp === false);

// 5) „Prüfen"-Button: markiertes Bild als neues Bild laden -> Button meldet Fund
const wmPng = await p.evaluate(async () => {
  labelType = 'ai-generated';
  const u = generateWatermarkDataUrl(loadedImage, analysisResult, null);
  let bin = ''; const a = u.finalBytes; for (let i = 0; i < a.length; i++) bin += String.fromCharCode(a[i]);
  return btoa(bin);
});
await (await p.$('#fileInput')).setInputFiles({ name: 'wm.png', mimeType: 'image/png', buffer: Buffer.from(wmPng, 'base64') });
await p.waitForTimeout(400);
await p.evaluate(() => document.getElementById('wmCheckBtn').click());
await p.waitForTimeout(400);
const btnText = await p.evaluate(() => document.getElementById('wmCheckResult').textContent);
check('Prüfen-Button meldet Fund', /gefunden/i.test(btnText));

for (const r of results) console.log((r.ok ? '✅' : '❌') + '  ' + r.name);
console.log('Prüfen-Button-Text:', btnText);
console.log('ERRORS:', errs.length ? errs.join(' || ') : 'keine');
const pass = results.filter(r => r.ok).length;
console.log(`\n${pass}/${results.length} bestanden`);
await b.close(); server.close();
process.exit(pass === results.length && errs.length === 0 ? 0 : 1);
