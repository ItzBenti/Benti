let loadedImage      = null;
let selectedPosition = 'ai';
let analysisResult   = null;
let isSvgInput       = false;   // US-3.6: aktuelles Bild ist eine (sichere) SVG
let svgText          = null;    // roher SVG-Quelltext des aktuellen Bildes
let wmInvisibleOn    = false;   // Ebene 3: unsichtbares Wasserzeichen mit-einbetten
let labelType        = 'ai-generated';   // 'ai-generated' | 'ai-modified' (früh deklariert: von buildFilename genutzt)

const fileInput       = document.getElementById('fileInput');
const uploadZone      = document.getElementById('uploadZone');
const previewWrap     = document.getElementById('previewWrap');
const previewToolbar  = document.getElementById('previewToolbar');
const previewImg      = document.getElementById('previewImg');
const wmText          = document.getElementById('wmText');
const wmSize          = document.getElementById('wmSize');
const wmStyle         = document.getElementById('wmStyle');
const wmOpacity       = document.getElementById('wmOpacity');
const opacityVal      = document.getElementById('opacityVal');
const btnApply        = document.getElementById('btnApply');
const downloadSection = document.getElementById('downloadSection');
const btnDownload     = document.getElementById('btnDownload');
const btnReset        = document.getElementById('btnReset');
const aiDot           = document.getElementById('aiDot');
const aiStatusText    = document.getElementById('aiStatusText');
const hiddenCanvas    = document.getElementById('hiddenCanvas');
// Single shared context: willReadFrequently must be set on the FIRST
// getContext call for the hint to take effect
const hiddenCtx       = hiddenCanvas.getContext('2d', { willReadFrequently: true });
const posModeAI      = document.getElementById('posModeAI');
const posModeManual  = document.getElementById('posModeManual');
const manualPosPanel = document.getElementById('manualPosPanel');
const posSliderX     = document.getElementById('posSliderX');
const posSliderY     = document.getElementById('posSliderY');
const posValX        = document.getElementById('posValX');
const posValY        = document.getElementById('posValY');
const quickPresets   = document.querySelectorAll('.qp-btn');
const batchBadge     = document.getElementById('batchBadge');
const batchProgressWrap = document.getElementById('batchProgressWrap');
const batchProgressFill = document.getElementById('batchProgressFill');
const batchProgressText = document.getElementById('batchProgressText');
const batchNav      = document.getElementById('batchNav');
const batchNavLabel = document.getElementById('batchNavLabel');
const btnRemoveAll  = document.getElementById('btnRemoveAll');
let currentPreviewIndex = 0;
let imageOverrides = [];   // per-image position settings in batch mode
// Generation-Zähler: invalidiert veraltete async Vorschau-Ladevorgänge, wenn
// im Batch schnell hin- und hergeschaltet wird (Fix 18.07., s. processFileForPreview)
let previewLoadRun = 0;

let manualPosX       = 99;   // % horizontal (1-99)
let manualPosY       = 99;   // % vertical   (1-99)
let currentFiles     = [];   // Array for batch processing

fileInput.addEventListener('change', function() {
  if (this.files && this.files.length > 0) handleFiles(this.files);
});

['dragenter','dragover'].forEach(evt =>
  uploadZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); uploadZone.classList.add('drag-over'); })
);
['dragleave','dragend'].forEach(evt =>
  uploadZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); uploadZone.classList.remove('drag-over'); })
);
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); e.stopPropagation();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
});

// Nach dem ersten Bild ersetzt previewWrap die uploadZone (die dann
// display:none ist) — weitere Bilder per Drag & Drop müssen deshalb hier
// landen können, sonst bleibt nur Strg+V als Weg zum Nachladen
['dragenter','dragover'].forEach(evt =>
  previewWrap.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); previewWrap.classList.add('drag-over'); })
);
['dragleave','dragend'].forEach(evt =>
  previewWrap.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); previewWrap.classList.remove('drag-over'); })
);
previewWrap.addEventListener('drop', e => {
  e.preventDefault(); e.stopPropagation();
  previewWrap.classList.remove('drag-over');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
});

wmOpacity.addEventListener('input', () => opacityVal.textContent = wmOpacity.value + '%');

// ── Position Mode Tab Switching ──────────────────────────────────────────────
[posModeAI, posModeManual].forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.posmode;
    posModeAI.classList.toggle('active', mode === 'ai');
    posModeManual.classList.toggle('active', mode === 'manual');
    selectedPosition = mode;
    manualPosPanel.classList.toggle('active', mode === 'manual');
    saveImageOverride();
    saveSettings();
  });
});

// ── X/Y Position Sliders ─────────────────────────────────────────────────────
posSliderX.addEventListener('input', () => {
  manualPosX = parseInt(posSliderX.value);
  posValX.textContent = manualPosX + '%';
  updateQuickPresetHighlight();
  saveImageOverride();
  saveSettings();
});
posSliderY.addEventListener('input', () => {
  manualPosY = parseInt(posSliderY.value);
  posValY.textContent = manualPosY + '%';
  updateQuickPresetHighlight();
  saveImageOverride();
  saveSettings();
});

// ── Quick Presets ────────────────────────────────────────────────────────────
quickPresets.forEach(btn => {
  btn.addEventListener('click', () => {
    manualPosX = parseInt(btn.dataset.qpX);
    manualPosY = parseInt(btn.dataset.qpY);
    posSliderX.value = manualPosX;
    posSliderY.value = manualPosY;
    posValX.textContent = manualPosX + '%';
    posValY.textContent = manualPosY + '%';
    updateQuickPresetHighlight();
    saveImageOverride();
    saveSettings();
  });
});

function updateQuickPresetHighlight() {
  quickPresets.forEach(btn => {
    const bx = parseInt(btn.dataset.qpX);
    const by = parseInt(btn.dataset.qpY);
    btn.classList.toggle('active', bx === manualPosX && by === manualPosY);
  });
}

// ── Per-image position overrides (batch mode) ───────────────────────────────
// Changing the position only affects the image currently shown in the
// preview; other batch images keep their own (or the default) position
function saveImageOverride() {
  if (!currentFiles || currentFiles.length < 2) return;
  imageOverrides[currentPreviewIndex] = {
    posMode: selectedPosition, posX: manualPosX, posY: manualPosY
  };
}
function applyImageOverride(i) {
  const ov = imageOverrides[i];
  if (!ov) return;
  selectedPosition = ov.posMode;
  manualPosX = ov.posX;
  manualPosY = ov.posY;
  posModeAI.classList.toggle('active', selectedPosition === 'ai');
  posModeManual.classList.toggle('active', selectedPosition === 'manual');
  manualPosPanel.classList.toggle('active', selectedPosition === 'manual');
  posSliderX.value = manualPosX; posValX.textContent = manualPosX + '%';
  posSliderY.value = manualPosY; posValY.textContent = manualPosY + '%';
  updateQuickPresetHighlight();
}

btnApply.addEventListener('click', async () => {
  if (currentFiles && currentFiles.length > 1) {
    await processBatchFiles();
  } else {
    await applyWatermark();
  }
});
btnReset.addEventListener('click', resetAll);

function handleFiles(filesList) {
  // Convert FileList to Array
  let files = Array.from(filesList).filter(f => f.type.startsWith('image/'));
  
  if (files.length === 0) {
    setAIStatus('idle', '\u26a0 Nur Bilder (JPG, PNG, WEBP) erlaubt.');
    return;
  }

  // Bereits geladene Bilder anhängen statt ersetzen (Feedback 17.07.:
  // nachträglich ein weiteres Bild laden ging vorher nicht, weil hier
  // currentFiles komplett überschrieben wurde). Duplikate werden sowohl
  // gegen bereits geladene Bilder ALS AUCH innerhalb der neuen Auswahl
  // selbst rausgefiltert (Fix 18.07.: zwei identische Bilder beim allerersten
  // Upload landeten bisher unbemerkt doppelt im Batch)
  const seenNew = [];
  const isDuplicate = f =>
    currentFiles.some(cf => cf.name === f.name && cf.size === f.size) ||
    seenNew.some(sf => sf.name === f.name && sf.size === f.size);
  const newFiles = [];
  for (const f of files) {
    if (isDuplicate(f)) continue;
    seenNew.push(f);
    newFiles.push(f);
  }
  if (newFiles.length === 0) {
    setAIStatus('idle', 'Bild(er) sind bereits geladen.');
    return;
  }

  const appending = currentFiles && currentFiles.length > 0;
  let firstNewIndex = 0;
  if (appending) {
    firstNewIndex = currentFiles.length;
    currentFiles = currentFiles.concat(newFiles);
    imageOverrides.length = currentFiles.length;   // Lücken für die neuen Bilder auffüllen
    while (provResults.length < currentFiles.length) provResults.push(null);
    currentPreviewIndex = firstNewIndex;
  } else {
    currentFiles = newFiles;
    currentPreviewIndex = 0;
    imageOverrides = [];
  }

  if (currentFiles.length > 1) {
    batchBadge.style.display = 'block';
    batchBadge.textContent = `Batch · ${currentFiles.length} Bilder`;
    btnApply.textContent = `Auf ${currentFiles.length} Bilder anwenden`;
  } else {
    batchBadge.style.display = 'none';
    btnApply.textContent = `Kennzeichnung anwenden`;
  }

  // Bei neu hinzugefügten Bildern direkt das erste neue anzeigen
  applyImageOverride(currentPreviewIndex);
  processFileForPreview(currentFiles[firstNewIndex]);
  updateBatchNav();
  scanProvenance(currentFiles, appending);
}

// ── Batch preview navigation: browse through the uploaded images ────────────
function updateBatchNav() {
  if (!batchNav) return;
  const isBatch = currentFiles && currentFiles.length > 1;
  if (isBatch) {
    batchNav.style.display = 'flex';
    batchNavLabel.textContent = (currentPreviewIndex + 1) + ' / ' + currentFiles.length;
  } else {
    batchNav.style.display = 'none';
  }
  if (btnRemoveAll) btnRemoveAll.style.display = isBatch ? 'block' : 'none';
}

// Remove only the currently shown image from a batch (✕); with a single
// image this behaves like a full reset
function removeCurrentImage() {
  if (!currentFiles || currentFiles.length < 2) { resetAll(); return; }
  currentFiles.splice(currentPreviewIndex, 1);
  imageOverrides.splice(currentPreviewIndex, 1);
  provResults.splice(currentPreviewIndex, 1);
  if (currentPreviewIndex >= currentFiles.length) currentPreviewIndex = currentFiles.length - 1;
  if (currentFiles.length > 1) {
    batchBadge.textContent = `Batch · ${currentFiles.length} Bilder`;
    btnApply.textContent = `Auf ${currentFiles.length} Bilder anwenden`;
  } else {
    batchBadge.style.display = 'none';
    btnApply.textContent = `Kennzeichnung anwenden`;
  }
  applyImageOverride(currentPreviewIndex);
  processFileForPreview(currentFiles[currentPreviewIndex]);
  updateBatchNav();
  scanProvenance(currentFiles, true);
}
function showBatchImage(step) {
  if (!currentFiles || currentFiles.length < 2) return;
  currentPreviewIndex = (currentPreviewIndex + step + currentFiles.length) % currentFiles.length;
  applyImageOverride(currentPreviewIndex);
  processFileForPreview(currentFiles[currentPreviewIndex]);
  updateBatchNav();
  renderProvenance(provResults[currentPreviewIndex] || null);
}
document.getElementById('batchPrev').addEventListener('click', () => showBatchImage(-1));
document.getElementById('batchNext').addEventListener('click', () => showBatchImage(1));

function processFileForPreview(file) {
  // Generation-Token: l\u00e4uft eine \u00e4ltere Vorschau noch, wenn der Nutzer
  // inzwischen weitergeklickt hat, wird ihr Ergebnis unten verworfen statt
  // das bereits aktuellere Bild zu \u00fcberschreiben (Race Condition, Fix 18.07.)
  const run = ++previewLoadRun;
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '');
  const reader = new FileReader();
  reader.onload = function(e) {
    if (run !== previewLoadRun) return;   // inzwischen \u00fcberholt
    let previewSrc, svgSrcText = null;
    if (isSvg) {
      // US-3.6 Sicherheit: v1 lehnt aktive/externe SVGs ab statt zu reparieren.
      const bad = svgSecurityReject(e.target.result);
      if (bad) {
        setAIStatus('idle', '\u26a0\ufe0f SVG abgelehnt (' + bad + '). Benti labelt aus Sicherheitsgr\u00fcnden nur SVGs ohne Skripte oder externe Referenzen.');
        rejectCurrentPreviewFile();
        return;
      }
      svgSrcText = e.target.result;
      previewSrc = svgTextToDataUri(svgSrcText);   // Vorschau ausschlie\u00dflich \u00fcber <img>
    } else {
      previewSrc = e.target.result;
    }
    const img = new Image();
    img.onload = function() {
      if (run !== previewLoadRun) return;   // inzwischen \u00fcberholt
      loadedImage = img;
      isSvgInput = isSvg; svgText = svgSrcText;
      if (typeof syncSizeToImage === 'function') syncSizeToImage();
      originalPreviewSrc = previewSrc;
      previewImg.src = previewSrc;
      uploadZone.style.display  = 'none';
      previewWrap.style.display = 'block';
      if (previewToolbar) previewToolbar.style.display = 'flex';
      downloadSection.style.display = 'none';
      btnApply.disabled = false;
      labeledPreviewSrc = null;
      btnCompare.style.display = 'none';
      btnRemoveImage.style.display = 'block';
      updateSizeEstimate();
      runAIAnalysis(img, run);
    };
    img.onerror = () => { if (run === previewLoadRun) setAIStatus('idle', '\u2715 Bild konnte nicht geladen werden.'); };
    img.src = previewSrc;
  };
  reader.onerror = () => { if (run === previewLoadRun) setAIStatus('idle', '\u2715 Datei konnte nicht gelesen werden.'); };
  if (isSvg) reader.readAsText(file); else reader.readAsDataURL(file);
}

// Eine abgelehnte SVG aus dem Batch nehmen und zur naechsten/Upload-Zone zurueck
function rejectCurrentPreviewFile() {
  if (currentFiles && currentFiles.length) {
    currentFiles.splice(currentPreviewIndex, 1);
    if (imageOverrides) imageOverrides.splice(currentPreviewIndex, 1);
    if (provResults) provResults.splice(currentPreviewIndex, 1);
  }
  if (!currentFiles || currentFiles.length === 0) { resetAll(); return; }
  if (currentPreviewIndex >= currentFiles.length) currentPreviewIndex = currentFiles.length - 1;
  if (currentFiles.length > 1) {
    batchBadge.textContent = `\ud83d\udce6 Batch Mode: ${currentFiles.length} Bilder`;
    btnApply.innerHTML = `<span class="icon">\u2728</span> Auf ${currentFiles.length} Bilder anwenden`;
  } else {
    batchBadge.style.display = 'none';
    btnApply.innerHTML = `<span class="icon">\u2728</span> Kennzeichnung anwenden`;
  }
  updateBatchNav();
  processFileForPreview(currentFiles[currentPreviewIndex]);
}

function analyzeImageSync(img) {
  const ctx = hiddenCtx;
  const W = img.naturalWidth, H = img.naturalHeight;
  hiddenCanvas.width = W; hiddenCanvas.height = H;
  ctx.drawImage(img, 0, 0);
  let imageData;
  try { imageData = ctx.getImageData(0, 0, W, H); }
  catch(err) {
    return { row:2, col:1, avgLum:128 };
  }
  const data = imageData.data;
  const GRID = 3;
  const avoidSaliency = document.getElementById('avoidSaliency').checked;
  let best = null;

  function computeZoneStats(row, col) {
    const x0=Math.floor(col*W/GRID), y0=Math.floor(row*H/GRID);
    const x1=Math.floor((col+1)*W/GRID), y1=Math.floor((row+1)*H/GRID);
    let sumLum=0, sumEdge=0, lumValues=[], n=0;
    for (let y=y0; y<y1; y+=4) {
      for (let x=x0; x<x1; x+=4) {
        const i=(y*W+x)*4;
        const lum=0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2];
        lumValues.push(lum);
        const j=((y+1)*W+(x+1))*4;
        if (j+2<data.length) {
          const lum2=0.2126*data[j]+0.7152*data[j+1]+0.0722*data[j+2];
          sumEdge+=Math.abs(lum-lum2);
        }
        sumLum+=lum; n++;
      }
    }
    const avgLum=sumLum/n, avgEdge=sumEdge/n;
    let sumVariance=0;
    for (let k=0; k<lumValues.length; k++) {
      const diff = lumValues[k] - avgLum;
      sumVariance += diff * diff;
    }
    const lumVariance = sumVariance / lumValues.length;
    return { avgLum, avgEdge, lumVariance };
  }

  // Auto mode only considers the four corners – labels belong in corners by
  // convention; centre spots remain available via manual positioning
  const CORNERS = [[0, 0], [0, 2], [2, 0], [2, 2]];
  for (const [row, col] of CORNERS) {
    const stats = computeZoneStats(row, col);
    let score;
    if (avoidSaliency) {
      const edgePenalty    = (1 - Math.min(stats.avgEdge / 30, 1)) * 0.50;
      const variancePenalty= (1 - Math.min(stats.lumVariance / 2000, 1)) * 0.35;
      const lumFactor      = (1 - Math.abs(stats.avgLum - 180) / 180) * 0.15;
      score = edgePenalty + variancePenalty + lumFactor;
    } else {
      score = (1 - Math.abs(stats.avgLum - 180) / 180) * 0.4 + (1 - Math.min(stats.avgEdge / 40, 1)) * 0.6;
    }
    // Bottom corners preferred; top corners only win if the bottom is
    // drastically worse (bright smooth sky would otherwise always win)
    const posWeight = { '0,0': 0.70, '0,2': 0.75, '2,0': 0.95, '2,2': 1.00 };
    score *= posWeight[row + ',' + col];
    if (!best || score > best.score) best = { row, col, score, avgLum: stats.avgLum };
  }
  
  const brStats = computeZoneStats(2, 2);
  let brScore;
  if (avoidSaliency) {
    const edgePenalty    = (1 - Math.min(brStats.avgEdge / 30, 1)) * 0.50;
    const variancePenalty= (1 - Math.min(brStats.lumVariance / 2000, 1)) * 0.35;
    const lumFactor      = (1 - Math.abs(brStats.avgLum - 180) / 180) * 0.15;
    brScore = edgePenalty + variancePenalty + lumFactor;
  } else {
    brScore = (1 - Math.abs(brStats.avgLum - 180) / 180) * 0.4 + (1 - Math.min(brStats.avgEdge / 40, 1)) * 0.6;
  }
  const bottomRight = { row:2, col:2, score: brScore, avgLum: brStats.avgLum };
  const useDefault = !best || (best.row===2 && best.col===2) || (best.score < bottomRight.score * 1.15);
  return useDefault ? bottomRight : best;
}

function runAIAnalysis(img, run) {
  setAIStatus('analyzing', 'KI analysiert Bild \u2026');
  setTimeout(function() {
    if (run !== previewLoadRun) return;   // Nutzer ist inzwischen weitergeklickt
    analysisResult = analyzeImageSync(img);
    const chosen = analysisResult;
    const cornerNames = { '0,0': 'oben links', '0,2': 'oben rechts', '2,0': 'unten links', '2,2': 'unten rechts (Standard)' };
    const zoneLabel = cornerNames[chosen.row + ',' + chosen.col] || `Zeile ${chosen.row+1}, Spalte ${chosen.col+1}`;
    const avoidSaliency = document.getElementById('avoidSaliency').checked;
    const saliencyHint = avoidSaliency ? ' (Saliency aktiv)' : '';
    setAIStatus('active', `\u2713 Beste Zone: ${zoneLabel}${saliencyHint}`);
    updateLabelPreview();
  }, 500);
}

// ── Live WYSIWYG label preview (US-1.8) ──────────────────────────────────────
// Maps the shared layout onto the visible image rect inside the
// object-fit:contain preview box (TECH-SPEC §11)
function updateLabelPreview() {
  const box  = document.getElementById('labelPreviewBox');
  const pImg = document.getElementById('labelPreviewImg');
  const pCap = document.getElementById('labelPreviewCap');
  const pTxt = document.getElementById('labelPreviewText');
  const pFrame = document.getElementById('labelPreviewFrame');
  const pPlate = document.getElementById('labelPreviewPlate');
  if (!box) return;
  if (!loadedImage || previewWrap.style.display === 'none' || downloadSection.style.display === 'flex') {
    box.style.display = 'none';
    checkReadability(null);
    return;
  }
  // Bei exakter Ausgabegröße das Label anhand der Zielmaße rechnen – so zeigt
  // die Vorschau (und die Warnung) die tatsaechliche Endgroesse.
  const dims = effectiveOutputDims();
  const natW = dims.W || loadedImage.naturalWidth, natH = dims.H || loadedImage.naturalHeight;
  const layout = computeLabelLayout(natW, natH, analysisResult);
  if (!layout) { box.style.display = 'none'; checkReadability(null); return; }
  checkReadability(layout);

  const boxW = previewImg.clientWidth, boxH = previewImg.clientHeight;
  const scale = Math.min(boxW / natW, boxH / natH);
  const offX = (boxW - natW * scale) / 2;
  const offY = (boxH - natH * scale) / 2;

  box.style.display = 'block';

  // Tight dashed frame around the actual label block (replaces the old,
  // oversized third-of-image zone indicator)
  if (pFrame) {
    // Clamp the frame to the visible image rect so it never sticks out
    let fx = offX + layout.blockX * scale - 5;
    let fy = offY + layout.blockY * scale - 5;
    let fw = layout.blockW * scale + 10;
    let fh = layout.blockH * scale + 10;
    const imgR = offX + natW * scale, imgB = offY + natH * scale;
    if (fx < offX) { fw -= (offX - fx); fx = offX; }
    if (fy < offY) { fh -= (offY - fy); fy = offY; }
    if (fx + fw > imgR) fw = imgR - fx;
    if (fy + fh > imgB) fh = imgB - fy;
    pFrame.style.left   = fx + 'px';
    pFrame.style.top    = fy + 'px';
    pFrame.style.width  = fw + 'px';
    pFrame.style.height = fh + 'px';
  }

  if (pPlate) {
    if (layout.mode === 'logo' && layout.plate) {
      const p = layout.plate;
      pPlate.style.display      = 'block';
      pPlate.style.left         = (offX + p.x * scale) + 'px';
      pPlate.style.top          = (offY + p.y * scale) + 'px';
      pPlate.style.width        = (p.w * scale) + 'px';
      pPlate.style.height       = (p.h * scale) + 'px';
      pPlate.style.borderRadius = (p.r * scale) + 'px';
      pPlate.style.background   = p.light ? '#ffffff' : '#141419';
      pPlate.style.opacity      = p.alpha;
    } else {
      pPlate.style.display = 'none';
    }
  }

  if (layout.mode === 'logo') {
    pTxt.style.display = 'none';
    pImg.style.display = 'block';
    if (pImg.src !== layout.logoImg.src) pImg.src = layout.logoImg.src;
    pImg.style.left    = (offX + layout.lx * scale) + 'px';
    pImg.style.top     = (offY + layout.ly * scale) + 'px';
    pImg.style.width   = (layout.lw * scale) + 'px';
    pImg.style.height  = (layout.lh * scale) + 'px';
    pImg.style.opacity = (layout.isEu && layout.euTransparent) ? 1 : layout.opacity;
    if (layout.withCaption) {
      pCap.style.display  = 'block';
      pCap.textContent    = layout.caption;
      pCap.style.left     = (offX + layout.capCX * scale) + 'px';
      pCap.style.top      = (offY + layout.capY * scale) + 'px';
      pCap.style.fontSize = Math.max(6, layout.capSize * scale) + 'px';
      pCap.style.color    = (layout.zoneLum > 128) ? '#000' : '#fff';
      pCap.style.opacity  = layout.opacity;
      pCap.style.textShadow = (layout.zoneLum > 128) ? '0 0 3px rgba(255,255,255,0.8)' : '0 0 3px rgba(0,0,0,0.8)';
    } else {
      pCap.style.display = 'none';
    }
  } else {
    pImg.style.display = 'none';
    pCap.style.display = 'none';
    pTxt.style.display = 'block';
    pTxt.textContent    = layout.text;
    pTxt.style.left     = (offX + layout.tx * scale) + 'px';
    pTxt.style.top      = (offY + (layout.ty - layout.fontSize / 2) * scale) + 'px';
    pTxt.style.fontSize = Math.max(6, layout.fontSize * scale) + 'px';
    pTxt.style.color    = layout.color;
    pTxt.style.opacity  = layout.opacity;
    pTxt.style.textShadow = layout.color === '#ffffff' ? '0 0 3px rgba(0,0,0,0.8)' : '0 0 3px rgba(255,255,255,0.8)';
  }
}

// ── Shared label layout: single source of truth for the canvas export AND
//    the live preview overlay (TECH-SPEC §11: one calculation, two consumers)
function computeLabelLayout(W, H, analysisRes) {
  let anchorX, anchorY;
  if (selectedPosition === 'manual') {
    anchorX = manualPosX / 100;
    anchorY = manualPosY / 100;
  } else {
    const pos = analysisRes || { row: 2, col: 2 };
    anchorX = pos.col / 2;
    anchorY = pos.row / 2;
  }
  const zoneLum = (analysisRes && analysisRes.avgLum !== undefined) ? analysisRes.avgLum : 128;
  const opacity = parseInt(wmOpacity.value) / 100;
  const marginX = Math.max(4, Math.round(W * 0.005));
  const marginY = Math.max(4, Math.round(H * 0.005));

  if (wmMode === 'logo') {
    let logoImg, euTransparent = false;
    if (logoSource === 'eu') {
      // Official EU label pill provides its own contrast:
      // bright zone -> black pill, dark zone -> white pill
      euTransparent = parseInt(wmOpacity.value) < 75;
      const euType = (euIconStyle === 'compact') ? 'ai' : labelType;
      const p = euIconPath(euType, (zoneLum > 128) ? 'black' : 'white', euTransparent);
      logoImg = euIconCache[p];
      if (!logoImg || !logoImg.complete || !logoImg.naturalWidth) return null; // still preloading
    } else {
      logoImg = (zoneLum > 128) ? (logoDarkImg || logoLightImg) : (logoLightImg || logoDarkImg);
      if (!logoImg) return null; // Missing logo error
    }

    // Size by label HEIGHT as % of the image diagonal reference
    const refDim = Math.sqrt(W * H);
    const pct = parseInt(logoSizeSlider.value) / 100;
    const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
    const MIN_LABEL_PX = 24;
    let lh = Math.round(refDim * pct);
    lh = Math.max(MIN_LABEL_PX, Math.min(lh, Math.round(H * 0.4)));
    let lw = Math.round(lh * aspect);
    if (lw > W * 0.5) { lw = Math.round(W * 0.5); lh = Math.round(lw / aspect); }

    // Caption metrics: measured, so the block is wide enough – nothing clips
    const withCaption = (logoSource === 'eu' && deTextOn);
    const caption = (labelType === 'ai-generated') ? 'KI-generiert' : 'KI-bearbeitet';
    const capSize = withCaption ? Math.max(11, Math.round(lh * 0.32)) : 0;
    const capGap  = withCaption ? Math.round(capSize * 0.35) : 0;
    let capW = 0;
    if (withCaption) {
      hiddenCtx.font = `bold ${capSize}px 'Segoe UI', sans-serif`;
      capW = Math.ceil(hiddenCtx.measureText(caption).width);
    }

    // Icon + caption form one anchored block; both centered inside it
    const blockW = Math.max(lw, capW);
    const blockH = lh + capGap + capSize;
    // Kontrast-Plakette: solide Platte hinter dem Label. Ihr Rand liegt um
    // platePad außerhalb des Blocks – deshalb muss der Anker diesen Rand
    // mit einplanen, sonst ragt die Platte über den Bildrand hinaus.
    const platePad = plateOn ? Math.max(6, Math.round(lh * 0.20)) : 0;
    let bx = anchorX * (W - blockW);
    let by = anchorY * (H - blockH);
    bx = Math.max(marginX + platePad, Math.min(bx, W - blockW - marginX - platePad));
    by = Math.max(marginY + platePad, Math.min(by, H - blockH - marginY - platePad));

    let plate = null;
    if (plateOn) {
      const pw = Math.round(blockW + platePad * 2);
      const ph = Math.round(blockH + platePad * 2);
      plate = {
        x: Math.round(bx - platePad), y: Math.round(by - platePad), w: pw, h: ph,
        r: Math.round(Math.min(pw, ph) * 0.22),
        light: (zoneLum > 128),
        // Auch bei niedriger Deckkraft trägt die Platte genug Kontrast, damit
        // das Label beim Verkleinern durch Dritte lesbar bleibt.
        alpha: Math.max(0.45, Math.min(0.82, opacity * 0.7 + 0.2))
      };
    }

    return {
      mode: 'logo', logoImg, euTransparent, zoneLum, opacity, plate,
      isEu: (logoSource === 'eu'),
      lx: Math.round(bx + (blockW - lw) / 2), ly: Math.round(by), lw, lh,
      withCaption, caption, capSize, capGap,
      capCX: Math.round(bx + blockW / 2),
      capY: Math.round(by + lh + capGap),
      blockX: Math.round(bx), blockY: Math.round(by),
      blockW: Math.round(blockW), blockH: Math.round(blockH)
    };
  }

  // Text watermark
  const text = wmText.value || 'KI-generiert';
  const refDim = Math.sqrt(W * H);
  const sizeMap = { small: refDim * 0.008, medium: refDim * 0.015, large: refDim * 0.025 };
  const maxFont = W * 0.02;
  const fontSize = Math.max(12, Math.min(sizeMap[wmSize.value], maxFont));
  hiddenCtx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
  const tw = hiddenCtx.measureText(text).width;

  let tx = anchorX * (W - tw);
  let ty = anchorY * (H - fontSize) + fontSize / 2;
  tx = Math.max(marginX, Math.min(tx, W - tw - marginX));
  ty = Math.max(marginY + fontSize / 2, Math.min(ty, H - marginY - fontSize / 2));

  let color = '#ffffff';
  if (wmStyle.value === 'black') color = '#000000';
  else if (wmStyle.value === 'auto') color = (zoneLum > 128) ? '#000000' : '#ffffff';
  else if (wmStyle.value === 'custom') color = document.getElementById('wmCustomColor').value;

  return {
    mode: 'text', text, fontSize, tw, tx, ty, color, zoneLum, opacity,
    blockX: Math.round(tx), blockY: Math.round(ty - fontSize / 2),
    blockW: Math.round(tw), blockH: Math.round(fontSize)
  };
}

function generateWatermarkDataUrl(img, analysisRes, origBytes) {
  const dims = effectiveOutputDims();
  const W = dims.W || img.naturalWidth, H = dims.H || img.naturalHeight;
  const layout = computeLabelLayout(W, H, analysisRes);
  if (!layout) return null;

  const ctx = hiddenCtx;
  hiddenCanvas.width = W; hiddenCanvas.height = H;
  // Bei exakter Ausgabegröße wird das Bild ZUERST auf die Zielmaße gerechnet
  // und DANN das Label gesetzt – so ist das Label fuer die Endgroesse
  // proportioniert und kann nicht mehr zu klein werden.
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, W, H);

  if (layout.mode === 'logo') {
    // Kontrast-Plakette zuerst – solide Platte hinter dem Logo, damit dünne
    // Icon-/Textkanten das Herunterskalieren durch Dritte überstehen.
    if (layout.plate) {
      const p = layout.plate;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.light ? '#ffffff' : '#141419';
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, p.r);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    // _50 variants carry their transparency in the icon itself – don't dampen twice
    ctx.globalAlpha = (layout.isEu && layout.euTransparent) ? 1 : layout.opacity;
    ctx.shadowColor = (layout.zoneLum > 128) ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = layout.lh * 0.08;
    ctx.drawImage(layout.logoImg, layout.lx, layout.ly, layout.lw, layout.lh);

    if (layout.withCaption) {
      ctx.globalAlpha = layout.opacity;
      ctx.font = `bold ${layout.capSize}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = (layout.zoneLum > 128) ? '#000000' : '#ffffff';
      ctx.shadowColor = (layout.zoneLum > 128) ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = layout.capSize * 0.35;
      ctx.fillText(layout.caption, layout.capCX, layout.capY);
    }
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = layout.opacity;
    ctx.font = `bold ${layout.fontSize}px 'Segoe UI', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = layout.color;
    ctx.shadowColor = layout.color === '#ffffff' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = layout.fontSize * 0.4;
    ctx.fillText(layout.text, layout.tx, layout.ty);
    ctx.restore();
  }

  let exportCanvas = hiddenCanvas;
  // Exakte Ausgabegröße hat Vorrang: dann NICHT zusätzlich für DPI hochskalieren
  // (sonst waeren die Endmasse nicht mehr die eingestellten Pixel).
  if (!outputSizeOn && selectedMode === 'upscale' && selectedDPI > 96) {
    const scaleFactor = selectedDPI / 96;
    const upW = Math.round(W * scaleFactor);
    const upH = Math.round(H * scaleFactor);
    const upCanvas = document.createElement('canvas');
    upCanvas.width = upW;
    upCanvas.height = upH;
    const upCtx = upCanvas.getContext('2d');
    upCtx.imageSmoothingEnabled = true;
    upCtx.imageSmoothingQuality = 'high';
    upCtx.drawImage(hiddenCanvas, 0, 0, upW, upH);
    exportCanvas = upCanvas;
  }

  // Unsichtbares Wasserzeichen (opt-in) in den finalen Export-Canvas einbetten
  if (wmInvisibleOn) {
    try { embedInvisibleWatermark(exportCanvas); }
    catch (e) { console.warn('[WM] Einbetten fehlgeschlagen:', e); }
  }

  const activeDpiBtn = document.querySelector('.dpi-btn.active[data-dpi]');
  if (activeDpiBtn) selectedDPI = parseInt(activeDpiBtn.dataset.dpi);

  // US-3.7: Metadaten (EXIF, XMP) aus den Original-Bytes übernehmen
  const meta = origBytes ? extractOriginalMeta(origBytes) : null;

  if (exportFormat === 'png') {
    const rawUrl = exportCanvas.toDataURL('image/png');
    const phys = insertPHYsChunk(rawUrl, selectedDPI, meta);   // pHYs + XMP (US-3.1) + Metadaten-Erhalt (US-3.7)
    return { rawUrl, finalUrl: phys.url, finalBytes: phys.bytes, ext: 'png', metaNote: preservedMetaNote(meta) };
  }

  const mime = (exportFormat === 'jpeg') ? 'image/jpeg' : 'image/webp';
  const rawUrl = exportCanvas.toDataURL(mime, exportQuality / 100);
  let bytes = dataUrlToBytes(rawUrl);
  if (exportFormat === 'jpeg') {
    bytes = setJpegDpi(bytes, selectedDPI);                          // JFIF-Dichte (Pendant zu pHYs)
    bytes = insertJpegXmp(bytes, meta);   // APP1-XMP (US-3.2) + EXIF-Erhalt (US-3.7)
  }
  // WebP: XMP würde einen VP8X-Container-Umbau erfordern – bewusst ohne
  // Metadaten (ehrlicher Hinweis im UI, s. US-3.5)
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  return { rawUrl, finalUrl: url, finalBytes: bytes, ext: (exportFormat === 'jpeg') ? 'jpg' : 'webp', metaNote: preservedMetaNote(meta) };
}

// ═══════════════════════════════════════════════════════════════════════════
// US-3.6 – SVG-Workflow: SVG bleibt Vektor. Label wird als Vektor-Elemente
// eingebettet, XMP ins <metadata>. Sicherheit v1 = ablehnen statt reparieren.
// ═══════════════════════════════════════════════════════════════════════════
function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function svgTextToDataUri(text) {
  return 'data:image/svg+xml;base64,' + utf8ToBase64(text);
}
// Gibt bei aktivem/externem Inhalt einen Grund zurück (=> ablehnen), sonst null.
function svgSecurityReject(text) {
  if (/<script[\s>]/i.test(text)) return 'Skript-Element';
  if (/\son[a-z]+\s*=/i.test(text)) return 'Event-Attribut (on…)';
  if (/<foreignObject[\s>]/i.test(text)) return 'foreignObject';
  if (/<!ENTITY/i.test(text) || /<!DOCTYPE[^>]*\[/.test(text)) return 'DTD/Entity';
  if (/(?:xlink:href|href)\s*=\s*["']?\s*(?:https?:|\/\/)/i.test(text)) return 'externe Referenz';
  if (/url\(\s*["']?\s*(?:https?:|\/\/)/i.test(text)) return 'externe CSS-Referenz';
  return null;
}
function euIconSvgPath(type, color, transparent) {
  return 'assets/eu-icons/svg/' + type + '_' + color + (transparent ? '_50' : '') + '.svg';
}
const svgIconCache = {};   // path -> text
async function fetchSvgText(path) {
  if (svgIconCache[path]) return svgIconCache[path];
  const res = await fetch(path);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' für ' + path);
  const t = await res.text();
  svgIconCache[path] = t;
  return t;
}
// Koordinatenraum aus dem Wurzel-<svg> (viewBox bevorzugt)
function svgViewport(root) {
  const vb = root.getAttribute('viewBox');
  if (vb) {
    const p = vb.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    if (p.length === 4 && p[2] > 0 && p[3] > 0) return { x: p[0], y: p[1], w: p[2], h: p[3] };
  }
  const w = parseFloat(root.getAttribute('width')), h = parseFloat(root.getAttribute('height'));
  if (w > 0 && h > 0) return { x: 0, y: 0, w, h };
  if (loadedImage && loadedImage.naturalWidth) return { x: 0, y: 0, w: loadedImage.naturalWidth, h: loadedImage.naturalHeight };
  return { x: 0, y: 0, w: 512, h: 512 };
}
function buildXmpMeta() {
  return '<x:xmpmeta xmlns:x="adobe:ns:meta/">'
    + '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
    + '<rdf:Description rdf:about=""'
    + ' xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"'
    + ' xmlns:dc="http://purl.org/dc/elements/1.1/">'
    + '<Iptc4xmpExt:DigitalSourceType>' + DST_URI[labelType] + '</Iptc4xmpExt:DigitalSourceType>'
    + '<dc:description><rdf:Alt><rdf:li xml:lang="x-default">Labelled with Benti (EU AI Act Art. 50)</rdf:li></rdf:Alt></dc:description>'
    + '</rdf:Description></rdf:RDF></x:xmpmeta>';
}
// Icon als self-contained data-URI (EU: Vektor-SVG; Custom: dessen data-URL)
async function svgLabelIconHref(layout) {
  if (layout.isEu) {
    const euType = (euIconStyle === 'compact') ? 'ai' : labelType;
    const color = (layout.zoneLum > 128) ? 'black' : 'white';
    try { return svgTextToDataUri(await fetchSvgText(euIconSvgPath(euType, color, layout.euTransparent))); }
    catch (e) { console.warn('[SVG] EU-Icon nicht ladbar:', e); return null; }
  }
  const src = layout.logoImg && layout.logoImg.src;
  return (src && src.indexOf('data:') === 0) ? src : null;   // externe/blob-Quellen: nicht einbetten
}

async function generateSvgOutput(rawSvg, analysisRes) {
  const doc = new DOMParser().parseFromString(rawSvg, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length) return null;
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') return null;

  const SVGNS = 'http://www.w3.org/2000/svg';
  const XLINK = 'http://www.w3.org/1999/xlink';
  const vp = svgViewport(root);
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', vp.x + ' ' + vp.y + ' ' + vp.w + ' ' + vp.h);

  const layout = computeLabelLayout(vp.w, vp.h, analysisRes);
  if (!layout) return null;

  // 1) XMP ins <metadata>
  let metaEl = Array.from(root.children).find(c => c.nodeName.toLowerCase() === 'metadata');
  if (!metaEl) { metaEl = doc.createElementNS(SVGNS, 'metadata'); root.insertBefore(metaEl, root.firstChild); }
  try {
    const xmpDoc = new DOMParser().parseFromString(buildXmpMeta(), 'application/xml');
    if (!xmpDoc.getElementsByTagName('parsererror').length)
      metaEl.appendChild(doc.importNode(xmpDoc.documentElement, true));
  } catch (e) { console.warn('[SVG] XMP-Metadaten übersprungen:', e); }

  // 2) Label als Vektor-Gruppe (im Koordinatenraum des Bildes)
  const g = doc.createElementNS(SVGNS, 'g');
  g.setAttribute('data-benti-label', '1');
  if (vp.x || vp.y) g.setAttribute('transform', 'translate(' + vp.x + ' ' + vp.y + ')');
  const set = (el, a) => { for (const k in a) el.setAttribute(k, a[k]); };

  if (layout.mode === 'logo') {
    if (layout.plate) {
      const p = layout.plate, rect = doc.createElementNS(SVGNS, 'rect');
      set(rect, { x: p.x, y: p.y, width: p.w, height: p.h, rx: p.r, ry: p.r,
        fill: p.light ? '#ffffff' : '#141419', 'fill-opacity': p.alpha.toFixed(3) });
      g.appendChild(rect);
    }
    const href = await svgLabelIconHref(layout);
    // EU-Icon nicht ladbar => lieber abbrechen als eine SVG ohne sichtbares Label
    // auszugeben (und im Protokoll als gekennzeichnet zu fuehren).
    if (!href && layout.isEu) return null;
    if (href) {
      const im = doc.createElementNS(SVGNS, 'image');
      set(im, { x: layout.lx, y: layout.ly, width: layout.lw, height: layout.lh });
      im.setAttribute('href', href);
      im.setAttributeNS(XLINK, 'xlink:href', href);   // Kompatibilität mit älteren Renderern
      if (!(layout.isEu && layout.euTransparent)) im.setAttribute('opacity', layout.opacity);
      g.appendChild(im);
    }
    if (layout.withCaption) {
      const t = doc.createElementNS(SVGNS, 'text');
      set(t, { x: layout.capCX, y: layout.capY + layout.capSize * 0.85, 'text-anchor': 'middle',
        'font-family': "'Segoe UI', sans-serif", 'font-weight': '700', 'font-size': layout.capSize,
        fill: layout.zoneLum > 128 ? '#000000' : '#ffffff', opacity: layout.opacity });
      t.textContent = layout.caption;
      g.appendChild(t);
    }
  } else {
    const t = doc.createElementNS(SVGNS, 'text');
    set(t, { x: layout.tx, y: layout.ty + layout.fontSize * 0.35,
      'font-family': "'Segoe UI', sans-serif", 'font-weight': '700', 'font-size': layout.fontSize,
      fill: layout.color, opacity: layout.opacity });
    t.textContent = layout.text;
    g.appendChild(t);
  }
  root.appendChild(g);

  const out = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(root);
  const bytes = new TextEncoder().encode(out);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/svg+xml' }));
  return { rawUrl: url, finalUrl: url, finalBytes: bytes, ext: 'svg', metaNote: '' };
}

// ═══════════════════════════════════════════════════════════════════════════
// Unsichtbares Wasserzeichen (Ebene 3) – DCT-QIM, blind, mit Magic-Prefix.
// Zusätzliche unsichtbare Markierung. Überlebt Metadaten-Strippen (Screenshot,
// „Für Web speichern", Formatwechsel) und moderate Re-Kompression; bei starker
// Verkleinerung NICHT garantiert (ehrliche Grenze, s. docs/downscale-robustness.md).
// Ersetzt niemals das sichtbare Label (Art. 50 verlangt Wahrnehmbarkeit).
// ═══════════════════════════════════════════════════════════════════════════
const WM_N = 8, WM_U = 2, WM_V = 1, WM_COEF = WM_U * WM_N + WM_V, WM_DELTA = 12;
const WM_MAGIC = [1, 0, 1, 1, 0, 0, 1, 0];            // fester Prefix gegen Falschtreffer
const WM_TYPE = { 'ai-generated': [0, 0], 'ai-modified': [0, 1] };
let _wmC = null;
function wmCos() {
  if (_wmC) return _wmC;
  const C = new Float64Array(WM_N * WM_N);
  for (let k = 0; k < WM_N; k++) {
    const a = k === 0 ? Math.sqrt(1 / WM_N) : Math.sqrt(2 / WM_N);
    for (let n = 0; n < WM_N; n++) C[k * WM_N + n] = a * Math.cos(Math.PI * (2 * n + 1) * k / (2 * WM_N));
  }
  _wmC = C; return C;
}
function wmMul(A, B) {
  const o = new Float64Array(WM_N * WM_N);
  for (let i = 0; i < WM_N; i++) for (let j = 0; j < WM_N; j++) {
    let s = 0; for (let k = 0; k < WM_N; k++) s += A[i * WM_N + k] * B[k * WM_N + j]; o[i * WM_N + j] = s;
  }
  return o;
}
function wmFwd(f) { const C = wmCos(), Ct = wmT(C); return wmMul(wmMul(C, f), Ct); }
function wmInv(F) { const C = wmCos(), Ct = wmT(C); return wmMul(wmMul(Ct, F), C); }
function wmT(A) { const o = new Float64Array(WM_N * WM_N); for (let i = 0; i < WM_N; i++) for (let j = 0; j < WM_N; j++) o[i * WM_N + j] = A[j * WM_N + i]; return o; }
const wmParity = q => ((q % 2) + 2) % 2;
function wmPayload() { return WM_MAGIC.concat(WM_TYPE[labelType] || WM_TYPE['ai-generated']); }

// Bettet die Nutzlast wiederholt in den Grünkanal einer ImageData ein.
function wmEmbedData(d, W, H, payload) {
  const data = d.data, nbx = W >> 3, nby = H >> 3, L = payload.length;
  for (let by = 0; by < nby; by++) for (let bx = 0; bx < nbx; bx++) {
    const bit = payload[(by * nbx + bx) % L];
    const f = new Float64Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) f[y * 8 + x] = data[(((by * 8 + y) * W) + (bx * 8 + x)) * 4 + 1];
    const F = wmFwd(f); const cq = F[WM_COEF] / WM_DELTA; let q = Math.round(cq);
    if (wmParity(q) !== bit) q += (cq > q) ? 1 : -1;
    F[WM_COEF] = q * WM_DELTA; const g = wmInv(F);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const px = (((by * 8 + y) * W) + (bx * 8 + x)) * 4 + 1;
      data[px] = Math.max(0, Math.min(255, Math.round(g[y * 8 + x])));
    }
  }
}
function embedInvisibleWatermark(canvas) {
  const ctx = canvas.getContext('2d');
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  wmEmbedData(id, canvas.width, canvas.height, wmPayload());
  ctx.putImageData(id, 0, 0);
}

// Liest die Nutzlast blind aus einer ImageData (Mehrheitsentscheid je Position).
function wmDetectData(d, W, H, L) {
  const data = d.data, nbx = W >> 3, nby = H >> 3;
  const ones = new Int32Array(L), tot = new Int32Array(L);
  for (let by = 0; by < nby; by++) for (let bx = 0; bx < nbx; bx++) {
    const pos = (by * nbx + bx) % L;
    const f = new Float64Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) f[y * 8 + x] = data[(((by * 8 + y) * W) + (bx * 8 + x)) * 4 + 1];
    const F = wmFwd(f); const b = wmParity(Math.round(F[WM_COEF] / WM_DELTA));
    tot[pos]++; if (b === 1) ones[pos]++;
  }
  const bits = [], conf = [];
  for (let i = 0; i < L; i++) { const one = ones[i] * 2 >= tot[i] ? 1 : 0; bits.push(one); conf.push(tot[i] ? Math.abs(ones[i] / tot[i] - 0.5) * 2 : 0); }
  return { bits, conf };
}
// Bewertet ein Detektionsergebnis: Magic muss stimmen; Score = mittlere Konfidenz.
function wmScore(res) {
  for (let i = 0; i < WM_MAGIC.length; i++) if (res.bits[i] !== WM_MAGIC[i]) return null;
  const typeBits = res.bits.slice(8, 10);
  const type = (typeBits[0] === 0 && typeBits[1] === 1) ? 'ai-modified' : 'ai-generated';
  const magicConf = res.conf.slice(0, WM_MAGIC.length).reduce((a, b) => a + b, 0) / WM_MAGIC.length;
  return { type, magicConf };
}
// Prüft ein Bild-Element blind, inkl. Skalen-Suche gegen moderates Verkleinern.
function detectInvisibleWatermark(img) {
  const L = WM_MAGIC.length + 2;
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  if (!w0 || !h0) return { found: false };
  const cvs = document.createElement('canvas'), ctx = cvs.getContext('2d');
  // Native Auflösung zuerst (Metadaten-Strippen ohne Resize), dann Rück-Skalierung
  // auf mutmaßliche Originalgrößen (Bild wurde evtl. verkleinert).
  const scales = [1, 1.11, 1.25, 1.33, 1.5, 1.67, 2, 2.5, 3];
  let best = null;
  for (const k of scales) {
    const w = Math.min(6000, Math.round(w0 * k)), h = Math.min(6000, Math.round(h0 * k));
    if (w < 32 || h < 32) continue;
    cvs.width = w; cvs.height = h;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    const res = wmScore(wmDetectData(ctx.getImageData(0, 0, w, h), w, h, L));
    if (res && (!best || res.magicConf > best.magicConf)) best = { ...res, scale: k };
    if (res && res.magicConf > 0.6) break;   // klarer Treffer – Suche abbrechen
  }
  return best ? { found: true, type: best.type, confidence: best.magicConf, scale: best.scale } : { found: false };
}

async function applyWatermark() {
  if (!loadedImage) return;
  // US-3.6: SVG-Eingabe bleibt Vektor – eigener Export-Pfad
  if (isSvgInput && svgText) {
    const urls = await generateSvgOutput(svgText, analysisResult);
    if (!urls) { setAIStatus('idle', 'SVG konnte nicht verarbeitet werden (ungültige Struktur?).'); return; }
    {
      const srcFile = currentFiles[currentPreviewIndex] || currentFiles[0];
      const fname = buildFilename(srcFile ? srcFile.name : 'bild',
        { n: 1, w: loadedImage.naturalWidth, h: loadedImage.naturalHeight, ext: 'svg' });
      singleOutput = { bytes: urls.finalBytes, filename: fname };
      btnDownload.href = urls.finalUrl;
      btnDownload.download = fname;
    }
    labeledPreviewSrc = urls.rawUrl;
    previewImg.src = urls.rawUrl;
    logAuditEntry(currentFiles[currentPreviewIndex] || currentFiles[0], urls.finalBytes);
    downloadSection.style.display = 'flex';
    btnCompare.style.display = 'block';
    updateLabelPreview();
    const hadC2pa = provResults[currentPreviewIndex] && provResults[currentPreviewIndex].c2pa;
    setAIStatus('active', hadC2pa
      ? '✓ SVG gekennzeichnet – Vektor bleibt erhalten, XMP im <metadata>. Eine frühere C2PA-Signatur wird dadurch ungültig.'
      : '✓ SVG gekennzeichnet – Vektor bleibt erhalten (Label als Vektor, XMP im <metadata>).');
    return;
  }
  // US-3.7: Original-Bytes für den Metadaten-Erhalt mitgeben
  const srcFile = currentFiles[currentPreviewIndex] || currentFiles[0];
  let origBytes = null;
  if (srcFile) {
    try { origBytes = new Uint8Array(await srcFile.arrayBuffer()); }
    catch (err) { console.warn('[Meta] Original nicht lesbar, Export ohne Metadaten-Erhalt:', err); }
  }
  const urls = generateWatermarkDataUrl(loadedImage, analysisResult, origBytes);
  if (!urls) {
    setAIStatus('idle', (wmMode === 'logo' && logoSource === 'eu')
      ? 'EU-Label l\u00e4dt noch \u2013 bitte gleich nochmal klicken.'
      : '\u26a0 Bitte zuerst ein Logo hochladen.');
    return;
  }
  {
    const dims = effectiveOutputDims();
    const srcFile = currentFiles[currentPreviewIndex] || currentFiles[0];
    const fname = buildFilename(srcFile ? srcFile.name : 'bild', { n: 1, w: dims.W, h: dims.H, ext: urls.ext });
    singleOutput = { bytes: urls.finalBytes, filename: fname };
    btnDownload.href = urls.finalUrl;
    btnDownload.download = fname;
  }
  labeledPreviewSrc = urls.rawUrl;
  previewImg.src   = urls.rawUrl;
  logAuditEntry(currentFiles[currentPreviewIndex] || currentFiles[0], urls.finalBytes);
  downloadSection.style.display = 'flex';
  btnCompare.style.display = 'block';
  updateLabelPreview();
  updateDPIInfo();
  // US-3.4: eine vorhandene C2PA-Signatur \u00fcberlebt die Bearbeitung nicht
  const hadC2pa = provResults[currentPreviewIndex] && provResults[currentPreviewIndex].c2pa;
  const fmtNote = (exportFormat === 'png') ? selectedDPI + ' DPI' : exportFormat.toUpperCase();
  const metaNote = urls.metaNote || '';
  setAIStatus('active', (hadC2pa
    ? '\u2713 Kennzeichnung angewendet \u2013 die urspr\u00fcngliche C2PA-Signatur ist damit ung\u00fcltig; sichtbares Label + XMP \u00fcbernehmen die Kennzeichnung. (' + fmtNote + ')'
    : '\u2713 Kennzeichnung angewendet! (' + fmtNote + ')') + metaNote);
}

async function processBatchFiles() {
  btnApply.disabled = true;
  batchProgressWrap.style.display = 'flex';
  
  for (let i = 0; i < currentFiles.length; i++) {
    const file = currentFiles[i];
    batchProgressText.textContent = `Verarbeite Bild ${i + 1} von ${currentFiles.length}...`;
    batchProgressFill.style.width = (((i) / currentFiles.length) * 100) + '%';
    
    // Load image
    const img = await new Promise((resolve, reject) => {
      const tempImg = new Image();
      tempImg.onload = () => resolve(tempImg);
      tempImg.onerror = reject;
      tempImg.src = URL.createObjectURL(file);
    });
    
    // Slight delay to allow UI to breathe (and avoid download throttling)
    await new Promise(r => setTimeout(r, 150));
    
    // Apply the per-image position override for this file (if set)
    const globalPos = { mode: selectedPosition, x: manualPosX, y: manualPosY };
    const ov = imageOverrides[i];
    if (ov) { selectedPosition = ov.posMode; manualPosX = ov.posX; manualPosY = ov.posY; }

    let res = null;
    if (selectedPosition === 'ai') {
      res = analyzeImageSync(img);
    }

    // US-3.6: SVG im Batch bleibt Vektor (eigener Pfad); unsichere SVGs überspringen
    let urls;
    const fileIsSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '');
    if (fileIsSvg) {
      let raw = null;
      try { raw = await file.text(); } catch (e) { raw = null; }
      const bad = raw ? svgSecurityReject(raw) : 'unlesbar';
      if (raw && !bad) {
        const prevSvg = isSvgInput; isSvgInput = true;   // svgViewport nutzt ggf. loadedImage-Fallback
        urls = await generateSvgOutput(raw, res);
        isSvgInput = prevSvg;
      } else {
        console.warn('[Batch] SVG übersprungen:', file.name, bad);
      }
    } else {
      // US-3.7: Original-Bytes für den Metadaten-Erhalt mitgeben
      let origBytes = null;
      try { origBytes = new Uint8Array(await file.arrayBuffer()); }
      catch (err) { console.warn('[Meta] Original nicht lesbar, Export ohne Metadaten-Erhalt:', err); }
      urls = generateWatermarkDataUrl(img, res, origBytes);
    }

    // Restore the global position state
    selectedPosition = globalPos.mode; manualPosX = globalPos.x; manualPosY = globalPos.y;

    if (urls && urls.finalBytes) {
      const fname = buildFilename(file.name, { n: i + 1, w: img.naturalWidth, h: img.naturalHeight, ext: urls.ext });
      await saveLabeledFile(urls.finalBytes, fname);
      logAuditEntry(file, urls.finalBytes);
    }
  }

  batchProgressFill.style.width = '100%';
  batchProgressText.textContent = `Fertig! ${currentFiles.length} Bilder im Download-Ordner gespeichert.`;
  // innerHTML, damit das Refresh-SVG-Icon des Buttons erhalten bleibt
  btnReset.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4"/></svg> Neuer Upload';
  btnApply.disabled = false;
  setAIStatus('active', `\u2713 Batch fertig \u2013 ${currentFiles.length} Bilder im Download-Ordner!`);
}

// chrome.downloads with error handling; falls back to anchor download (same
// mechanism as the single-image button) when the API call fails silently
function downloadBatchFile(url, filename) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({ url: url, filename: filename, saveAs: false }, (downloadId) => {
        if (chrome.runtime.lastError || downloadId === undefined) {
          console.warn('[Batch] chrome.downloads fehlgeschlagen, nutze Fallback:',
            chrome.runtime.lastError && chrome.runtime.lastError.message);
          triggerAnchorDownload(url, filename);
        }
        resolve();
      });
    } else {
      triggerAnchorDownload(url, filename);
      resolve();
    }
  });
}

function triggerAnchorDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ═══════════════════════════════════════════════════════════════════════════
// Dateiname (Token-Muster à la IrfanView) & Ablageort (Downloads-Unterordner
// ODER frei gewählter Ordner via File System Access API)
// ═══════════════════════════════════════════════════════════════════════════
let namePattern       = '{name}_KI-gek';
let saveMode          = 'downloads';   // 'downloads' | 'folder'
let downloadSubfolder = '';
let dirHandle         = null;          // FileSystemDirectoryHandle (Ordner-Modus)
let singleOutput      = null;          // { bytes, filename, url } für den Einzel-Download

function pad2(n) { return String(n).padStart(2, '0'); }
// Ersetzt {token} im Muster; Unbekanntes bleibt wörtlich stehen.
function applyNamePattern(pattern, ctx) {
  return (pattern || '').replace(/\{(name|date|time|type|w|h|n(?::\d+)?)\}/g, (m, tok) => {
    if (tok === 'name') return ctx.name != null ? ctx.name : '';
    if (tok === 'date') return ctx.date;
    if (tok === 'time') return ctx.time;
    if (tok === 'type') return ctx.type;
    if (tok === 'w') return ctx.w != null ? String(ctx.w) : '';
    if (tok === 'h') return ctx.h != null ? String(ctx.h) : '';
    if (tok[0] === 'n') {
      const num = String(ctx.n != null ? ctx.n : '');
      const p = m.match(/\{n:(\d+)\}/);
      return p ? num.padStart(parseInt(p[1], 10), '0') : num;
    }
    return m;
  });
}
function nameCtx(extra) {
  const now = new Date();
  return Object.assign({
    date: now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()),
    time: pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds()),
    type: (labelType === 'ai-modified') ? 'KI-bearbeitet' : 'KI-generiert',
  }, extra || {});
}
// Baut den finalen Dateinamen inkl. Endung; bereinigt ungültige Zeichen.
function buildFilename(originalName, o) {
  const base = (originalName || 'bild').replace(/\.[^.]+$/, '');
  const ctx = nameCtx({ name: base, n: o.n, w: o.w, h: o.h });
  let s = applyNamePattern(namePattern || '{name}_KI-gek', ctx).trim();
  s = s.replace(/[\\/:*?"<>|]/g, '_').replace(/[. ]+$/, '');   // ungültige Zeichen + Punkt/Space am Ende
  if (!s) s = base + '_KI-gek';
  return s + '.' + o.ext;
}
// Unterordner-Pfad säubern (Slashes bleiben Trenner, Tokens erlaubt)
function sanitizeSubfolder(s) {
  return applyNamePattern(s || '', nameCtx({ name: '', n: '' }))
    .split('/').map(seg => seg.replace(/[\\:*?"<>|]/g, '_').trim()).filter(Boolean).join('/');
}

// ── File System Access: Handle in IndexedDB persistieren ────────────────────
function idbReq(mode, fn) {
  return new Promise((resolve) => {
    let db; const r = indexedDB.open('benti_fs', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => { db = r.result; const tx = db.transaction('kv', mode); const os = tx.objectStore('kv'); fn(os, resolve); };
    r.onerror = () => resolve(null);
  });
}
function idbSet(k, v) { return idbReq('readwrite', (os, res) => { os.put(v, k); os.transaction.oncomplete = () => res(true); }); }
function idbGet(k) { return idbReq('readonly', (os, res) => { const g = os.get(k); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); }); }

async function ensureFolderPermission() {
  if (!dirHandle) return false;
  const opts = { mode: 'readwrite' };
  try {
    if ((await dirHandle.queryPermission(opts)) === 'granted') return true;
    return (await dirHandle.requestPermission(opts)) === 'granted';
  } catch (e) { return false; }
}
// Zentrale Speicherfunktion: Ordner-Modus ODER Downloads (+ Unterordner).
async function saveLabeledFile(data, filename) {
  const blob = data instanceof Blob ? data : new Blob([data]);
  if (saveMode === 'folder' && dirHandle) {
    try {
      if (await ensureFolderPermission()) {
        const fh = await dirHandle.getFileHandle(filename, { create: true });
        const w = await fh.createWritable();
        await w.write(blob); await w.close();
        return true;
      }
    } catch (e) { console.warn('[Save] Ordner-Schreiben fehlgeschlagen, Fallback Downloads:', e); }
  }
  const sub = sanitizeSubfolder(downloadSubfolder);
  const full = sub ? (sub + '/' + filename) : filename;
  await downloadBatchFile(URL.createObjectURL(blob), full);
  return true;
}

// ── UI-Verdrahtung: Namensschema + Ablageort ────────────────────────────────
const namePatternInput = document.getElementById('namePattern');
const namePreview      = document.getElementById('namePreview');
const subfolderInput   = document.getElementById('downloadSubfolder');
const saveModeButtons  = document.querySelectorAll('#saveModeGroup [data-savemode]');
const subfolderRow     = document.getElementById('subfolderRow');
const folderRow        = document.getElementById('folderRow');
const pickFolderBtn    = document.getElementById('pickFolderBtn');
const folderInfo       = document.getElementById('folderInfo');

function updateNamePreview() {
  if (namePreview) namePreview.textContent = buildFilename('Produktfoto.png', { n: 1, w: 1600, h: 1200, ext: 'png' });
}
function updateSaveModeUI() {
  if (subfolderRow) subfolderRow.style.display = (saveMode === 'downloads') ? '' : 'none';
  if (folderRow) folderRow.style.display = (saveMode === 'folder') ? '' : 'none';
  saveModeButtons.forEach(b => b.classList.toggle('active', b.dataset.savemode === saveMode));
}
function updateFolderInfo() {
  if (folderInfo) folderInfo.textContent = dirHandle
    ? ('Ziel-Ordner: „' + dirHandle.name + '" – dorthin werden die Bilder gespeichert.')
    : 'Kein Ordner gewählt – es wird nach Downloads gespeichert.';
}
if (namePatternInput) {
  namePatternInput.value = namePattern;
  namePatternInput.addEventListener('input', () => { namePattern = namePatternInput.value; updateNamePreview(); saveSettings(); });
}
if (subfolderInput) subfolderInput.addEventListener('input', () => { downloadSubfolder = subfolderInput.value; saveSettings(); });
saveModeButtons.forEach(btn => btn.addEventListener('click', () => { saveMode = btn.dataset.savemode; updateSaveModeUI(); saveSettings(); }));
if (pickFolderBtn) pickFolderBtn.addEventListener('click', async () => {
  if (!window.showDirectoryPicker) { setAIStatus('idle', '„Ordner wählen" wird von diesem Browser nicht unterstützt – nutze den Downloads-Unterordner.'); return; }
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    try { await idbSet('dir', dirHandle); } catch (e) { /* Persistenz best-effort */ }
    updateFolderInfo(); saveSettings();
  } catch (e) { /* Auswahl abgebrochen */ }
});
(async () => { try { const h = await idbGet('dir'); if (h) { dirHandle = h; updateFolderInfo(); } } catch (e) { /* ignore */ } })();
updateNamePreview();
updateSaveModeUI();

// Einzel-Download: bei Ordner-Modus oder gesetztem Unterordner über die zentrale
// Speicherfunktion leiten; sonst lädt der Anchor normal nach Downloads.
if (btnDownload) btnDownload.addEventListener('click', async (e) => {
  if (!singleOutput) return;
  if (saveMode === 'folder' || (downloadSubfolder && downloadSubfolder.trim())) {
    e.preventDefault();
    try { await saveLabeledFile(singleOutput.bytes, singleOutput.filename); setAIStatus('active', '✓ Gespeichert: ' + singleOutput.filename); }
    catch (err) { setAIStatus('idle', 'Speichern fehlgeschlagen.'); console.warn('[Save]', err); }
  }
});


// ═══════════════════════════════════════════════════════════
// DPI Export System
// ═══════════════════════════════════════════════════════════

let selectedDPI  = 300;
let selectedMode = 'metadata';   // 'metadata' | 'upscale'

// ── Export format (US-3.5): PNG (mit XMP+DPI) / JPEG (mit XMP) / WebP ───────
let exportFormat  = 'png';
let exportQuality = 90;
const QUALITY_STEPS = [75, 90, 98];   // Kleine Datei · Ausgewogen · Maximal

function updateFormatUI() {
  document.querySelectorAll('#fmtBtnGroup .dpi-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.fmt === exportFormat));
  const isPng  = exportFormat === 'png';
  // DPI lässt sich überall dort schreiben, wo das Format ein Dichte-Feld hat:
  // PNG (pHYs) und JPEG (JFIF-APP0). WebP kennt keins.
  const hasDpi = isPng || exportFormat === 'jpeg';
  const qualityRow = document.getElementById('qualityRow');
  const fmtInfo    = document.getElementById('fmtInfo');
  if (qualityRow) qualityRow.style.display = isPng ? 'none' : 'block';
  const dpiBtns  = document.getElementById('dpiBtnGroup');
  const dpiModes = document.getElementById('dpiModeGroup');
  const dpiInfo  = document.getElementById('dpiInfo');
  const dpiNote  = document.getElementById('dpiModeNote');
  if (dpiBtns)  dpiBtns.style.display  = hasDpi ? '' : 'none';
  if (dpiModes) dpiModes.style.display = hasDpi ? '' : 'none';
  if (dpiInfo)  dpiInfo.style.display  = hasDpi ? '' : 'none';
  if (dpiNote)  dpiNote.style.display  = hasDpi ? '' : 'none';
  if (fmtInfo) {
    if (exportFormat === 'webp') {
      fmtInfo.textContent = 'WebP: kleinste Dateien, aber ohne XMP-Metadaten und ohne DPI-Feld – die maschinenlesbare Kennzeichnung entfällt, nur das sichtbare Label bleibt';
      fmtInfo.style.display = 'block';
    } else if (exportFormat === 'jpeg') {
      fmtInfo.textContent = 'JPEG mit eingebetteter XMP-Kennzeichnung und DPI-Angabe im JFIF-Header';
      fmtInfo.style.display = 'block';
    } else {
      fmtInfo.style.display = 'none';
    }
  }
  updateSizeEstimate();
}
document.querySelectorAll('#fmtBtnGroup .dpi-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    exportFormat = btn.dataset.fmt;
    updateFormatUI();
    saveSettings();
  });
});
function updateQualityUI() {
  document.querySelectorAll('#qualityBtnGroup .dpi-btn').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.q) === exportQuality));
}
document.querySelectorAll('#qualityBtnGroup .dpi-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    exportQuality = parseInt(btn.dataset.q);
    updateQualityUI();
    updateSizeEstimate();
    saveSettings();
  });
});

// ── Dateigröße je Qualitätsstufe (US-3.5) ───────────────────────────────────
// „Kleine Datei / Ausgewogen / Maximal" sagt für sich genommen nichts aus –
// erst die tatsächliche Dateigröße macht die Stufen vergleichbar. Es wird
// deshalb real enkodiert (alle drei Stufen), nur eben ohne Label/Metadaten,
// weshalb der Wert als Näherung ausgewiesen wird.
let sizeEstimateRun = 0;
function formatBytes(n) {
  return (n >= 1024 * 1024)
    ? (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB'
    : Math.round(n / 1024).toLocaleString('de-DE') + ' KB';
}
function updateSizeEstimate() {
  const out = document.getElementById('qualitySizes');
  if (!out) return;
  if (exportFormat === 'png') return;            // Zeile ist bei PNG ausgeblendet
  if (!loadedImage || isSvgInput) { out.textContent = 'Dateigröße: Bild laden'; return; }
  const run = ++sizeEstimateRun;
  out.textContent = 'Dateigröße wird berechnet …';
  const dims = (typeof effectiveOutputDims === 'function') ? effectiveOutputDims() : null;
  const W = (dims && dims.W) || loadedImage.naturalWidth;
  const H = (dims && dims.H) || loadedImage.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.getContext('2d').drawImage(loadedImage, 0, 0, W, H);
  const mime = (exportFormat === 'jpeg') ? 'image/jpeg' : 'image/webp';
  const labels = { 75: 'Klein', 90: 'Ausgewogen', 98: 'Maximal' };
  Promise.all(QUALITY_STEPS.map(q => new Promise(res =>
    c.toBlob(b => res(b ? b.size : 0), mime, q / 100)
  ))).then(sizes => {
    if (run !== sizeEstimateRun) return;         // inzwischen überholt
    out.textContent = 'ca. ' + QUALITY_STEPS
      .map((q, i) => labels[q] + ' ' + formatBytes(sizes[i]))
      .join(' · ');
  }).catch(() => { if (run === sizeEstimateRun) out.textContent = ''; });
}

updateFormatUI();

// ── DPI Button Group ──────────────────────────────────────
document.querySelectorAll('.dpi-btn[data-dpi]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.dpi-btn[data-dpi]').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    selectedDPI = parseInt(this.dataset.dpi);
    console.log('[DPI] selectedDPI set to', selectedDPI);
    updateDPIInfo();
    saveSettings();
  });
});

// ── Mode Button Group ──────────────────────────────────────
document.querySelectorAll('.dpi-mode-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    if (this.disabled) return;
    document.querySelectorAll('.dpi-mode-btn').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    selectedMode = this.dataset.mode;
    console.log('[Mode] selectedMode set to', selectedMode);
    updateDPIInfo();
    saveSettings();
  });
});

// ── Update info display ────────────────────────────────────
function updateDPIInfo() {
  if (!loadedImage) return;
  const origW = loadedImage.naturalWidth;
  const origH = loadedImage.naturalHeight;
  const info  = document.getElementById('dpiInfo');

  let outW, outH;

  if (selectedMode === 'upscale') {
    const scaleFactor = selectedDPI / 96;
    outW = Math.round(origW * scaleFactor);
    outH = Math.round(origH * scaleFactor);
  } else {
    outW = origW;
    outH = origH;
  }

  // Physical print size in cm
  const printW_cm = (outW / selectedDPI * 2.54).toFixed(1);
  const printH_cm = (outH / selectedDPI * 2.54).toFixed(1);

  const modeLabel = selectedMode === 'upscale' ? ' \u00b7 Hochskaliert' : ' \u00b7 Nur Metadaten';
  const metaHint  = selectedMode === 'metadata' ? '<br><small style="color:#8888aa">Pixel bleiben unverändert – nur DPI-Info im PNG wird gesetzt</small>' : '';
  info.innerHTML = 'Ausgabe: <strong>' + outW.toLocaleString('de-DE') + ' \u00d7 ' + outH.toLocaleString('de-DE') + ' px</strong>' +
    ' \u00b7 ' + selectedDPI + ' DPI' + modeLabel +
    '<br>Druckgröße: ' + printW_cm + ' \u00d7 ' + printH_cm + ' cm' + metaHint;
}

// ═══════════════════════════════════════════════════════════
// PNG pHYs-Chunk Insertion
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// Phase 3: Maschinenlesbare KI-Kennzeichnung (XMP, TECH-SPEC §2/§4/§5)
// ═══════════════════════════════════════════════════════════

// XMP packet with the IPTC DigitalSourceType for the chosen label type
function buildXmpPacket() {
  return '<?xpacket begin="' + String.fromCharCode(0xFEFF) + '" id="W5M0MpCehiHzreSzNTczkc9d"?>'
    + '<x:xmpmeta xmlns:x="adobe:ns:meta/">'
    + '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
    + '<rdf:Description rdf:about=""'
    + ' xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"'
    + ' xmlns:dc="http://purl.org/dc/elements/1.1/">'
    + '<Iptc4xmpExt:DigitalSourceType>' + DST_URI[labelType] + '</Iptc4xmpExt:DigitalSourceType>'
    + '<dc:description><rdf:Alt><rdf:li xml:lang="x-default">Labelled with Benti (EU AI Act Art. 50)</rdf:li></rdf:Alt></dc:description>'
    + '</rdf:Description></rdf:RDF></x:xmpmeta>'
    + '<?xpacket end="w"?>';
}

function dataUrlToBytes(dataUrl) {
  const binStr = atob(dataUrl.split(',')[1]);
  const arr = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) arr[i] = binStr.charCodeAt(i);
  return arr;
}

// Generic PNG chunk: length + type + data + CRC32 (reuses existing crc32)
function buildPngChunk(type, data) {
  const len = data.length;
  const out = new Uint8Array(12 + len);
  out[0] = (len >>> 24) & 255; out[1] = (len >>> 16) & 255;
  out[2] = (len >>> 8) & 255;  out[3] = len & 255;
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const c = crc32(out.subarray(4, 8 + len));
  out[8 + len] = (c >>> 24) & 255; out[9 + len] = (c >>> 16) & 255;
  out[10 + len] = (c >>> 8) & 255; out[11 + len] = c & 255;
  return out;
}

// iTXt chunk carrying the XMP packet (US-3.1)
function buildITXtChunk(xmpString) {
  const te = new TextEncoder();
  const keyword = te.encode('XML:com.adobe.xmp');   // 17 bytes
  const text = te.encode(xmpString);
  const data = new Uint8Array(keyword.length + 5 + text.length);
  data.set(keyword, 0);
  // NUL, compression flag 0, compression method 0, empty lang tag NUL,
  // empty translated keyword NUL — then the UTF-8 XMP text
  data.set(text, keyword.length + 5);
  return buildPngChunk('iTXt', data);
}

// ── US-3.7: Metadaten-Erhalt ────────────────────────────────
// Der Canvas-Export strippt alle Original-Metadaten. Wir lesen EXIF und
// Nicht-XMP-Textchunks direkt aus den Original-Bytes und fügen sie in die
// Exportdatei wieder ein; vorhandenes XMP wird gemerged (nie ersetzt).

// EXIF (roher TIFF-Block ohne "Exif\0\0"-Header), XMP-String und
// kopierbare PNG-Textchunks aus den Original-Bytes sammeln
function extractOriginalMeta(bytes) {
  if (!bytes || bytes.length < 12) return null;
  const meta = { xmp: extractXmp(bytes), exif: null, pngTextChunks: [], srcFmt: null };
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    meta.srcFmt = 'png';
    let pos = 8;
    while (pos + 12 <= bytes.length) {
      const len = ((bytes[pos] << 24) | (bytes[pos+1] << 16) | (bytes[pos+2] << 8) | bytes[pos+3]) >>> 0;
      const type = String.fromCharCode(bytes[pos+4], bytes[pos+5], bytes[pos+6], bytes[pos+7]);
      if (type === 'IEND') break;
      if (pos + 12 + len > bytes.length) break;
      if (type === 'eXIf') {
        meta.exif = bytes.slice(pos + 8, pos + 8 + len);
      } else if (type === 'tEXt' || type === 'zTXt') {
        meta.pngTextChunks.push(bytes.slice(pos, pos + 12 + len));
      } else if (type === 'iTXt' && len > 17) {
        // XMP-iTXt nicht roh kopieren – das läuft über den Merge
        const kw = String.fromCharCode.apply(null, bytes.subarray(pos + 8, pos + 8 + 17));
        if (kw !== 'XML:com.adobe.xmp') meta.pngTextChunks.push(bytes.slice(pos, pos + 12 + len));
      }
      pos += 12 + len;
    }
  } else if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    meta.srcFmt = 'jpeg';
    let pos = 2;
    while (pos + 4 <= bytes.length && bytes[pos] === 0xFF) {
      const marker = bytes[pos + 1];
      if (marker === 0xDA || marker === 0xD9) break;
      const segLen = (bytes[pos + 2] << 8) | bytes[pos + 3];
      if (segLen < 2) break;
      if (marker === 0xE1 && segLen > 8
          && bytes[pos+4] === 0x45 && bytes[pos+5] === 0x78 && bytes[pos+6] === 0x69
          && bytes[pos+7] === 0x66 && bytes[pos+8] === 0 && bytes[pos+9] === 0) {
        meta.exif = bytes.slice(pos + 10, pos + 2 + segLen);
      }
      pos += 2 + segLen;
    }
  } else if (bytes.length > 16
      && String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF'
      && String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WEBP') {
    meta.srcFmt = 'webp';
    let pos = 12;
    while (pos + 8 <= bytes.length) {
      const cc = String.fromCharCode(bytes[pos], bytes[pos+1], bytes[pos+2], bytes[pos+3]);
      const size = (bytes[pos+4] | (bytes[pos+5] << 8) | (bytes[pos+6] << 16) | (bytes[pos+7] << 24)) >>> 0;
      if (cc === 'EXIF') meta.exif = bytes.slice(pos + 8, pos + 8 + size);
      pos += 8 + size + (size % 2);
    }
  }
  if (!meta.xmp && !meta.exif && !meta.pngTextChunks.length) return null;
  return meta;
}

// Der Canvas brennt die EXIF-Drehung in die Pixel ein – ein mitkopiertes
// Orientation-Tag ≠ 1 würde das Bild beim Betrachten doppelt drehen
function neutralizeExifOrientation(exif) {
  const e = exif.slice();
  const le = (e[0] === 0x49 && e[1] === 0x49);
  const be = (e[0] === 0x4D && e[1] === 0x4D);
  if (!le && !be) return e;
  const rd16 = o => le ? (e[o] | (e[o+1] << 8)) : ((e[o] << 8) | e[o+1]);
  const rd32 = o => le
    ? ((e[o] | (e[o+1] << 8) | (e[o+2] << 16) | (e[o+3] << 24)) >>> 0)
    : (((e[o] << 24) | (e[o+1] << 16) | (e[o+2] << 8) | e[o+3]) >>> 0);
  const ifd = rd32(4);
  if (ifd + 2 > e.length) return e;
  const n = rd16(ifd);
  for (let i = 0; i < n; i++) {
    const off = ifd + 2 + i * 12;
    if (off + 12 > e.length) break;
    if (rd16(off) === 0x0112) {
      const v = off + 8;
      if (le) { e[v] = 1; e[v+1] = 0; } else { e[v] = 0; e[v+1] = 1; }
    }
  }
  return e;
}

// DigitalSourceType in ein vorhandenes XMP-Paket mergen; alle übrigen
// Felder (Copyright, Credit, …) bleiben byte-identisch erhalten
function mergeXmpPacket(origXmp) {
  if (!origXmp) return buildXmpPacket();
  const uri = DST_URI[labelType];
  // Element-Form (beliebiges Präfix): Wert ersetzen
  const elRe = /<([A-Za-z0-9_.-]+):DigitalSourceType(\s[^>]*)?>[\s\S]*?<\/\1:DigitalSourceType>/;
  if (elRe.test(origXmp)) {
    return origXmp.replace(elRe, (m, p) =>
      '<' + p + ':DigitalSourceType>' + uri + '</' + p + ':DigitalSourceType>');
  }
  // Attribut-Form: Wert ersetzen
  const atRe = /([A-Za-z0-9_.-]+:DigitalSourceType\s*=\s*")[^"]*(")/;
  if (atRe.test(origXmp)) return origXmp.replace(atRe, '$1' + uri + '$2');
  // Noch nicht vorhanden: in die erste rdf:Description einfügen
  const NS = 'http://iptc.org/std/Iptc4xmpExt/2008-02-29/';
  const nsm = origXmp.match(new RegExp('xmlns:([A-Za-z0-9_.-]+)\\s*=\\s*"' + NS + '"'));
  const prefix = nsm ? nsm[1] : 'Iptc4xmpExt';
  const xmlnsDecl = nsm ? '' : ' xmlns:' + prefix + '="' + NS + '"';
  const openRe = /<rdf:Description\b[^>]*?(\/?)>/;
  const m = origXmp.match(openRe);
  if (!m) {
    console.warn('[XMP-Merge] Kein rdf:Description im Original-XMP gefunden – nutze frisches Paket');
    return buildXmpPacket();
  }
  if (m[1] === '/') {
    // Self-closing Description: als Attribut ergänzen
    return origXmp.replace(openRe,
      m[0].slice(0, -2) + xmlnsDecl + ' ' + prefix + ':DigitalSourceType="' + uri + '"/>');
  }
  return origXmp.replace(openRe,
    m[0].slice(0, -1) + xmlnsDecl + '>'
    + '<' + prefix + ':DigitalSourceType>' + uri + '</' + prefix + ':DigitalSourceType>');
}

// Kurzer Statuszeilen-Zusatz: was wurde übernommen, was entfällt
function preservedMetaNote(meta) {
  if (!meta) return '';
  if (exportFormat === 'webp') {
    return ' · Original-Metadaten (EXIF/XMP) können in WebP nicht übernommen werden';
  }
  const kept = [];
  if (meta.exif) kept.push('EXIF');
  if (meta.xmp) kept.push('XMP/Copyright');
  if (meta.pngTextChunks.length && exportFormat === 'png') kept.push('PNG-Text');
  let note = kept.length ? ' · Original-Metadaten übernommen: ' + kept.join(', ') : '';
  if (meta.pngTextChunks.length && exportFormat !== 'png') {
    note += ' · PNG-Textfelder entfallen beim ' + exportFormat.toUpperCase() + '-Export';
  }
  return note;
}

// APP1 XMP segment for JPEG, inserted after SOI/APP0 (US-3.2);
// bei US-3.7 zusätzlich das kopierte EXIF-Segment davor
// JPEG-Gegenstück zum pHYs-Chunk: die Auflösung steht im JFIF-APP0-Segment.
// Layout ab SOI: FF D8 | FF E0 len(2) | "JFIF\0"(5) | Version(2) | units(1) |
// Xdensity(2) | Ydensity(2) | … – Canvas schreibt units=0 (seitenverhältnis-
// only), wir setzen units=1 (dots per inch) plus die gewählte DPI-Zahl.
function setJpegDpi(bytes, dpi) {
  if (bytes[2] !== 0xFF || bytes[3] !== 0xE0) return bytes;   // kein APP0 an Position 2
  const isJfif = bytes[6] === 0x4A && bytes[7] === 0x46 &&    // "JFIF"
                 bytes[8] === 0x49 && bytes[9] === 0x46 && bytes[10] === 0x00;
  if (!isJfif) return bytes;
  bytes[13] = 1;                                             // units: 1 = dots per inch
  bytes[14] = (dpi >>> 8) & 255; bytes[15] = dpi & 255;      // Xdensity
  bytes[16] = (dpi >>> 8) & 255; bytes[17] = dpi & 255;      // Ydensity
  return bytes;
}

function insertJpegXmp(bytes, meta) {
  const te = new TextEncoder();
  const ns = te.encode('http://ns.adobe.com/xap/1.0/\0');
  let xmp = te.encode(mergeXmpPacket(meta && meta.xmp));
  if (2 + ns.length + xmp.length > 65533) {
    // Extended-XMP (Aufteilung auf mehrere Segmente) bewusst nicht gebaut
    console.warn('[XMP-Merge] Gemergtes XMP überschreitet die APP1-Grenze – nutze frisches Paket');
    xmp = te.encode(buildXmpPacket());
  }
  const segments = [];
  if (meta && meta.exif && meta.exif.length + 8 <= 65533) {
    const exif = neutralizeExifOrientation(meta.exif);
    const hdr = [0x45, 0x78, 0x69, 0x66, 0, 0];   // "Exif\0\0"
    const payloadLen = 2 + hdr.length + exif.length;
    const seg = new Uint8Array(2 + payloadLen);
    seg[0] = 0xFF; seg[1] = 0xE1;
    seg[2] = (payloadLen >>> 8) & 255; seg[3] = payloadLen & 255;
    seg.set(hdr, 4);
    seg.set(exif, 4 + hdr.length);
    segments.push(seg);
  }
  const payloadLen = 2 + ns.length + xmp.length;   // length field includes itself
  const seg = new Uint8Array(2 + payloadLen);
  seg[0] = 0xFF; seg[1] = 0xE1;
  seg[2] = (payloadLen >>> 8) & 255; seg[3] = payloadLen & 255;
  seg.set(ns, 4);
  seg.set(xmp, 4 + ns.length);
  segments.push(seg);

  let pos = 2;
  if (bytes[2] === 0xFF && bytes[3] === 0xE0) pos = 4 + ((bytes[4] << 8) | bytes[5]);
  let extra = 0;
  segments.forEach(s => extra += s.length);
  const out = new Uint8Array(bytes.length + extra);
  out.set(bytes.subarray(0, pos), 0);
  let off = pos;
  segments.forEach(s => { out.set(s, off); off += s.length; });
  out.set(bytes.subarray(pos), off);
  return out;
}

function insertPHYsChunk(pngDataUrl, dpi, meta) {
  console.log('[pHYs] insertPHYsChunk called with dpi =', dpi);
  const base64  = pngDataUrl.split(',')[1];
  const binStr  = atob(base64);
  const origArr = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) origArr[i] = binStr.charCodeAt(i);

  const ppm = Math.round(dpi * 39.3700787402);

  const phys_data = new Uint8Array(9);
  phys_data[0] = (ppm >> 24) & 0xFF;
  phys_data[1] = (ppm >> 16) & 0xFF;
  phys_data[2] = (ppm >>  8) & 0xFF;
  phys_data[3] = (ppm      ) & 0xFF;
  phys_data[4] = (ppm >> 24) & 0xFF;
  phys_data[5] = (ppm >> 16) & 0xFF;
  phys_data[6] = (ppm >>  8) & 0xFF;
  phys_data[7] = (ppm      ) & 0xFF;
  phys_data[8] = 1;

  const chunkType = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // "pHYs"
  const chunkLen  = new Uint8Array(4);
  chunkLen[0] = 0; chunkLen[1] = 0; chunkLen[2] = 0; chunkLen[3] = 9;

  const crcInput = new Uint8Array(4 + 9);
  crcInput.set(chunkType, 0);
  crcInput.set(phys_data, 4);
  const crc = crc32(crcInput);
  const crcBytes = new Uint8Array(4);
  crcBytes[0] = (crc >> 24) & 0xFF;
  crcBytes[1] = (crc >> 16) & 0xFF;
  crcBytes[2] = (crc >>  8) & 0xFF;
  crcBytes[3] = (crc      ) & 0xFF;

  const phys_chunk = new Uint8Array(21);
  phys_chunk.set(chunkLen, 0);
  phys_chunk.set(chunkType, 4);
  phys_chunk.set(phys_data, 8);
  phys_chunk.set(crcBytes, 17);

  const insertPos = 8 + 4 + 4 + 13 + 4; // = 33

  let cleanArr = removePHYsChunk(origArr);

  // US-3.1: machine-readable AI marking as XMP in an iTXt chunk, right
  // next to the pHYs chunk after IHDR; US-3.7: dazu die erhaltenen
  // Original-Metadaten (EXIF als eXIf-Chunk, tEXt/zTXt/iTXt roh kopiert)
  const inserts = [phys_chunk, buildITXtChunk(mergeXmpPacket(meta && meta.xmp))];
  if (meta && meta.exif) inserts.push(buildPngChunk('eXIf', neutralizeExifOrientation(meta.exif)));
  if (meta) meta.pngTextChunks.forEach(c => inserts.push(c));
  let extra = 0;
  inserts.forEach(c => extra += c.length);
  const result = new Uint8Array(cleanArr.length + extra);
  result.set(cleanArr.subarray(0, insertPos), 0);
  let off = insertPos;
  inserts.forEach(c => { result.set(c, off); off += c.length; });
  result.set(cleanArr.subarray(insertPos), off);

  const blob = new Blob([result], { type: 'image/png' });
  // bytes werden zusätzlich zurückgegeben, damit das Compliance-Protokoll
  // den SHA-256 der finalen Datei bilden kann
  return { url: URL.createObjectURL(blob), bytes: result };
}

// Remove existing pHYs chunk if present
function removePHYsChunk(arr) {
  const sig = 8;
  let pos = sig;
  const chunks = [];
  let removed = false;

  while (pos < arr.length) {
    const len = (arr[pos] << 24) | (arr[pos+1] << 16) | (arr[pos+2] << 8) | arr[pos+3];
    const type = String.fromCharCode(arr[pos+4], arr[pos+5], arr[pos+6], arr[pos+7]);
    const chunkSize = 4 + 4 + len + 4;

    let drop = (type === 'pHYs');
    if (!drop && type === 'iTXt' && len > 17) {
      // Drop a previous Benti/other XMP packet so we never stack two
      const kw = String.fromCharCode.apply(null, arr.subarray(pos + 8, pos + 8 + 17));
      if (kw === 'XML:com.adobe.xmp') drop = true;
    }
    if (drop) {
      removed = true;
    } else {
      chunks.push(arr.subarray(pos, pos + chunkSize));
    }
    pos += chunkSize;
    if (type === 'IEND') break;
  }

  if (!removed) return arr;

  let totalLen = sig;
  chunks.forEach(c => totalLen += c.length);
  const result = new Uint8Array(totalLen);
  result.set(arr.subarray(0, sig), 0);
  let offset = sig;
  chunks.forEach(c => { result.set(c, offset); offset += c.length; });
  return result;
}

// CRC32 for PNG chunks
function crc32(buf) {
  let crcTable = crc32.table;
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c;
    }
    crc32.table = crcTable;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}


function resetAll() {
  loadedImage = null; analysisResult = null;
  currentFiles = []; currentPreviewIndex = 0; imageOverrides = [];
  updateBatchNav();
  provScanRun++; provResults = [];
  if (provBox) provBox.style.display = 'none';
  btnCompare.style.display = 'none';
  btnRemoveImage.style.display = 'none';
  previewImg.src = '';
  previewWrap.style.display  = 'none';
  if (previewToolbar) previewToolbar.style.display = 'none';
  uploadZone.style.display   = 'block';
  downloadSection.style.display = 'none';
  btnApply.disabled = true;
  fileInput.value = '';
  // Reset position to AI mode
  selectedPosition = 'ai';
  posModeAI.classList.add('active');
  posModeManual.classList.remove('active');
  manualPosPanel.classList.remove('active');
  updateLabelPreview();
  setAIStatus('idle', 'Bild laden um KI-Analyse zu starten \u2026');
}

function setAIStatus(state, text) {
  aiDot.className='ai-dot';
  if (state==='active')    aiDot.classList.add('active');
  if (state==='analyzing') aiDot.classList.add('analyzing');
  aiStatusText.textContent=text;
}

// ── Logo Upload State ─────────────────────────────────────────────────────────
let logoDarkImg  = null;   // HTMLImageElement – dunkles Logo
let logoLightImg = null;   // HTMLImageElement – helles Logo
let wmMode       = 'logo'; // 'text' | 'logo'

// DOM refs – Logo
const logoDarkInput   = document.getElementById('logoDarkInput');
const logoLightInput  = document.getElementById('logoLightInput');
const logoDarkPreview = document.getElementById('logoDarkPreview');
const logoLightPreview= document.getElementById('logoLightPreview');
const logoDropDark    = document.getElementById('logoDropDark');
const logoDropLight   = document.getElementById('logoDropLight');
const logoDarkClear   = document.getElementById('logoDarkClear');
const logoLightClear  = document.getElementById('logoLightClear');
const logoSizeSlider  = document.getElementById('logoSize');
const logoSizeVal     = document.getElementById('logoSizeVal');

// Ausgabeziel, Label-Höhe und Plakette gelten nur für das Logo-Label; im
// Text-Modus bestimmt die Schriftgröße die Größe. Da diese Regler seit dem
// Umbau im eigenen Akkordeon „Größe & Lesbarkeit" sitzen (nicht mehr im
// Logo-Panel), muss die Sichtbarkeit hier explizit mitgeführt werden.
function updateSizePanelUI() {
  const isText = wmMode === 'text';
  document.querySelectorAll('.size-logo-only').forEach(el => {
    el.style.display = isText ? 'none' : '';
  });
  document.querySelectorAll('.size-text-only').forEach(el => {
    el.style.display = isText ? 'block' : 'none';
  });
}

// ── Tab Switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.wm-tab[data-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.wm-tab[data-tab]').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.wm-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    wmMode = tab.dataset.tab;
    document.getElementById(wmMode === 'text' ? 'panelText' : 'panelLogo').classList.add('active');
    updateDeTextRow();
    updateSizePanelUI();
    saveSettings();
  });
});

// ── Logo Slider ───────────────────────────────────────────────────────────────
if (logoSizeSlider) {
  logoSizeSlider.addEventListener('input', () => {
    logoSizeVal.textContent = logoSizeSlider.value + '%';
  });
}

// ── Generic Logo File Handler ─────────────────────────────────────────────────
function handleLogoFile(file, isLight) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      if (isLight) {
        logoLightImg = img;
        logoLightPreview.src = e.target.result;
        logoDropLight.classList.add('has-logo');
      } else {
        logoDarkImg = img;
        logoDarkPreview.src = e.target.result;
        logoDropDark.classList.add('has-logo');
      }
      updateLabelPreview();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

logoDarkInput.addEventListener('change', function() {
  if (this.files && this.files[0]) handleLogoFile(this.files[0], false);
});
logoLightInput.addEventListener('change', function() {
  if (this.files && this.files[0]) handleLogoFile(this.files[0], true);
});

// Clear buttons
logoDarkClear.addEventListener('click', (e) => {
  e.preventDefault(); e.stopPropagation();
  logoDarkImg = null;
  logoDarkPreview.src = '';
  logoDarkInput.value = '';
  logoDropDark.classList.remove('has-logo');
});
logoLightClear.addEventListener('click', (e) => {
  e.preventDefault(); e.stopPropagation();
  logoLightImg = null;
  logoLightPreview.src = '';
  logoLightInput.value = '';
  logoDropLight.classList.remove('has-logo');
});

// Drag & Drop for logo drops
[{ el: logoDropDark, light: false }, { el: logoDropLight, light: true }].forEach(({ el, light }) => {
  ['dragenter','dragover'].forEach(evt =>
    el.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); el.style.borderColor='#6c63ff'; })
  );
  ['dragleave','dragend'].forEach(evt =>
    el.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); el.style.borderColor=''; })
  );
  el.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    el.style.borderColor = '';
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleLogoFile(f, light);
  });
});


// ═══════════════════════════════════════════════════════════
// Custom Color Picker Toggle
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// EU-Label System (Art. 50 EU AI Act)
// ═══════════════════════════════════════════════════════════
const DST_URI = {
  'ai-generated': 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
  'ai-modified' : 'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia'
};
let logoSource = 'eu';             // 'eu' | 'custom'
let deTextOn   = false;            // optional German caption below EU label
let euIconStyle = 'full';          // 'full' (AI GENERATED pill) | 'compact' (square AI icon)
let plateOn     = false;           // Kontrast-Plakette hinter dem Label (Downscale-Robustheit); Auto-AN beim Mobile-Ziel

const euIconCache = {};            // path -> HTMLImageElement (preloaded)
function euIconPath(type, color, transparent) {
  return 'assets/eu-icons/png/' + type + '_' + color + (transparent ? '_50' : '') + '.png';
}
function preloadEuIcons() {
  ['ai', 'ai-generated', 'ai-modified'].forEach(t =>
    ['black', 'white'].forEach(c => [false, true].forEach(tr => {
      const p = euIconPath(t, c, tr);
      if (!euIconCache[p]) { const im = new Image(); im.src = p; euIconCache[p] = im; }
    }))
  );
}
preloadEuIcons();

const labelTypeTabs  = document.querySelectorAll('[data-labeltype]');
const logoSourceTabs = document.querySelectorAll('[data-logosource]');
const euPreviewImg   = document.getElementById('euPreviewImg');
const euLabelArea    = document.getElementById('euLabelArea');
const customLogoArea = document.getElementById('customLogoArea');
const deTextToggle   = document.getElementById('deTextToggle');
const euStyleTabs    = document.querySelectorAll('[data-euiconstyle]');
const deTextLabel    = document.getElementById('deTextLabel');
const plateToggle    = document.getElementById('plateToggle');

if (plateToggle) plateToggle.addEventListener('change', () => {
  plateOn = plateToggle.checked;
  saveSettings();      // ruft updateLabelPreview()
});

// Unsichtbares Wasserzeichen: Einbett-Toggle + „Prüfen"-Modus
const wmInvisibleToggle = document.getElementById('wmInvisibleToggle');
const wmInvisibleHint   = document.getElementById('wmInvisibleHint');
const wmCheckBtn        = document.getElementById('wmCheckBtn');
const wmCheckResult     = document.getElementById('wmCheckResult');
function updateWmInvisibleUI() {
  if (wmInvisibleHint) wmInvisibleHint.style.display = wmInvisibleOn ? '' : 'none';
}
if (wmInvisibleToggle) wmInvisibleToggle.addEventListener('change', () => {
  wmInvisibleOn = wmInvisibleToggle.checked;
  updateWmInvisibleUI();
  saveSettings();
});
if (wmCheckBtn) wmCheckBtn.addEventListener('click', () => {
  if (!loadedImage) { if (wmCheckResult) wmCheckResult.textContent = 'Bitte zuerst ein Bild laden.'; return; }
  if (isSvgInput) { if (wmCheckResult) wmCheckResult.textContent = 'SVG trägt kein Pixel-Wasserzeichen (Vektor).'; return; }
  wmCheckBtn.disabled = true;
  const prev = wmCheckResult ? wmCheckResult.textContent : '';
  if (wmCheckResult) wmCheckResult.textContent = '… wird geprüft';
  // kurz warten, damit das UI den Zustand zeichnet (DCT-Suche ist synchron)
  setTimeout(() => {
    try {
      const r = detectInvisibleWatermark(loadedImage);
      if (wmCheckResult) {
        wmCheckResult.textContent = r.found
          ? '✓ Benti-Wasserzeichen gefunden: ' + (r.type === 'ai-modified' ? 'KI-bearbeitet' : 'KI-generiert')
            + ' (Konfidenz ' + Math.round(r.confidence * 100) + '%)'
          : 'Kein Benti-Wasserzeichen erkennbar (heißt nicht „kein KI-Bild").';
      }
    } catch (e) {
      if (wmCheckResult) wmCheckResult.textContent = 'Prüfung fehlgeschlagen.';
      console.warn('[WM] Prüfen fehlgeschlagen:', e);
    } finally { wmCheckBtn.disabled = false; }
  }, 30);
});

function updateEuPreview() {
  const t = (euIconStyle === 'compact') ? 'ai' : labelType;
  if (euPreviewImg) euPreviewImg.src = euIconPath(t, 'white', false);
  if (deTextLabel) deTextLabel.textContent =
    'Deutscher Zusatztext („' + ((labelType === 'ai-generated') ? 'KI-generiert' : 'KI-bearbeitet') + '")';
}
function updateLogoSourceUI() {
  logoSourceTabs.forEach(b => b.classList.toggle('active', b.dataset.logosource === logoSource));
  if (euLabelArea)    euLabelArea.style.display    = (logoSource === 'eu') ? 'block' : 'none';
  if (customLogoArea) customLogoArea.style.display = (logoSource === 'custom') ? 'block' : 'none';
  updateDeTextRow();
}

// Zusatztext-Zeile lebt im Erweitert-Akkordeon, gilt aber nur im EU-Label-Modus
function updateDeTextRow() {
  const row = document.getElementById('deTextRow');
  if (row) row.style.display = (wmMode === 'logo' && logoSource === 'eu') ? '' : 'none';
}

labelTypeTabs.forEach(btn => btn.addEventListener('click', () => {
  labelTypeTabs.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  labelType = btn.dataset.labeltype;
  updateEuPreview();
  // Manuelle Wahl übersteuert den Smart-Vorschlag; Hinweis live aktualisieren
  const r = provResults[currentPreviewIndex];
  if (r) r.suggested = true;
  updateProvSuggest(r);
  saveSettings();
}));
logoSourceTabs.forEach(btn => btn.addEventListener('click', () => {
  logoSource = btn.dataset.logosource;
  updateLogoSourceUI();
  saveSettings();
}));
if (deTextToggle) deTextToggle.addEventListener('change', () => {
  deTextOn = deTextToggle.checked;
  saveSettings();
});
euStyleTabs.forEach(btn => btn.addEventListener('click', () => {
  euStyleTabs.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  euIconStyle = btn.dataset.euiconstyle;
  updateEuPreview();
  saveSettings();
}));

const wmCustomColor = document.getElementById('wmCustomColor');
wmStyle.addEventListener('change', () => {
  wmCustomColor.style.display = wmStyle.value === 'custom' ? 'block' : 'none';
  saveSettings();
});
if (wmCustomColor) wmCustomColor.addEventListener('input', () => saveSettings());

// ═══════════════════════════════════════════════════════════
// Clipboard Paste (Strg+V)
// ═══════════════════════════════════════════════════════════
document.addEventListener('paste', (e) => {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      e.preventDefault();
      const file = items[i].getAsFile();
      if (file) handleFiles([file]);
      return;
    }
  }
});

// ═══════════════════════════════════════════════════════════
// Theme: Dunkel ist Default, Hell per Toggle (Redesign 18.07./24.07.)
// ═══════════════════════════════════════════════════════════
let uiTheme = 'dark';

function applyTheme() {
  document.documentElement.dataset.theme = uiTheme;
}

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) themeToggle.addEventListener('click', () => {
  uiTheme = (uiTheme === 'light') ? 'dark' : 'light';
  applyTheme();
  saveSettings();
});

// ═══════════════════════════════════════════════════════════
// Settings Persistence (chrome.storage)
// ═══════════════════════════════════════════════════════════
const SETTINGS_KEY = 'benti_settings';

// Storage-Abstraktion (US-4.2): In der Extension nutzt Benti chrome.storage.local,
// als reine Web-App (GitHub Pages) faellt es transparent auf localStorage zurueck.
// Gleiche Callback-API, damit die Aufrufer unveraendert bleiben.
const bentiStore = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local)
  ? chrome.storage.local
  : {
      get(keys, cb) {
        const out = {};
        (Array.isArray(keys) ? keys : [keys]).forEach(k => {
          try { const v = localStorage.getItem(k); if (v !== null) out[k] = JSON.parse(v); }
          catch (e) { /* defekter Eintrag wird ignoriert */ }
        });
        cb(out);
      },
      set(obj) {
        try { Object.keys(obj).forEach(k => localStorage.setItem(k, JSON.stringify(obj[k]))); }
        catch (e) { console.warn('[Storage] localStorage-Schreiben fehlgeschlagen:', e); }
      },
      remove(keys) {
        (Array.isArray(keys) ? keys : [keys]).forEach(k => {
          try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
        });
      }
    };

function saveSettings() {
  const settings = {
    text       : wmText.value,
    size       : wmSize.value,
    style      : wmStyle.value,
    customColor: wmCustomColor ? wmCustomColor.value : '#6c63ff',
    opacity    : wmOpacity.value,
    dpi        : selectedDPI,
    dpiMode    : selectedMode,
    exportFormat : exportFormat,
    exportQuality: exportQuality,
    wmMode     : wmMode,
    labelType  : labelType,
    logoSource : logoSource,
    euIconStyle: euIconStyle,
    deText     : deTextOn,
    plateOn    : plateOn,
    wmInvisibleOn: wmInvisibleOn,
    namePattern: namePattern,
    saveMode   : saveMode,
    downloadSubfolder: downloadSubfolder,
    outputTarget: outputTarget,
    outputSizeOn: outputSizeOn,
    outputWidth : outputWidth,
    outputHeight: outputHeight,
    aspectLock  : aspectLock,
    customPresets: customPresets,
    obDismissed : obDismissed,
    auditOn    : auditOn,
    posMode    : selectedPosition,
    posX       : manualPosX,
    posY       : manualPosY,
    theme      : uiTheme,
  };
  bentiStore.set({ [SETTINGS_KEY]: settings });
  updateLabelPreview();
}

function loadSettings() {
  bentiStore.get([SETTINGS_KEY], (result) => {
    const s = result[SETTINGS_KEY];
    if (onboardingCard && !(s && s.obDismissed)) onboardingCard.style.display = 'block';
    if (s && (s.theme === 'dark' || s.theme === 'light')) uiTheme = s.theme;
    applyTheme();
    if (!s) return;
    if (s.obDismissed) obDismissed = true;
    // Custom-Presets zuerst laden, damit ihre Optionen im Dropdown existieren
    if (Array.isArray(s.customPresets)) {
      customPresets = s.customPresets.filter(p => p && p.id && p.name && p.width >= 16);
      rebuildOutputTargetOptions();
    }
    // Exakte Ausgabegröße
    if (s.aspectLock !== undefined) aspectLock = !!s.aspectLock;
    if (s.outputWidth >= 16)  outputWidth  = s.outputWidth;
    if (s.outputHeight >= 16) outputHeight = s.outputHeight;
    if (s.outputSizeOn && outputSizeToggle) {
      outputSizeOn = true;
      outputSizeToggle.checked = true;
    }
    syncSizeInputs();
    updateOutputSizeUI();
    // Ziel setzen: eingebaut ODER gültiges Custom-Preset
    if (s.outputTarget && (OUTPUT_TARGETS.hasOwnProperty(s.outputTarget) ||
        (s.outputTarget.indexOf('custom:') === 0 && getTarget(s.outputTarget)))) {
      outputTarget = s.outputTarget;
      outputTargetSel.value = outputTarget;
    }
    updateDelPresetBtn();
    if (s.auditOn !== undefined && auditToggle) {
      auditOn = s.auditOn;
      auditToggle.checked = auditOn;
      updateAuditUI();
    }
    console.log('[Settings] Loaded', s);
    if (s.text !== undefined)    wmText.value    = s.text;
    if (s.size !== undefined)    wmSize.value    = s.size;
    if (s.style !== undefined) {
      wmStyle.value = s.style;
      if (wmCustomColor) wmCustomColor.style.display = s.style === 'custom' ? 'block' : 'none';
    }
    if (s.customColor && wmCustomColor) wmCustomColor.value = s.customColor;
    if (s.opacity !== undefined) {
      wmOpacity.value = s.opacity;
      opacityVal.textContent = s.opacity + '%';
    }
    if (s.dpi !== undefined) {
      selectedDPI = s.dpi;
      document.querySelectorAll('.dpi-btn[data-dpi]').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.dpi) === s.dpi);
      });
    }
    if (s.dpiMode !== undefined) {
      selectedMode = s.dpiMode;
      document.querySelectorAll('.dpi-mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === s.dpiMode);
      });
    }
    if (s.exportFormat) {
      exportFormat = s.exportFormat;
      updateFormatUI();
    }
    if (s.exportQuality) {
      // Alte frei gewählte Slider-Werte auf die nächstliegende Stufe runden
      exportQuality = QUALITY_STEPS.reduce((a, b) =>
        Math.abs(b - s.exportQuality) < Math.abs(a - s.exportQuality) ? b : a);
      updateQualityUI();
    }
    if (s.wmMode !== undefined) {
      wmMode = s.wmMode;
      document.querySelectorAll('.wm-tab[data-tab]').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === s.wmMode);
      });
      document.querySelectorAll('.wm-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(s.wmMode === 'text' ? 'panelText' : 'panelLogo');
      if (panel) panel.classList.add('active');
      updateSizePanelUI();
    }
    if (s.labelType) {
      labelType = s.labelType;
      labelTypeTabs.forEach(b => b.classList.toggle('active', b.dataset.labeltype === labelType));
      updateEuPreview();
    }
    if (s.logoSource) {
      logoSource = s.logoSource;
      updateLogoSourceUI();
    }
    if (s.euIconStyle) {
      euIconStyle = s.euIconStyle;
      euStyleTabs.forEach(b => b.classList.toggle('active', b.dataset.euiconstyle === euIconStyle));
      updateEuPreview();
    }
    if (s.deText !== undefined && deTextToggle) {
      deTextOn = s.deText;
      deTextToggle.checked = deTextOn;
    }
    if (s.plateOn !== undefined && plateToggle) {
      plateOn = s.plateOn;
      plateToggle.checked = plateOn;
    }
    if (s.wmInvisibleOn !== undefined && wmInvisibleToggle) {
      wmInvisibleOn = s.wmInvisibleOn;
      wmInvisibleToggle.checked = wmInvisibleOn;
      updateWmInvisibleUI();
    }
    if (typeof s.namePattern === 'string') {
      namePattern = s.namePattern;
      if (namePatternInput) namePatternInput.value = namePattern;
      updateNamePreview();
    }
    if (typeof s.downloadSubfolder === 'string') {
      downloadSubfolder = s.downloadSubfolder;
      if (subfolderInput) subfolderInput.value = downloadSubfolder;
    }
    if (s.saveMode === 'downloads' || s.saveMode === 'folder') {
      saveMode = s.saveMode;
      updateSaveModeUI();
    }
    // Position mode + slider values
    if (s.posMode !== undefined) {
      selectedPosition = s.posMode;
      posModeAI.classList.toggle('active', s.posMode === 'ai');
      posModeManual.classList.toggle('active', s.posMode === 'manual');
      manualPosPanel.classList.toggle('active', s.posMode === 'manual');
    }
    if (s.posX !== undefined) {
      manualPosX = s.posX;
      posSliderX.value = s.posX;
      posValX.textContent = s.posX + '%';
    }
    if (s.posY !== undefined) {
      manualPosY = s.posY;
      posSliderY.value = s.posY;
      posValY.textContent = s.posY + '%';
    }
    updateQuickPresetHighlight();
  });
}

// Auto-save on any settings change
[wmText, wmSize, wmOpacity].forEach(el => {
  if (el) el.addEventListener('change', saveSettings);
});
wmOpacity.addEventListener('input', saveSettings);
if (logoSizeSlider) logoSizeSlider.addEventListener('input', saveSettings);
wmText.addEventListener('input', updateLabelPreview);
if (wmCustomColor) wmCustomColor.addEventListener('input', updateLabelPreview);

// ── Init ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
// Phase 1b: Ausgabeziel-Presets, Disclosure, Vorher/Nachher, Onboarding
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// Phase 2: Herkunfts-Check (C2PA + XMP/IPTC) & Smart-Label-Vorschlag
// Läuft komplett lokal: Bibliothek, Worker und WASM liegen unter libs/c2pa
// ═══════════════════════════════════════════════════════════
const DST_GENERATED = 'trainedAlgorithmicMedia';
const DST_COMPOSITE = 'compositeWithTrainedAlgorithmicMedia';

const provBox     = document.getElementById('provBox');
const provStatus  = document.getElementById('provStatus');
const provDetail  = document.getElementById('provDetail');
const provSuggest = document.getElementById('provSuggest');
const provBatch   = document.getElementById('provBatch');
let provResults = [];   // per-image provenance results (batch)
let provScanRun = 0;    // invalidates running scans when a new upload starts

// Lazy SDK init: the ~8 MB WASM is only compiled on first use
let c2paSdkPromise = null;
function ensureC2pa() {
  if (!c2paSdkPromise) {
    const base = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('libs/c2pa/')
      : new URL('libs/c2pa/', location.href).href;
    c2paSdkPromise = import(base + 'index.js').then(mod => mod.createC2pa({
      wasmSrc: base + 'c2pa_bg.wasm',
      // workerSrc keeps us CSP-clean: no blob: workers in MV3
      workerSrc: new URL(base + 'c2pa_worker.js')
    })).catch(err => {
      // Init fehlgeschlagen (z. B. WASM-Kompilierung unter Speicherdruck bei
      // grossen Batches) -> Promise NICHT dauerhaft im rejected-Zustand
      // cachen, sonst bleibt der Herkunfts-Check fuer den Rest der Sitzung
      // kaputt. Fix 18.07.: naechster Aufruf initialisiert neu.
      c2paSdkPromise = null;
      throw err;
    });
  }
  return c2paSdkPromise;
}

// Returns: object = manifest found, null = none found, undefined = check failed
async function readC2pa(file) {
  try {
    const sdk = await ensureC2pa();
    const reader = await sdk.reader.fromBlob(file.type || 'image/jpeg', file);
    if (!reader) return null;
    try {
      const manifest = await reader.activeManifest();
      const store = await reader.manifestStore();
      const genInfo = (manifest && (manifest.claimGeneratorInfo || manifest.claim_generator_info)) || [];
      const generator = (genInfo[0] && (genInfo[0].name + (genInfo[0].version ? ' ' + genInfo[0].version : '')))
        || (manifest && (manifest.claimGenerator || manifest.claim_generator))
        || 'Unbekanntes Tool';
      const sig = (manifest && (manifest.signatureInfo || manifest.signature_info)) || {};
      const vState  = store && (store.validationState || store.validation_state);
      const vStatus = (store && (store.validationStatus || store.validation_status)) || [];
      const valid = vState ? (vState !== 'Invalid') : vStatus.length === 0;
      const dump = JSON.stringify(store || manifest || {});
      let dst = null;
      if (dump.indexOf(DST_COMPOSITE) !== -1) dst = 'ai-modified';
      else if (dump.indexOf(DST_GENERATED) !== -1) dst = 'ai-generated';
      return { generator, issuer: sig.issuer || null, time: sig.time || null, valid, dst };
    } finally {
      reader.free();
    }
  } catch (err) {
    console.warn('[Provenance] C2PA-Lesen fehlgeschlagen:', err);
    return undefined;
  }
}

// Extract raw XMP packet from PNG (iTXt), JPEG (APP1) or WEBP (RIFF)
function extractXmp(bytes) {
  const td = new TextDecoder();
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    let pos = 8;
    while (pos + 12 <= bytes.length) {
      const len = ((bytes[pos] << 24) | (bytes[pos+1] << 16) | (bytes[pos+2] << 8) | bytes[pos+3]) >>> 0;
      const type = String.fromCharCode(bytes[pos+4], bytes[pos+5], bytes[pos+6], bytes[pos+7]);
      if (type === 'iTXt' && len > 22) {
        const data = bytes.subarray(pos + 8, pos + 8 + len);
        if (td.decode(data.subarray(0, 17)) === 'XML:com.adobe.xmp' && data[17] === 0 && data[18] === 0) {
          let p = 20;
          while (p < data.length && data[p] !== 0) p++;
          p++;
          while (p < data.length && data[p] !== 0) p++;
          p++;
          return td.decode(data.subarray(p));
        }
      }
      if (type === 'IEND') break;
      pos += 12 + len;
    }
    return null;
  }
  if (bytes.length > 4 && bytes[0] === 0xFF && bytes[1] === 0xD8) {
    const XMP_NS = 'http://ns.adobe.com/xap/1.0/';
    let pos = 2;
    while (pos + 4 <= bytes.length && bytes[pos] === 0xFF) {
      const marker = bytes[pos + 1];
      if (marker === 0xDA || marker === 0xD9) break;
      const segLen = (bytes[pos + 2] << 8) | bytes[pos + 3];
      if (segLen < 2) break;
      if (marker === 0xE1 && segLen > XMP_NS.length + 3) {
        if (td.decode(bytes.subarray(pos + 4, pos + 4 + XMP_NS.length)) === XMP_NS) {
          return td.decode(bytes.subarray(pos + 4 + XMP_NS.length + 1, pos + 2 + segLen));
        }
      }
      pos += 2 + segLen;
    }
    return null;
  }
  if (bytes.length > 16
      && String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF'
      && String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WEBP') {
    let pos = 12;
    while (pos + 8 <= bytes.length) {
      const cc = String.fromCharCode(bytes[pos], bytes[pos+1], bytes[pos+2], bytes[pos+3]);
      const size = (bytes[pos+4] | (bytes[pos+5] << 8) | (bytes[pos+6] << 16) | (bytes[pos+7] << 24)) >>> 0;
      if (cc === 'XMP ') return td.decode(bytes.subarray(pos + 8, pos + 8 + size));
      pos += 8 + size + (size % 2);
    }
  }
  return null;
}

async function checkProvenance(file) {
  let xmpDst = null, hasXmp = false;
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '');
  try {
    if (isSvg) {
      // US-3.6-Roundtrip: bei SVG steht der DigitalSourceType als Text im
      // <metadata>/XMP – kein Binär-Container zum Parsen.
      const text = await file.text();
      if (/DigitalSourceType/i.test(text)) {
        if (text.indexOf(DST_COMPOSITE) !== -1) { xmpDst = 'ai-modified'; hasXmp = true; }
        else if (text.indexOf(DST_GENERATED) !== -1) { xmpDst = 'ai-generated'; hasXmp = true; }
      }
    } else {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const xmp = extractXmp(bytes);
      if (xmp) {
        hasXmp = true;
        if (xmp.indexOf(DST_COMPOSITE) !== -1) xmpDst = 'ai-modified';
        else if (xmp.indexOf(DST_GENERATED) !== -1) xmpDst = 'ai-generated';
      }
    }
  } catch (err) {
    console.warn('[Provenance] XMP-Lesen fehlgeschlagen:', err);
  }
  // SVG trägt kein C2PA im Raster-Sinn → SDK-Aufruf überspringen
  const c2pa = isSvg ? null : await readC2pa(file);
  return { c2pa, xmpDst, hasXmp };
}

function renderProvenance(r) {
  if (!provBox) return;
  provSuggest.style.display = 'none';
  provDetail.style.display = 'none';
  provBox.classList.remove('found', 'meta', 'invalid');
  if (!loadedImage) { provBox.style.display = 'none'; return; }
  provBox.style.display = 'flex';
  if (!r) { provStatus.textContent = 'Herkunfts-Check läuft …'; return; }

  const dst = (r.c2pa && r.c2pa.dst) || r.xmpDst;
  if (r.c2pa) {
    const parts = ['Erstellt mit ' + r.c2pa.generator];
    if (r.c2pa.issuer) parts.push('signiert von ' + r.c2pa.issuer);
    if (r.c2pa.time) parts.push(String(r.c2pa.time).slice(0, 10));
    if (r.c2pa.valid) {
      provBox.classList.add('found');
      provStatus.textContent = 'C2PA-Herkunftsnachweis gefunden';
      parts.push('Hinweis: intakte Signatur bedeutet nicht automatisch vertrauenswürdiger Aussteller');
    } else {
      provBox.classList.add('invalid');
      provStatus.textContent = 'C2PA gefunden – Signatur ungültig (Datei wurde nachträglich verändert)';
    }
    provDetail.textContent = parts.join(' · ');
    provDetail.style.display = 'block';
  } else if (r.hasXmp && r.xmpDst) {
    provBox.classList.add('meta');
    provStatus.textContent = 'KI-Metadaten gefunden (XMP/IPTC)';
    provDetail.textContent = 'DigitalSourceType: ' + (r.xmpDst === 'ai-generated'
      ? 'vollständig KI-generiert' : 'mit KI bearbeitet (Composite)');
    provDetail.style.display = 'block';
  } else if (r.c2pa === undefined) {
    provStatus.textContent = 'C2PA-Prüfung nicht möglich (Format nicht unterstützt oder Fehler)';
  } else {
    provStatus.textContent = 'Kein Herkunftsnachweis gefunden';
    provDetail.textContent = 'Das belegt NICHT, dass das Bild ohne KI entstand – Metadaten sind leicht entfernbar (ein Screenshot genügt).';
    provDetail.style.display = 'block';
  }

  updateProvSuggest(r);
}

function labelTypeName(t) {
  return (t === 'ai-generated') ? 'Vollständig KI-generiert' : 'KI-bearbeitet';
}

// Smart-Label-Hinweis (US-2.4): reagiert live auf die Auswahl.
// Automatisch gesetzt wird nur EINMAL pro Bild – danach zählt die Nutzerwahl.
function updateProvSuggest(r) {
  if (!provSuggest) return;
  const dst = r && ((r.c2pa && r.c2pa.dst) || r.xmpDst);
  if (!dst) { provSuggest.style.display = 'none'; return; }
  provSuggest.style.display = 'block';
  if (dst === labelType) {
    provSuggest.textContent = 'Passt: Deine Label-Wahl entspricht den Herkunftsdaten dieses Bildes.';
  } else if (r.suggested) {
    provSuggest.textContent = 'Die Herkunftsdaten dieses Bildes sagen „' + labelTypeName(dst)
      + '" – du hast „' + labelTypeName(labelType) + '" gewählt. Deine Auswahl bleibt bestehen.';
  } else {
    r.suggested = true;
    labelType = dst;
    labelTypeTabs.forEach(b => b.classList.toggle('active', b.dataset.labeltype === labelType));
    updateEuPreview();
    updateLabelPreview();
    provSuggest.textContent = 'Label-Typ automatisch auf „' + labelTypeName(dst)
      + '" gesetzt – dieses Bild bringt entsprechende Herkunftsdaten mit. Du kannst die Auswahl jederzeit ändern.';
  }
}

async function scanProvenance(files, keepExisting) {
  const run = ++provScanRun;
  if (!keepExisting || provResults.length !== files.length) {
    provResults = new Array(files.length).fill(null);
  }
  if (provBatch) provBatch.style.display = 'none';
  renderProvenance(provResults[currentPreviewIndex] || null);
  for (let i = 0; i < files.length; i++) {
    if (run !== provScanRun) return;
    if (provResults[i]) continue;
    const r = await checkProvenance(files[i]);
    if (run !== provScanRun) return;
    provResults[i] = r;
    if (i === currentPreviewIndex) renderProvenance(r);
  }
  if (files.length > 1 && provBatch) {
    const n = provResults.filter(r => r && (r.c2pa || r.xmpDst)).length;
    provBatch.textContent = n + ' von ' + files.length + ' Bildern tragen KI-Herkunftsdaten.';
    provBatch.style.display = 'block';
  }
}

const OUTPUT_TARGETS = {
  free:         null,
  // minDisplay: kleinste Breite (px), in der die Datei real angezeigt wird.
  // Für dieses Ziel wird die Lesbarkeit NACH dem Verkleinern geprüft, nicht
  // bei Export-Auflösung – genau der Agentur-/Typenplan-/Mobile-Fall.
  mobile:       { pct: 8, minH: 24, name: 'Mobile / stark verkleinert', minDisplay: 480 },
  social:       { pct: 8, minH: 28, name: 'Social Media' },
  web:          { pct: 5, minH: 24, name: 'Web/Blog' },
  print:        { pct: 4, minH: 60, name: 'Print (300 DPI)' }
};
let outputTarget = 'web';
let obDismissed  = false;
let originalPreviewSrc = null;
let labeledPreviewSrc  = null;

// ── Exakte Ausgabegröße (Pixel) + Custom-Presets ────────────────────────────
// Idee: Bild ZUERST auf die Zielgröße rechnen, DANN das Label setzen – so kann
// es nie zu klein werden. Ein Custom-Preset speichert genau so eine Zielbreite
// plus eine Lesbarkeits-Untergrenze (minH) und ist im Dropdown wählbar.
let outputSizeOn = false;
let outputWidth  = null;
let outputHeight = null;
let aspectLock   = true;
let customPresets = [];   // [{ id, name, width, minH, pct }]

const outputTargetSel = document.getElementById('outputTarget');
const readabilityWarn = document.getElementById('readabilityWarn');
const rwTargetName    = document.getElementById('rwTargetName');
const onboardingCard  = document.getElementById('onboardingCard');
const outputSizeToggle = document.getElementById('outputSizeToggle');
const outputSizeFields = document.getElementById('outputSizeFields');
const outWidthInput   = document.getElementById('outWidth');
const outHeightInput  = document.getElementById('outHeight');
const aspectLockBtn   = document.getElementById('aspectLock');
const savePresetBtn   = document.getElementById('savePreset');
const delPresetBtn    = document.getElementById('delPreset');

function imageAspect() {
  return (loadedImage && loadedImage.naturalHeight)
    ? loadedImage.naturalWidth / loadedImage.naturalHeight : 1;
}
// Effektive Endmaße: exakte Ausgabegröße falls aktiv, sonst die Originalgröße.
function effectiveOutputDims() {
  if (outputSizeOn && outputWidth >= 16 && outputHeight >= 16)
    return { W: Math.round(outputWidth), H: Math.round(outputHeight) };
  if (loadedImage) return { W: loadedImage.naturalWidth, H: loadedImage.naturalHeight };
  return { W: 0, H: 0 };
}
function syncSizeInputs() {
  if (outWidthInput)  outWidthInput.value  = outputWidth  || '';
  if (outHeightInput) outHeightInput.value = outputHeight || '';
}
function setOutputWidth(w) {
  outputWidth = Math.max(16, Math.round(w));
  if (aspectLock) outputHeight = Math.max(16, Math.round(outputWidth / imageAspect()));
  syncSizeInputs();
}
function setOutputHeight(h) {
  outputHeight = Math.max(16, Math.round(h));
  if (aspectLock) outputWidth = Math.max(16, Math.round(outputHeight * imageAspect()));
  syncSizeInputs();
}
// Neues Bild geladen: bei aktiver Sperre die Höhe an das neue Seitenverhältnis
// anpassen (Breite bleibt die Führungsgröße).
function syncSizeToImage() {
  if (outputSizeOn && aspectLock && outputWidth >= 16) setOutputWidth(outputWidth);
}
function updateOutputSizeUI() {
  if (outputSizeFields) outputSizeFields.style.display = outputSizeOn ? '' : 'none';
  if (aspectLockBtn) {
    aspectLockBtn.textContent = aspectLock ? '🔒' : '🔓';
    aspectLockBtn.title = aspectLock ? 'Seitenverhältnis gesperrt' : 'Seitenverhältnis frei';
  }
}

// Ziel auflösen: eingebaute Ziele ODER Custom-Preset (Schlüssel „custom:<id>")
function getTarget(key) {
  if (key && key.indexOf('custom:') === 0) {
    const p = customPresets.find(x => x.id === key.slice(7));
    return p ? { pct: p.pct, minH: p.minH, name: p.name, width: p.width, custom: true } : null;
  }
  return OUTPUT_TARGETS[key] || null;
}

function rebuildOutputTargetOptions() {
  Array.from(outputTargetSel.options).forEach(o => {
    if (o.value.indexOf('custom:') === 0) o.remove();
  });
  customPresets.forEach(p => {
    const o = document.createElement('option');
    o.value = 'custom:' + p.id;
    o.textContent = p.name + ' (' + p.width + ' px breit)';
    outputTargetSel.appendChild(o);
  });
}
function updateDelPresetBtn() {
  if (delPresetBtn) delPresetBtn.style.display = (outputTarget.indexOf('custom:') === 0) ? '' : 'none';
}

// Ausgewähltes Ziel/Preset anwenden
function applyTarget(key) {
  const t = getTarget(key);
  if (!t) return;   // 'free' – keine Vorgaben
  logoSizeSlider.value = t.pct;
  logoSizeVal.textContent = t.pct + '%';
  // Custom-Preset trägt eine exakte Zielbreite → exakte Ausgabegröße aktivieren
  if (t.custom && t.width) {
    outputSizeOn = true;
    if (outputSizeToggle) outputSizeToggle.checked = true;
    setOutputWidth(t.width);
    updateOutputSizeUI();
  }
  // Downscale-Ziel: Plakette automatisch an (Robustheit); abschaltbar.
  if (t.minDisplay && !plateOn && plateToggle) {
    plateOn = true;
    plateToggle.checked = true;
  }
}

outputTargetSel.addEventListener('change', () => {
  outputTarget = outputTargetSel.value;
  applyTarget(outputTarget);
  updateDelPresetBtn();
  saveSettings();
});

// Exakte Ausgabegröße: Toggle + Felder
if (outputSizeToggle) outputSizeToggle.addEventListener('change', () => {
  outputSizeOn = outputSizeToggle.checked;
  if (outputSizeOn && loadedImage && !(outputWidth >= 16 && outputHeight >= 16)) {
    outputWidth = loadedImage.naturalWidth;
    outputHeight = loadedImage.naturalHeight;
    syncSizeInputs();
  }
  updateOutputSizeUI();
  saveSettings();
});
if (outWidthInput) outWidthInput.addEventListener('input', () => {
  const v = parseInt(outWidthInput.value, 10);
  if (v >= 16) { setOutputWidth(v); saveSettings(); }
});
if (outHeightInput) outHeightInput.addEventListener('input', () => {
  const v = parseInt(outHeightInput.value, 10);
  if (v >= 16) { setOutputHeight(v); saveSettings(); }
});
if (aspectLockBtn) aspectLockBtn.addEventListener('click', () => {
  aspectLock = !aspectLock;
  if (aspectLock && outputWidth >= 16) setOutputWidth(outputWidth);
  updateOutputSizeUI();
  saveSettings();
});

// Preset aus der aktuellen Ausgabegröße speichern / löschen
if (savePresetBtn) savePresetBtn.addEventListener('click', () => {
  const dims = effectiveOutputDims();
  if (!dims.W) { setAIStatus('idle', 'Bitte zuerst ein Bild laden.'); return; }
  const name = (window.prompt('Name für das Preset (z. B. „Mobile 800px"):', 'Mobile ' + dims.W + 'px') || '').trim();
  if (!name) return;
  const id = 'p' + Date.now().toString(36);
  customPresets.push({ id, name, width: dims.W, minH: 24, pct: parseInt(logoSizeSlider.value, 10) });
  rebuildOutputTargetOptions();
  outputTarget = 'custom:' + id;
  outputTargetSel.value = outputTarget;
  applyTarget(outputTarget);
  updateDelPresetBtn();
  saveSettings();
  setAIStatus('active', '✓ Preset „' + name + '" gespeichert.');
});
if (delPresetBtn) delPresetBtn.addEventListener('click', () => {
  if (outputTarget.indexOf('custom:') !== 0) return;
  const id = outputTarget.slice(7);
  customPresets = customPresets.filter(p => p.id !== id);
  outputTarget = 'web';
  rebuildOutputTargetOptions();
  outputTargetSel.value = outputTarget;
  applyTarget(outputTarget);
  updateDelPresetBtn();
  saveSettings();
});

// Readability guard (US-1.9): warnt, wenn das Label unter die Mindesthöhe fällt.
// Bezugsgröße ist die tatsächliche Endgröße (effectiveOutputDims).
function checkReadability(layout) {
  if (!readabilityWarn) return;
  const t = getTarget(outputTarget);
  if (!t || !layout || layout.mode !== 'logo' || !loadedImage) {
    readabilityWarn.style.display = 'none';
    return;
  }
  const dims = effectiveOutputDims();
  const baseW = dims.W || loadedImage.naturalWidth;
  let effectiveLh = layout.lh, suffix = '';
  if (t.minDisplay) {
    // Downscale-bewusstes Ziel: Höhe NACH dem Verkleinern bewerten.
    effectiveLh = layout.lh * Math.min(1, t.minDisplay / baseW);
    suffix = ' bei ~' + t.minDisplay + ' px Anzeige';
  } else if (outputSizeOn) {
    // Exakte Ausgabegröße: die Endgröße IST die Anzeigegröße.
    suffix = ' bei ' + dims.W + '×' + dims.H + ' px';
  }
  if (effectiveLh < t.minH) {
    rwTargetName.textContent = t.name + ' (min. ' + t.minH + ' px' + suffix + ')';
    readabilityWarn.style.display = 'flex';
  } else {
    readabilityWarn.style.display = 'none';
  }
}
document.getElementById('rwFix').addEventListener('click', () => {
  const t = getTarget(outputTarget);
  if (!t || !loadedImage) return;
  const dims = effectiveOutputDims();
  const W = dims.W || loadedImage.naturalWidth;
  const H = dims.H || loadedImage.naturalHeight;
  const refDim = Math.sqrt(W * H);
  // Downscale-Ziele: die geforderte Höhe gilt NACH dem Verkleinern.
  const shrink = t.minDisplay ? Math.min(1, t.minDisplay / W) : 1;
  const neededExportH = t.minH / shrink;
  let pct = Math.ceil((neededExportH / refDim) * 100);
  pct = Math.max(3, Math.max(pct, t.pct || 3));
  // Für stark verkleinerte Ziele die robusteste Kombination aktivieren.
  if (t.minDisplay) {
    if (!plateOn && plateToggle) { plateOn = true; plateToggle.checked = true; }
    if (logoSource === 'eu' && euIconStyle !== 'compact') {
      euIconStyle = 'compact';
      euStyleTabs.forEach(b => b.classList.toggle('active', b.dataset.euiconstyle === 'compact'));
      updateEuPreview();
    }
  }
  pct = Math.min(pct, 12);   // Slider-Obergrenze; reicht das nicht, bleibt die Warnung stehen
  logoSizeSlider.value = pct;
  logoSizeVal.textContent = pct + '%';
  saveSettings();
});

// Disclosure snippets (US-1.5): labelling must also reach screen readers
// and social captions – the icon alone can't do that
function copySnippet(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    // innerHTML statt textContent: die Buttons enthalten SVG-Icons,
    // die das Kopiert-Feedback überleben müssen
    const orig = btn.innerHTML;
    btn.textContent = '✓ Kopiert!';
    // Show exactly what landed in the clipboard – no guessing
    setAIStatus('active', 'Kopiert: „' + text + '"');
    setTimeout(() => { btn.innerHTML = orig; }, 1200);
  });
}
document.getElementById('copyAlt').addEventListener('click', (e) => {
  copySnippet(e.currentTarget, (labelType === 'ai-generated')
    ? 'KI-generiertes Bild – erstellt mit künstlicher Intelligenz.'
    : 'Foto, mit KI-Werkzeugen bearbeitet.');
});
document.getElementById('copyDisclosure').addEventListener('click', (e) => {
  copySnippet(e.currentTarget, (labelType === 'ai-generated')
    ? '🤖 Hinweis: Dieses Bild wurde vollständig mit KI erstellt. #KIgeneriert'
    : '🤖 Hinweis: Dieses Bild wurde mit KI bearbeitet. #KIbearbeitet');
});

// Before/after (US-1.6): hold the button to peek at the original
const btnCompare = document.getElementById('btnCompare');
function showOriginal() { if (originalPreviewSrc) previewImg.src = originalPreviewSrc; }
function showLabeled()  { if (labeledPreviewSrc)  previewImg.src = labeledPreviewSrc; }
btnCompare.addEventListener('pointerdown', showOriginal);
btnCompare.addEventListener('pointerup', showLabeled);
btnCompare.addEventListener('pointerleave', showLabeled);

// ✕ entfernt im Batch nur das angezeigte Bild; „Alle ✕" leert den Batch
const btnRemoveImage = document.getElementById('btnRemoveImage');
btnRemoveImage.addEventListener('click', removeCurrentImage);
if (btnRemoveAll) btnRemoveAll.addEventListener('click', resetAll);

// Onboarding (US-1.7)
document.getElementById('obDismiss').addEventListener('click', () => {
  onboardingCard.style.display = 'none';
  obDismissed = true;
  saveSettings();
});
document.getElementById('helpBtn').addEventListener('click', () => {
  onboardingCard.style.display = 'block';
});

// ═══════════════════════════════════════════════════════════
// Phase 2b: Compliance-Protokoll (US-5.1–5.3)
// Lokales Kennzeichnungs-Verzeichnis mit SHA-256-Hashes als Audit-Nachweis
// ═══════════════════════════════════════════════════════════
const AUDIT_KEY = 'benti_audit_log';
const AUDIT_MAX = 10000;
const APP_VERSION = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest)
  ? chrome.runtime.getManifest().version : 'web';
let auditOn  = true;
let auditLog = [];

const auditToggle = document.getElementById('auditToggle');
const auditInfo   = document.getElementById('auditInfo');
const auditList   = document.getElementById('auditList');

bentiStore.get([AUDIT_KEY], (res) => {
  auditLog = res[AUDIT_KEY] || [];
  updateAuditUI();
});

function updateAuditUI() {
  if (auditInfo) {
    auditInfo.textContent = auditLog.length.toLocaleString('de-DE')
      + (auditLog.length === 1 ? ' Eintrag' : ' Einträge')
      + (auditOn ? '' : ' · Protokollierung pausiert');
  }
  // Badge im zugeklappten Akkordeon: zeigt schon VOR der ersten
  // Kennzeichnung, dass das Protokoll läuft (Feedback 17.07.)
  const sub = document.getElementById('accAuditSub');
  if (sub) {
    sub.textContent = auditOn
      ? ('aktiv · ' + auditLog.length + (auditLog.length === 1 ? ' Eintrag' : ' Einträge'))
      : 'pausiert';
    sub.classList.toggle('off', !auditOn);
  }
  if (auditList && auditList.style.display !== 'none') renderAuditList();
}

function renderAuditList() {
  auditList.textContent = '';
  const last = auditLog.slice(-50).reverse();
  if (!last.length) { auditList.textContent = 'Noch keine Einträge.'; return; }
  last.forEach(e => {
    const d = document.createElement('div');
    d.textContent = e.ts.slice(0, 16).replace('T', ' ') + ' · ' + (e.file || '?') + ' · '
      + (e.labelType === 'ai-generated' ? 'KI-generiert' : 'KI-bearbeitet');
    auditList.appendChild(d);
  });
}

async function sha256Hex(data) {
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// US-5.1: one entry per labelled image (single and batch)
async function logAuditEntry(file, labeledBytes) {
  if (!auditOn || !file || !labeledBytes) return;
  try {
    const hOrig = await file.arrayBuffer().then(sha256Hex);
    const hLab  = await sha256Hex(labeledBytes);
    auditLog.push({
      ts: new Date().toISOString(),
      file: file.name || 'zwischenablage.png',
      sha256Original: hOrig,
      sha256Labeled: hLab,
      mode: (wmMode === 'logo') ? (logoSource === 'eu' ? 'eu-label' : 'custom-logo') : 'text',
      icon: (wmMode === 'logo' && logoSource === 'eu')
        ? (euIconStyle === 'compact' ? 'AI-Symbol' : (labelType === 'ai-generated' ? 'AI GENERATED' : 'AI MODIFIED'))
        : '-',
      labelType: labelType,
      dst: DST_URI[labelType],
      appVersion: APP_VERSION
    });
    // Rotation: älteste Einträge fliegen raus, mit Hinweis auf den Export
    if (auditLog.length > AUDIT_MAX) {
      auditLog.splice(0, auditLog.length - AUDIT_MAX);
      setAIStatus('idle', 'Protokoll voll – älteste Einträge rotiert. Jetzt als CSV exportieren!');
    }
    bentiStore.set({ [AUDIT_KEY]: auditLog });
    updateAuditUI();
  } catch (err) {
    console.warn('[Audit] Protokollieren fehlgeschlagen:', err);
  }
}

// US-5.2: Excel-tauglicher CSV-Export (Semikolon, UTF-8-BOM)
function exportAuditCsv() {
  const header = 'Zeitstempel;Datei;SHA256_Original;SHA256_Gelabelt;Modus;Icon;LabelTyp;DigitalSourceType;AppVersion';
  const rows = auditLog.map(e =>
    [e.ts, e.file, e.sha256Original, e.sha256Labeled, e.mode, e.icon, e.labelType, e.dst, e.appVersion]
      .map(v => '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"')
      .join(';'));
  const csv = String.fromCharCode(0xFEFF) + [header].concat(rows).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  triggerAnchorDownload(url, 'benti-protokoll_' + new Date().toISOString().slice(0, 10) + '.csv');
}

if (auditToggle) auditToggle.addEventListener('change', () => {
  auditOn = auditToggle.checked;
  saveSettings();
  updateAuditUI();
});
document.getElementById('auditShow').addEventListener('click', () => {
  const visible = auditList.style.display !== 'none';
  auditList.style.display = visible ? 'none' : 'block';
  if (!visible) renderAuditList();
});
document.getElementById('auditExport').addEventListener('click', () => {
  if (!auditLog.length) { setAIStatus('idle', 'Das Protokoll ist noch leer.'); return; }
  exportAuditCsv();
});
// US-5.3: löschen mit Bestätigung (DSGVO-freundlich)
document.getElementById('auditClear').addEventListener('click', () => {
  if (!auditLog.length) return;
  if (!confirm('Gesamtes Kennzeichnungs-Protokoll (' + auditLog.length + ' Einträge) unwiderruflich löschen?')) return;
  auditLog = [];
  bentiStore.set({ [AUDIT_KEY]: auditLog });
  auditList.style.display = 'none';
  updateAuditUI();
});

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
});
// Fallback if DOMContentLoaded already fired
if (document.readyState !== 'loading') { loadSettings(); }

// Keep the live preview aligned when the side panel is resized
window.addEventListener('resize', updateLabelPreview);

// ═══════════════════════════════════════════════════════════
// Progressive Disclosure: „Erweitert"-Bereiche merken sich offen/zu
// Alle starten zu (Default), der Zustand wird pro Nutzer gespeichert.
// ═══════════════════════════════════════════════════════════
const ACCORDION_KEY = 'benti_accordions';
const accordions = ['accPosition', 'accExport', 'accAudit'];

function initAccordions() {
  const apply = (saved) => {
    accordions.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      // Default: zu. Nur öffnen, wenn ausdrücklich als offen gespeichert.
      el.open = !!(saved && saved[id]);
      el.addEventListener('toggle', () => saveAccordionState());
    });
  };
  bentiStore.get([ACCORDION_KEY], (res) => apply(res[ACCORDION_KEY]));
}

function saveAccordionState() {
  const state = {};
  accordions.forEach(id => {
    const el = document.getElementById(id);
    if (el) state[id] = el.open;
  });
  bentiStore.set({ [ACCORDION_KEY]: state });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccordions);
} else {
  initAccordions();
}
updateDeTextRow();
