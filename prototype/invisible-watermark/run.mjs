// Prototyp-Runner: lädt die Wasserzeichen-Testseite in Chromium, wartet auf das
// Ergebnis, druckt die Tabelle als Text und speichert einen Screenshot.
// Aufruf (aus dem Repo-Root):
//   NODE_PATH=/opt/node22/lib/node_modules node prototype/invisible-watermark/run.mjs
import { chromium } from 'playwright';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 2 });
await p.goto('file://' + process.cwd() + '/prototype/invisible-watermark/watermark_proto.html');
await p.waitForFunction(() => document.title === 'READY', { timeout: 60000 });
const rows = await p.evaluate(() => window.__RESULTS || null);
if (!rows) { console.log('Kein Ergebnis (Fehler auf der Seite).'); }
else {
  const cols = Object.keys(rows[0].tests);
  const head = ['Bild', 'Δ', 'PSNR'].concat(cols);
  console.log(head.join('\t'));
  for (const r of rows) {
    const cells = [r.kind, r.delta, r.psnr.toFixed(1)];
    for (const c of cols) { const t = r.tests[c]; cells.push((t.payloadOK ? 'OK' : 'XX') + ' ' + (t.blockBER * 100).toFixed(0) + '%'); }
    console.log(cells.join('\t'));
  }
}
await p.screenshot({ path: 'prototype/invisible-watermark/result.png', fullPage: true });
await b.close();
