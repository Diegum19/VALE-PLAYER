'use strict';
// Register the packaged native renderer only on Electron desktop.
// A failed native load is non-fatal: Chromium remains the fallback.
window.__velaMpvReady = (async () => {
  if (!window.vela || window.vela.platform !== 'desktop' || !window._electronMpvVideo) return false;
  const renderer = await import('../node_modules/electron-mpv-video/dist/renderer/index.js');
  renderer.defineMpvVideoElement();
  return true;
})().catch((error) => {
  console.warn('Vela Player: motor MPV indisponível nesta instalação.', error);
  return false;
});
