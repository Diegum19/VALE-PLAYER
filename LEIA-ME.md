# Vela Player 0.3.0 (PC / Windows 10-11 64 bits)

App de PC com **reprodutor embutido**: o cliente baixa **um único arquivo**
(`Instalar-Vela-Player.exe`), dá dois cliques e abre pelo atalho. Sem CMD, sem ZIP,
sem VLC, sem Python, sem internet durante a instalação, sem administrador.

## Como gerar o instalador (uma vez, sem instalar nada no seu PC)
1. Crie um repositório **privado** no GitHub e envie esta pasta inteira.
2. Aba **Actions → Gerar instalador Windows → Run workflow**.
3. Em ~5 minutos, baixe `Instalar-Vela-Player.exe` em *Artifacts* (ou na página de Releases, se criar uma tag `v0.3.0`).

## Novidades da 0.3.0
- **Guia de programação (EPG):** "Agora / A seguir" com barra de progresso nos canais ao vivo.
- **Zapping:** setas ↑↓ ou PageUp/PageDown trocam de canal; digitar o número (ex.: 12) vai direto ao canal.
- **Reconexão automática** se o canal ao vivo cair.
- **Início:** continuar assistindo (com barra de progresso), canais recentes, assistidos e favoritos.
- **Filmes:** página com sinopse, elenco e direção; botão "Continuar de mm:ss".
- **Vários perfis** (cada um com seus favoritos/histórico) e **Trocar perfil**.
- **Busca geral** em canais, filmes e séries; **ordenação** (A–Z, mais recentes, melhor avaliação).
- **Ocultar conteúdo adulto com PIN** (Configurações).
- Atalhos no player: espaço (pausa), ←/→ (±10 s em filmes), ↑/↓ (volume em filmes), M (mudo), F (tela cheia).

## Licenças de terceiros (distribuição)
hls.js e mpegts.js: Apache-2.0. mpv (player avançado embutido): GPL-2.0-or-later — ao distribuir o instalador,
informe isso e disponibilize o link do código-fonte (https://github.com/mpv-player/mpv). Ideias de recursos foram
estudadas em projetos open source (ex.: IPTVnator, MIT), sem copiar código nem marca.

## Teste/desenvolvimento
- `npm install` → `npm start` (abre o app) → `npm test` (lógica).
- `test/ui.test.py` + `test/mock-xtream.js`: teste de interface contra servidor Xtream falso.

## Arquitetura (pensada para as TVs depois)
- `renderer/` é HTML/CSS/JS puro, sem dependência do Electron além do adaptador no topo de `app.js`.
  É a mesma base que roda em **Samsung Tizen** e **LG webOS** (apps web); Android TV pode
  empacotar a mesma pasta em um WebView. Navegação por setas/controle remoto já incluída.
- `renderer/core.js`: regras da API Xtream, testadas.
- `main.js`: janela, requisições à API (sem bloqueio CORS), credenciais criptografadas pelo Windows
  (DPAPI), favoritos/histórico/ponto de retomada em arquivo local.

## Reprodução
1. HLS (`.m3u8`) via hls.js → 2. MPEG-TS ao vivo via mpegts.js → 3. vídeo nativo (MP4/WebM, H.264/AAC).
Se falhar em filmes/séries (MKV, HEVC, áudio AC3…), abre automaticamente no **mpv embutido** (janela própria).

## Limites conhecidos
- Instalador sem assinatura digital: o Windows pode mostrar "O Windows protegeu o computador"
  (o cliente clica em *Mais informações → Executar assim mesmo*). Um certificado de assinatura de código remove o aviso.
- Canais ao vivo em formatos que o Chromium não decodifica (ex.: MPEG-2, áudio AC3) podem ficar sem imagem/som.
- Não testado em Windows real nesta sessão (o ambiente não compila nem executa Windows).
