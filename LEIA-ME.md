# Vela Player 1.0.0 (PC / Windows 10-11 64 bits)

App de PC com **reprodutor embutido**: o cliente baixa **um único arquivo**
(`Instalar-Vela-Player.exe`), dá dois cliques e abre pelo atalho. Sem CMD, sem ZIP,
sem VLC, sem Python, sem internet durante a instalação, sem administrador.

## Como gerar o instalador (uma vez, sem instalar nada no seu PC)
1. Crie um repositório **privado** no GitHub e envie esta pasta inteira.
2. Aba **Actions → Gerar instalador Windows → Run workflow**.
3. Baixe `Instalar-Vela-Player.exe` em *Artifacts* no fluxo concluído.

## Novidades da 1.0.0
- **Versão 1.0.0:** primeira versão de lançamento consolidada, com a linha visual cinematográfica e controles centralizados.
- **Busca ampliada:** além de títulos, a pesquisa considera gênero, ano, sinopse, descrição, elenco e direção quando disponíveis.
- **Filtros de catálogo:** gênero, ano e avaliação em filmes/séries, com limpeza rápida e ordenação por ano.
- **Catálogo em cache:** voltar para “Todas” reutiliza a lista completa da sessão em vez de solicitar os mesmos dados novamente.
- **Memória mais previsível:** cache de detalhes limitado a 240 entradas, cache de pôsteres a 1.500 entradas e liberação de observadores de imagem em grades descartadas.
- **Biblioteca consistente:** limpar histórico/favoritos atualiza as telas; limpar retomadas interrompe a sessão atual para não recriar pontos apagados.
- **Diagnóstico de vídeo detalhado:** estado do player, motor ativo, formato, tempo, buffer, resolução, estado de rede/decodificador, tentativas de recuperação e suporte reportado a codecs — sem host, usuário, senha ou URL.
- **Reprodução mais resiliente:** busca limitada ao intervalo válido e recuperação limitada de falhas preservando posição/pausa quando possível.
- **Inicialização de instância única corrigida:** uma segunda instância não tenta abrir outra janela após solicitar a saída.
- **Testes de lançamento:** filtros, pesquisa por metadados, diagnóstico, limites de seek, stress de 1.000+ ações, retomada, falha transitória e avanço entre episódios.
- **Controles de reprodução reposicionados:** retroceder à esquerda, play/pausa no centro geométrico e avançar à direita, com ícones de 10 segundos integrados e alinhamento responsivo.
- **Recuperação de reprodução:** erros nativos e fatais do motor durante um vídeo tentam reconectar a partir do tempo atual, com até duas tentativas para evitar loops infinitos.
- **Busca mais segura:** os saltos por botão/teclado e o controle de progresso limitam o tempo ao intervalo válido do vídeo e tratam falhas ao alterar a posição.
- **Aviso compacto de próximo episódio:** aparece 30 segundos antes do fim, com contagem final configurável de 5 ou 10 segundos, botão Assistir agora e Cancelar.
- **Mais testes de regressão:** 1.000+ ações simuladas, ordem visual dos três botões, falha transitória de rede com recuperação da posição e avanço manual/automático entre temporadas.
- **Controles centralizados:** play/pausa e saltos de 10 segundos ficam no centro geométrico do player; ícones refeitos sem etiquetas deslocadas.
- **Próximo episódio:** cartão cinematográfico aparece no último minuto do episódio (proporcionalmente em vídeos curtos), com miniatura e botão para avançar agora ou cancelar.
- **Avanço automático configurável:** ativado por padrão, com contagem final de 5 ou 10 segundos; o contador acompanha o tempo do vídeo e congela quando ele pausa.
- **Transição de episódios:** encontra o próximo episódio na mesma temporada ou na seguinte sem reiniciar a navegação do usuário.
- **Teste de estresse do player:** centenas de operações de seek, saltos, teclado e pausa/retomada, mais testes do avanço manual e automático.
- **Player moderno:** barra de progresso própria, tempos decorrido/total, indicação do buffer, busca, play/pause, saltos de 10 segundos e volume.
- **Pôsteres corrigidos:** a grade reserva altura real para cada capa, prefere campos próprios de pôster em vez de logos/backdrops e busca metadados ao entrar na área visível. Só capas válidas são guardadas em cache.
- **Tela de detalhes estável:** mantém a capa vertical já carregada, evita a troca brusca entre imagens e usa ajuste sem corte para evitar o efeito de zoom.
- **Interface cinematográfica:** início com destaque visual, imagem de fundo quando disponível, botões de ação e trilhos horizontais de conteúdo no estilo dos serviços de streaming.
- **Navegação consistente em séries:** ao voltar do episódio, o app retorna para a mesma tela de temporadas/episódios, destaca o episódio que estava tocando e devolve o foco a ele.
- **Episódios redesenhados:** miniaturas 16:9 quando fornecidas pelo servidor, numeração, título, descrição e barra de progresso da retomada.
- **Hierarquia visual renovada:** fundo preto, detalhes em vermelho, cartões com hover, seções mais claras, botões alinhados e layout adaptado a telas menores.
- **Minha lista:** a navegação dos favoritos recebeu um nome mais familiar e continua usando o mesmo armazenamento.
- **Player único:** sem troca automática de janela; erros que acontecem durante a reprodução agora exibem uma mensagem útil.
- **Compatibilidade ampliada:** HLS com hls.js, MPEG-DASH com dash.js, MPEG-TS e FLV com mpegts.js, além dos formatos nativos suportados pelo Chromium/Electron.
- **Qualidade de vídeo:** seletor para escolher resolução manual em manifestos HLS/DASH ou manter a qualidade automática, sem limitar os níveis à dimensão do player.
- **Diagnóstico:** configuração mostra o suporte que o sistema reporta para H.264/AAC, HEVC, AV1, VP9 e MPEG-TS.
- **Ícone novo:** vela estilizada em ciano/branco sobre fundo azul-marinho, aplicada à tela de login, janela e instalador.
- **Motores atualizados:** Electron/Chromium, HLS.js, MPEG-TS e dash.js foram atualizados para versões estáveis atuais.
- **Testes ampliados:** CI valida sintaxe, lógica do núcleo, interface usando Chromium e servidor Xtream simulado, reprodução de um vídeo WebM e retorno à temporada/episódio após fechar o player.
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
HLS (`.m3u8`) via hls.js; MPEG-DASH (`.mpd`) via dash.js; MPEG-TS e FLV via mpegts.js; outros formatos são enviados ao decodificador nativo do Chromium/Electron. A seleção manual de resolução existe quando o manifesto HLS/DASH fornece variantes.

A extensão do arquivo não garante suporte ao codec: MKV, HEVC/H.265, AV1, áudio AC3/DTS e HDR dependem do codec, do sistema operacional, da GPU/driver, e do próprio fluxo. O aplicativo não faz upscaling nem pode aumentar uma qualidade que o servidor não transmite. Se houver erro durante uma reprodução, o player mostra a causa aproximada sem abrir outro player automaticamente.

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
