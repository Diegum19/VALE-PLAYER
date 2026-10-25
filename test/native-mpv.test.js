'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const addonPath = path.join(__dirname, '..', 'node_modules', 'electron-mpv-video', 'native', 'mpv-addon', 'build', 'Release', 'mpv_addon.node');
const mediaPath = process.env.MPV_SMOKE_SOURCE || path.join(__dirname, 'clip.webm');
assert.ok(fs.existsSync(addonPath), 'addon nativo MPV foi compilado');
assert.ok(fs.existsSync(mediaPath), 'arquivo de mídia de teste existe');

const addon = require(addonPath);
const player = new addon.MpvPlayer({ mode: 'software' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  let loaded = false;
  let codec = '';
  let width = 0;
  let height = 0;
  const loadDeadline = Date.now() + 12000;
  try {
    player.open(mediaPath);
    while (Date.now() < loadDeadline && !loaded) {
      for (const event of player.pollEvents()) {
        if (event.error) throw new Error('libmpv: ' + event.error);
        if (event.type === 'file-loaded') loaded = true;
        if (event.name === 'video-codec') codec = String(event.data || '');
        if (event.name === 'width') width = Number(event.data) || width;
        if (event.name === 'height') height = Number(event.data) || height;
      }
      if (!loaded) await sleep(20);
    }
    assert.ok(loaded, 'libmpv carregou o arquivo de teste');
    player.play();

    const decodeDeadline = Date.now() + 8000;
    let frame = null;
    while (Date.now() < decodeDeadline) {
      for (const event of player.pollEvents()) {
        if (event.error) throw new Error('libmpv: ' + event.error);
        if (event.name === 'video-codec') codec = String(event.data || '');
        if (event.name === 'width') width = Number(event.data) || width;
        if (event.name === 'height') height = Number(event.data) || height;
      }
      frame = player.renderFrame(96, 54);
      if (width > 0 && height > 0 && codec) break;
      await sleep(30);
    }
    assert.ok(width > 0 && height > 0, 'libmpv identificou as dimensões do vídeo');
    assert.ok(codec, 'libmpv identificou o codec de vídeo');
    assert.ok(frame && frame.rgba && frame.rgba.length === 96 * 54 * 4, 'libmpv renderizou um quadro RGBA válido');
    player.pause();
    player.seek(1);
    process.stdout.write('PASS MPV nativo: arquivo aberto, codec=' + codec + ', resolução=' + width + 'x' + height + ', quadro RGBA e seek aprovados\n');
  } finally {
    player.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
