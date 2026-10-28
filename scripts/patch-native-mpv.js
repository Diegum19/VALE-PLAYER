'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const packageRoot = path.resolve(__dirname, '..', 'node_modules', 'electron-mpv-video');
const sourcePath = path.join(packageRoot, 'native', 'mpv-addon', 'src', 'mpv_addon.cc');
const marker = 'VELA_PLAYER_NETWORK_RESILIENCE_V1';

if (!fs.existsSync(sourcePath)) {
  throw new Error('Código nativo do electron-mpv-video não foi encontrado: ' + sourcePath);
}
let source = fs.readFileSync(sourcePath, 'utf8');
if (!source.includes(marker)) {
  const optionAnchor = '    set_option("keep-open", "yes");';
  if (!source.includes(optionAnchor)) throw new Error('Não foi possível localizar o ponto seguro para configurar o cache do libmpv.');
  source = source.replace(optionAnchor, optionAnchor + `
    // ${marker}: buffer for intermittent IPTV network stalls.
    set_option("cache", "yes");
    set_option("cache-secs", "20");
    set_option("demuxer-max-bytes", "128MiB");
    set_option("demuxer-max-back-bytes", "32MiB");
    set_option("cache-pause", "yes");
    set_option("cache-pause-wait", "2");
    set_option("cache-pause-initial", "yes");
    set_option("network-timeout", "45");
    set_option("curl-connect-timeout", "12");
    set_option("curl-max-retries", "5");`);
}
const observeAnchor = '    observe("eof-reached", MPV_FORMAT_FLAG);';
if (!source.includes('observe("paused-for-cache", MPV_FORMAT_FLAG);')) {
  if (!source.includes(observeAnchor)) throw new Error('Não foi possível localizar o ponto seguro para observar o estado de buffer do libmpv.');
  source = source.replace(observeAnchor, observeAnchor + `
    observe("paused-for-cache", MPV_FORMAT_FLAG);
    observe("cache-buffering-state", MPV_FORMAT_INT64);`);
}
fs.writeFileSync(sourcePath, source, 'utf8');

const nodeGyp = require.resolve('node-gyp/bin/node-gyp.js', { paths: [packageRoot] });
const build = spawnSync(process.execPath, [nodeGyp, 'rebuild', '--directory', 'native/mpv-addon'], {
  cwd: packageRoot, stdio: 'inherit', env: process.env,
});
if (build.error) throw build.error;
if (build.status !== 0) throw new Error('Compilação do addon MPV resiliente falhou (código ' + build.status + ').');

const stageScript = path.join(packageRoot, 'scripts', 'libmpv-runtime.mjs');
const stage = spawnSync(process.execPath, [stageScript, 'stage'], {
  cwd: packageRoot, stdio: 'inherit', env: process.env,
});
if (stage.error) throw stage.error;
if (stage.status !== 0) throw new Error('Não foi possível copiar as DLLs do libmpv depois da recompilação.');
console.log('MPV recompilado com cache de rede, retentativas HTTP e eventos de buffering.');
