# Vela Player 1.2.1 (PC / Windows 10-11 64 bits)

App de PC com **reprodutor embutido**: o cliente baixa **um único arquivo**
(`Instalar-Vela-Player.exe`), dá dois cliques e abre pelo atalho. Sem CMD, sem ZIP,
sem VLC, sem Python, sem internet durante a instalação, sem administrador.

## Requisitos práticos do PC

Estes são alvos estimados para este aplicativo, não uma tabela oficial de requisitos do Electron.

**Mínimo para abrir e navegar no catálogo**
- Windows 10 64 bits ou Windows 11 64 bits; build do aplicativo para x64.
- Processador moderno de 2 núcleos, 4 GB de RAM e cerca de 1 GB de espaço livre.
- GPU/driver compatível com a aceleração gráfica do Windows; conexão estável ao servidor IPTV.
- Vídeo: comece com H.264/AAC em 720p. Em PCs modestos, muitos programas abertos ou catálogos grandes podem causar lentidão com apenas 4 GB de RAM.

**Recomendado para uso mais fluido**
- Windows 11 64 bits (ou Windows com suporte de segurança vigente).
- Intel Core i5 de 8ª geração ou equivalente moderno AMD Ryzen 5, 8 GB de RAM e SSD; 16 GB são bons para multitarefa e listas grandes.
- Gráficos integrados modernos ou placa dedicada com driver atualizado e decodificação por hardware de H.264; para HEVC/H.265, AV1, HDR ou 4K, o suporte do decodificador importa mais do que só a quantidade de memória da placa.
- Como referência de rede, cerca de 10–15 Mbps estáveis para um fluxo HD e 25 Mbps ou mais para 4K; o bitrate real do servidor pode exigir mais.

**O que mais influencia travamentos:** codec de vídeo/áudio, aceleração de hardware disponível no Electron/Chromium, driver de vídeo, bitrate e estabilidade do servidor. A extensão de arquivo sozinha não garante compatibilidade nem suavidade; veja Configurações → Diagnóstico de vídeo em caso de falha. O aplicativo não converte codecs incompatíveis.

O build usa Electron 45, cujo suporte oficial é Windows 10 ou posterior, em arquitetura x64 nesta distribuição ([plataformas do Electron](https://github.com/electron/electron#platform-support)). Atenção: o suporte padrão do Windows 10 Home/Pro terminou em 14 de outubro de 2025; para segurança, prefira um sistema que ainda receba atualizações ([Microsoft Lifecycle](https://learn.microsoft.com/pt-br/lifecycle/announcements/windows-10-end-of-support)).

## Como gerar o instalador (uma vez, sem instalar nada no seu PC)
1. Crie um repositório **privado** no GitHub e envie esta pasta inteira.
2. Aba **Actions → Gerar instalador Windows → Run workflow**.
3. Baixe `Instalar-Vela-Player.exe` em *Artifacts* no fluxo concluído.

## Novidades da 1.2.1
- **Imagem sem escurecimento artificial:** removida a vinheta preta de tela inteira e os gradientes escuros que cobriam as bordas superior e inferior do vídeo. Os controles mantêm apenas seus próprios fundos discretos, sem uma faixa escura por toda a tela.
- **Sem sombras pretas sobre os elementos do vídeo:** removidas as sombras de texto do título, mensagens e número do canal.
- **Regressão visual automatizada:** dezenas de resoluções são verificadas no Playwright, com centenas de asserções sobre sobreposições, dimensões, posicionamento e barra de progresso.
- **Teste estrutural do player:** o comando de testes verifica que a vinheta e os gradientes de tela inteira não retornam numa mudança futura de CSS. Nenhuma dependência nova foi adicionada.

## Novidades da 1.2.0
- **Explorar funciona:** os atalhos das seções iniciais agora são botões reais, acessíveis por teclado e com destino correto. “Continue descobrindo” abre o histórico completo (até 300 registros, carregados em páginas); “Minha lista” abre os favoritos.
- **Início mais útil:** atalhos rápidos para Histórico e Busca geral, além de estados vazios com ação para começar a navegar.
- **80 ajustes visuais e de usabilidade:** contraste e foco, botões/seletores, cartões e pôsteres, contagem e barras de progresso, hero, trilhos horizontais, detalhes/episódios, modais, mensagens, controles do player e responsividade.
- **Acessibilidade e leveza:** nomes acessíveis para cartões e trilhos, áreas de clique mais claras, suporte a foco/teclado e redução de animações respeitando a preferência do sistema. Sem dependências novas, sem imagens externas adicionadas e sem outro motor de vídeo.

## Novidades da 1.1.4
- **Abertura inicial e reconexão diferenciadas:** uma primeira falha de rede em filmes/séries ainda pode tentar o MPV; o fallback só é adiado quando já está no ciclo de reconexão.
- **Política com testes unitários:** novas verificações cobrem a decisão de adiar/tentar o motor nativo em aberturas, reconexões de VOD e canais ao vivo.

## Novidades da 1.1.3
- **Recuperação com prioridade correta:** falhas de codec podem migrar imediatamente para o MPV; erros de rede/tempo esgotado usam primeiro as reconexões limitadas e só depois tentam outro motor.
- **TV ao vivo mais resiliente:** falhas de rede durante a reprodução respeitam até três reconexões antes da mudança de engine, sem repetir tentativas infinitas.
- **Diagnóstico copiável corrigido:** o relatório de vídeo agora separa as informações em linhas reais.
- **Testes de política de recuperação:** cobertura adicional para a quantidade de tentativas de rede antes do fallback, mantendo o mesmo conjunto de dependências.

## Novidades da 1.1.2
- **Fallback nativo para TV ao vivo:** canais podem migrar uma vez do Chromium para o MPV em falhas recuperáveis de rede/codec, sem manter os dois motores disputando o fluxo.
- **Menos tentativas sem utilidade:** HTTP 401, 403, 404, 410 e 429 bloqueiam a troca de decodificador para uma fonte recusada/ausente/limitada; o bloqueio é reavaliado ao tentar outra URL.
- **Diagnóstico mais seguro:** mensagens de erro do MPV ocultam URLs de transmissão e credenciais antes de serem exibidas ou copiadas.
- **Fallback gráfico mais preciso:** erros de codec e rede não são confundidos com falhas do renderizador.
- **Peso:** nenhuma biblioteca nova foi adicionada; os ajustes reutilizam o MPV/libmpv e as dependências existentes.

## Novidades da 1.1.1
- **Terceira via de renderização nativa:** após falhas gráficas identificadas, o MPV tenta superfícies compartilhadas, WebGL e Canvas 2D; erros de rede/codec não são tratados como falhas gráficas.
- **Fallback de rede em filmes e séries:** quando o Chromium falha por rede/tempo esgotado, o aplicativo pode tentar o MPV uma vez, preservando as proteções contra repetição infinita.
- **Respostas HTTP tratadas com cautela:** falhas HTTP 401, 404 e 410 não acionam uma tentativa extra de decodificação, pois normalmente indicam acesso inválido ou URL ausente/expirada.
- **Validação:** a compilação automatizada testa a integração nativa e um vídeo WebM de exemplo; ainda é necessário verificar os fluxos e codecs específicos do servidor de cada cliente.

## Novidades da 1.1.0
- **Motor nativo MPV/libmpv:** quando o Chromium falha ao iniciar um filme ou episódio, o aplicativo tenta automaticamente o motor nativo dentro do mesmo player.
- **Compatibilidade ampliada:** o runtime libmpv/FFmpeg pode reconhecer mais contêineres, vídeo e áudio, incluindo alguns arquivos MKV, HEVC/H.265 e AC-3/E-AC-3, conforme o codec e as opções presentes no build.
- **Recuperação durante a reprodução:** erros de decodificação do Chromium podem acionar o motor nativo a partir da posição atual, preservando pausa e navegação quando possível.
- **Sem dois motores disputando o episódio:** ao mudar de conteúdo, a sessão nativa anterior é destruída antes de abrir outra, prevenindo que comandos atrasados parem o vídeo novo.
- **Renderização em duas vias:** tenta a superfície nativa compartilhada e pode recorrer à renderização WebGL caso a via de GPU falhe.
- **Diagnóstico do motor:** identifica o motor atual e mostra o codec/renderer MPV quando ele é utilizado.
- **Build do motor protegido:** o CI baixa a versão específica do SDK libmpv LGPL, valida seu SHA-256 e executa um teste real de decodificação antes de publicar o instalador.
- **Licenças:** o instalador inclui THIRD-PARTY-LICENSES.md para o runtime nativo e suas dependências.

**Limite importante:** o motor nativo amplia a compatibilidade, mas não corrige um arquivo danificado, URL vencida, bloqueio do servidor ou todos os codecs possíveis. A disponibilidade exata depende da compilação distribuída.

## Novidades da 1.0.1
- **Ciclo de vida do vídeo mais seguro:** cada fonte/tentativa tem identidade própria; eventos atrasados e abortos do vídeo anterior não podem interromper o episódio recém-aberto.
- **Pausa mais previsível:** o app distingue pausa solicitada pelo usuário de pausas transitórias durante carregamento, troca de fonte e recuperação.
- **Recuperação de mídia HLS:** tenta uma recuperação limitada para falhas fatais de mídia e de rede antes de mostrar erro, evitando loops infinitos.
- **Erros de codec mais precisos:** distingue falha de rede, aborto, erro de decodificação e formato não suportado; o diagnóstico mostra também a mensagem do erro nativo, quando disponível.
- **Regressão de troca rápida de episódios:** teste automatizado abre e fecha um episódio repetidamente e injeta eventos atrasados para conferir que não causam pausa indevida nem erro falso.

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
- **Continuar assistindo:** botão separado para recomeçar um filme ou o último episódio salvo do início, sem confundir a retomada com a reprodução desde 00:00.
- **Testes de lançamento:** filtros, pesquisa por metadados, diagnóstico, limites de seek, stress de 1.000+ ações, retomada, recomeço, falha transitória e avanço entre episódios.
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
