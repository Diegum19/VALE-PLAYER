'use strict';
const { contextBridge, ipcRenderer } = require('electron');
try {
  const { exposeMpvApi } = require('electron-mpv-video/preload');
  exposeMpvApi();
} catch (error) {
  // Optional native engine; Chromium remains available if it cannot be exposed.
  console.warn('Vela Player: API MPV indisponível.', error);
}
contextBridge.exposeInMainWorld('vela', {
  platform: 'desktop',
  api: (url) => ipcRenderer.invoke('api', url),
  storeGet: (k) => ipcRenderer.invoke('store:get', k),
  storeSet: (k, v) => ipcRenderer.invoke('store:set', k, v),
  credSave: (o) => ipcRenderer.invoke('cred:save', o),
  credLoad: () => ipcRenderer.invoke('cred:load'),
  credClear: () => ipcRenderer.invoke('cred:clear'),
  fullscreen: (on) => ipcRenderer.invoke('fullscreen', on),
});
