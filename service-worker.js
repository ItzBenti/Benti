// ════════════════════════════════════════════════════════════════════════════
// Benti – Background Service Worker
// Opens the Side Panel when the extension icon is clicked
// ════════════════════════════════════════════════════════════════════════════

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Benti] Side Panel setup error:', error));
