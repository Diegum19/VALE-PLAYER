// Copia as bibliotecas de reprodução para dentro do app (ficam embutidas no instalador).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'renderer', 'vendor');
fs.mkdirSync(out, { recursive: true });
const files = [
  ['node_modules/hls.js/dist/hls.min.js', 'hls.min.js'],
  ['node_modules/mpegts.js/dist/mpegts.js', 'mpegts.js'],
];
for (const [from, to] of files) {
  const src = path.join(root, from);
  if (!fs.existsSync(src)) { console.error('Arquivo não encontrado: ' + from + ' (rode npm install)'); process.exit(1); }
  fs.copyFileSync(src, path.join(out, to));
  console.log('ok', to);
}
