# Vela Player 0.3.3 (PC / Windows 10-11 64 bits)

App de PC com **reprodutor embutido**: o cliente baixa **um único arquivo**
(`Instalar-Vela-Player.exe`), dá dois cliques e abre pelo atalho. Sem CMD, sem ZIP,
sem VLC, sem Python, sem internet durante a instalação, sem administrador.

## Como gerar o instalador (uma vez, sem instalar nada no seu PC)
1. Crie um repositório **privado** no GitHub e envie esta pasta inteira.
2. Aba **Actions → Gerar instalador Windows → Run workflow**.
3. Baixe `Instalar-Vela-Player.exe` em *Artifacts* no fluxo concluído.

## Novidades da 0.3.3
- **Player moderno:** barra de progresso própria, tempos decorrido/total, indicação do buffer, busca, play/pause, saltos de 10 segundos e volume.
- **Pôsteres corrigidos:** a grade reserva altura real para cada capa, prefere campos próprios de pôster em vez de logos/backdrops e busca metadados ao entrar na área visível. Só capas válidas são guardadas em cache.
- **Tela de detalhes estável:** mantém a capa vertical já carregada, evita a troca brusca entre imagens e usa ajuste sem corte para evitar o efeito de zoom.
- **Player único:** removido o botão e a troca automática para o player externo; retomar episódio não fecha o player embutido para abrir outra janela.
- **Controles alinhados:** os números dos saltos de 10 segundos ficam dentro dos botões e os controles/sinopse receberam ajustes de alinhamento.
- **Ícones e rolagem:** SVGs consistentes e barras de rolagem personalizadas.
- **Página inicial redesenhada:** TV ao vivo, Filmes e Séries em cartões grandes centralizados.
- **Capas mais robustas:** busca em vários campos de imagem e URLs relativas, com tentativa automática de capas alternativas.
- **Visual refinado:** hierarquia de texto, espaçamento, foco do controle remoto, cartões, login e diálogos.
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
hls.js e mpegts.js: Apache-2.0. Ideias de recursos foram estudadas em projetos open source (ex.: IPTVnator, MIT), sem copiar código nem marca.

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
1. HLS (`.m3u8`) via hls.js → 2. MPEG-TS ao vivo via mpegts.js → 3. vídeo nativo, conforme os formatos e codecs suportados pelo Chromium/Electron.
O aplicativo mantém a reprodução em uma única janela; arquivos/streams com codecs não suportados exibem erro em vez de abrir outro player. MKV, HEVC e áudio AC3 dependem da compatibilidade do formato e do build do Chromium.

## Limites conhecidos
- Instalador sem assinatura digital: o Windows pode mostrar um aviso do SmartScreen. Uma assinatura digital válida pode ajudar na confiança, mas não garante que os alertas desapareçam imediatamente.
- Canais ao vivo em formatos que o Chromium não decodifica (ex.: MPEG-2, áudio AC3) podem ficar sem imagem/som.
- Não testado em Windows real nesta sessão (o ambiente não compila nem executa Windows).


## Referências de UX consultadas
- LiveBox (player IPTV desktop): https://github.com/aimen08/livebox
- IPTVnator (listas, categorias e favoritos): https://github.com/gs-stream/iptvnator-electron
- CentPlayer (progresso, busca e auto-hide): https://github.com/CenturiDevs/CentPlayer
- Documentação Xtream Codes API, poster VOD: https://github.com/worldofiptvcom/xtream-codes-api/blob/master/docs/player-api/vod-info.md

A implementação do Vela Player é própria; essas referências orientaram os recursos e a experiência de uso.
