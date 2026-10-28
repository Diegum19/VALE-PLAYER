'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'renderer', 'app.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let checks = 0;
function check(condition, message) {
  checks++;
  assert.ok(condition, message);
  console.log('PASS ' + message);
}
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped + '\\s*\\{([^}]*)\\}', 'g');
  return [...css.matchAll(re)].map(match => match[1]);
}
function effective(selector, property, expected) {
  const declarations = rule(selector).map(body => {
    const found = body.match(new RegExp('(?:^|;)\\s*' + property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*([^;]+)', 'i'));
    return found ? found[1].trim() : null;
  }).filter(Boolean);
  return declarations.includes(expected);
}

check(!html.includes('class="player-vignette"'), 'HTML não cria camada de vinheta');
check(!css.includes('.player-vignette'), 'CSS não contém a antiga vinheta');
check(!/#ptop\s*\{[^}]*background\s*:\s*linear-gradient/i.test(css), 'cabeçalho não usa gradiente escurecedor');
check(!/#playerControls\s*\{[^}]*background\s*:\s*linear-gradient/i.test(css), 'controles inferiores não usam gradiente escurecedor');
check(effective('#ptop','background','transparent'), 'cabeçalho do player tem fundo transparente');
check(effective('#playerControls','background','transparent'), 'área dos controles tem fundo transparente');
check(effective('#ptop','box-shadow','none'), 'cabeçalho não projeta sombra');
check(effective('#playerControls','box-shadow','none'), 'área dos controles não projeta sombra');
check(effective('#ptitle','text-shadow','none'), 'título não projeta sombra sobre a imagem');
check(effective('#pmsg','text-shadow','none'), 'mensagens não projetam sombra sobre a imagem');
check(effective('#pnum','text-shadow','none'), 'indicador de canal não projeta sombra sobre a imagem');
check(css.includes('#seek.seek-slider'), 'barra de busca do vídeo continua estilizada');
check(css.includes('var(--played,0%)'), 'barra diferencia parte reproduzida');
check(css.includes('var(--buffered,0%)'), 'barra diferencia parte carregada');
check(css.includes('.player-back'), 'botão Voltar continua com estilo próprio');
check(css.includes('.player-action.primary'), 'botão principal do player continua estilizado');
check(pkg.version === '1.2.1', 'versão do pacote foi atualizada para 1.2.1');
check(pkg.scripts.test.includes('test/player-visual.test.js'), 'teste visual faz parte de npm test');
check(!/#player\s*\{[^}]*filter\s*:/i.test(css), 'container do player não aplica filtro escuro');
check(!/#video\s*\{[^}]*filter\s*:/i.test(css), 'vídeo não recebe filtro de escurecimento');
console.log('Total: ' + checks + ' verificações de regressão visual do player.');
