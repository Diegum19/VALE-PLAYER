'use strict';
const { app, BrowserWindow, ipcMain, session, safeStorage, net, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;
const dataFile = () => path.join(app.getPath('userData'), 'vela-data.json');
const credFile = () => path.join(app.getPath('userData'), 'login.bin');

function readData() {
  try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); } catch { return {}; }
}
let writeTimer = null;
let cache = null;
function data() { if (!cache) cache = readData(); return cache; }
function saveData() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      fs.mkdirSync(app.getPath('userData'), { recursive: true });
      const tmp = dataFile() + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(cache));
      fs.renameSync(tmp, dataFile());
    } catch (e) { /* disco cheio ou sem permissão: ignora */ }
  }, 300);
}

function isHttp(u) {
  try { const p = new URL(u); return p.protocol === 'http:' || p.protocol === 'https:'; } catch { return false; }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    backgroundColor: '#0b0f17', title: 'Vela Player', autoHideMenuBar: true,
    icon: path.join(__dirname, 'renderer', 'assets', 'app-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) e.preventDefault(); });
  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  // Servidores de mídia normalmente não enviam cabeçalhos CORS; o app é um player local,
  // então libera o acesso do reprodutor embutido às respostas dos servidores.
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    const h = details.responseHeaders || {};
    if (/^https?:/i.test(details.url)) {
      for (const k of Object.keys(h)) if (/^access-control-/i.test(k)) delete h[k];
      h['Access-Control-Allow-Origin'] = ['*'];
      h['Access-Control-Allow-Headers'] = ['*'];
      h['Access-Control-Allow-Methods'] = ['GET, HEAD, OPTIONS'];
      h['Access-Control-Expose-Headers'] = ['Content-Length, Content-Range, Accept-Ranges'];
    }
    cb({ responseHeaders: h });
  });
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));

  ipcMain.handle('api', async (_e, url) => {
    if (!isHttp(url)) return { ok: false, error: 'bad_url' };
    try {
      const res = await net.fetch(url, { headers: { 'User-Agent': 'VelaPlayer/' + app.getVersion() }, signal: AbortSignal.timeout(40000) });
      if (!res.ok) return { ok: false, error: 'http', status: res.status };
      const text = await res.text();
      try { return { ok: true, json: JSON.parse(text) }; } catch { return { ok: false, error: 'not_json' }; }
    } catch (e) {
      const m = String((e && e.message) || e);
      if (/timeout|aborted/i.test(m)) return { ok: false, error: 'timeout' };
      if (/CERT|SSL/i.test(m)) return { ok: false, error: 'ssl' };
      return { ok: false, error: 'network' };
    }
  });

  ipcMain.handle('store:get', (_e, key) => data()[key] ?? null);
  ipcMain.handle('store:set', (_e, key, value) => { data()[key] = value; saveData(); return true; });

  ipcMain.handle('cred:save', (_e, obj) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) return false;
      fs.mkdirSync(app.getPath('userData'), { recursive: true });
      fs.writeFileSync(credFile(), safeStorage.encryptString(JSON.stringify(obj)));
      return true;
    } catch { return false; }
  });
  ipcMain.handle('cred:load', () => {
    try { return JSON.parse(safeStorage.decryptString(fs.readFileSync(credFile()))); } catch { return null; }
  });
  ipcMain.handle('cred:clear', () => { try { fs.unlinkSync(credFile()); } catch {} return true; });

  ipcMain.handle('fullscreen', (_e, on) => { if (win) win.setFullScreen(!!on); return true; });


  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('before-quit', () => { if (cache) { try { fs.writeFileSync(dataFile(), JSON.stringify(cache)); } catch {} } });
app.on('window-all-closed', () => { app.quit(); });
