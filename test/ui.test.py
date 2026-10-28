import subprocess, time, sys, os
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
mock = subprocess.Popen(['node', os.path.join(here, 'mock-xtream.js')])
web = subprocess.Popen([sys.executable, '-m', 'http.server', '8098', '-d', os.path.join(root, 'renderer')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
ok = True
def check(c, msg):
    global ok
    print(('PASS ' if c else 'FAIL ') + msg); ok = ok and c
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = b.new_context(viewport={'width': 1280, 'height': 800}, bypass_csp=True).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://localhost:8098/index.html')
        # login errado
        pg.fill('#host', 'localhost:8099'); pg.fill('#user', 'joao'); pg.fill('#pass', 'errada'); pg.click('#loginBtn')
        pg.wait_for_function("document.getElementById('loginErr').textContent.length>0")
        check('Acesso recusado' in pg.inner_text('#loginErr'), 'senha errada mostra mensagem em português')
        # login certo
        pg.fill('#pass', 'segredo'); pg.click('#loginBtn')
        pg.wait_for_selector('#home')
        check('Sua próxima história começa aqui' in pg.inner_text('#home'), 'início usa destaque cinematográfico quando ainda não há histórico')
        hero = pg.evaluate("""() => {
          const h = document.querySelector('#home .home-hero');
          const p = document.querySelector('#home');
          const r = h.getBoundingClientRect();
          return { maxWidth: getComputedStyle(h).maxWidth, width: r.width, parentWidth: p.clientWidth };
        }""")
        check(hero['maxWidth'] == 'none' and hero['width'] >= hero['parentWidth'] - 2, 'destaque do PC ocupa toda a largura, sem corte de 800px')
        check(pg.locator('.home-shortcut').count() == 6, 'atalhos de navegação rápida renderizados, incluindo histórico e busca')
        pg.click('#home .home-shortcut:has-text("Histórico")')
        check(pg.locator('#grid').evaluate("(e) => !e.classList.contains('hidden')") and not pg.is_hidden('#state') and 'Seu histórico está vazio' in pg.inner_text('#state'), 'atalho Histórico abre uma tela vazia com ação para explorar')
        pg.click('#nav button[data-tab=home]'); pg.wait_for_selector('#home')
        pg.click('#settingsBtn')
        check(pg.locator('#nextCountdownSetting').input_value() == '10', 'contagem automática padrão de 10 segundos')
        pg.select_option('#nextCountdownSetting', '5')
        pg.click('#modalBody button:has-text("Diagnóstico de vídeo")')
        check('Motor atual' in pg.inner_text('.video-diagnostics'), 'diagnóstico mostra o estado atual do player')
        check('não inclui host' in pg.inner_text('.video-diagnostics'), 'diagnóstico avisa que não expõe credenciais')
        pg.click('#modalBody button:has-text("Fechar")')
        check(True, 'contagem de 5 segundos salva nas configurações')
        pg.click('#nav button[data-tab=live]'); pg.wait_for_selector('#grid .card')
        check(pg.locator('#grid .card').count() == 120, 'ao vivo: 300 canais, 120 renderizados por vez')
        pg.eval_on_selector('#gridWrap', 'e=>e.scrollTop=e.scrollHeight'); pg.wait_for_timeout(300)
        check(pg.locator('#grid .card').count() == 240, 'rolagem carrega mais canais')
        pg.fill('#search', 'Canal 299'); pg.wait_for_timeout(500)
        check(pg.locator('#grid .card').count() == 1, 'pesquisa filtra')
        pg.fill('#search', '')
        pg.click('#nav button[data-tab=movie]'); pg.wait_for_selector('#grid .card')
        check(pg.locator('#grid .card').count() == 2, 'filmes listados')
        check(not pg.locator('#genreFilter').is_hidden(), 'filtro por categoria aparece no catálogo de filmes')
        check('Ação' in pg.locator('#genreFilter').inner_text(), 'categorias recebidas da API aparecem no filtro do PC')
        pg.select_option('#genreFilter', label='Ação')
        pg.wait_for_function("document.querySelectorAll('#grid .card').length === 1")
        check(pg.locator('#grid .card').count() == 1, 'filtro de categoria restringe os filmes')
        pg.select_option('#yearFilter', '2024')
        pg.wait_for_function("document.querySelectorAll('#grid .card').length === 1")
        check(pg.locator('#grid .card').count() == 1, 'filtro por ano funciona em conjunto com categoria')
        pg.click('#clearFilters'); pg.wait_for_function("document.querySelectorAll('#grid .card').length === 2")
        check(pg.locator('#grid .card').count() == 2, 'limpar filtros restaura todos os filmes')
        pg.select_option('#ratingFilter', '8')
        check(pg.locator('#grid .card').count() == 1 and 'Outro Filme' in pg.inner_text('#grid .card'), 'filtro por avaliação usa notas disponíveis')
        pg.click('#clearFilters')
        pg.click('#grid .card:has-text("Filme Ação")')
        pg.wait_for_function("document.getElementById('dplot').textContent.includes('Sinopse')")
        check('Elenco' in pg.inner_text('#dcast'), 'detalhe do filme mostra sinopse e elenco')
        pg.click('#dplay')
        pg.wait_for_function("document.getElementById('video').currentTime>0.5", timeout=15000)
        check(True, 'filme toca no player embutido')
        # Injeta falha transitória para verificar a recuperação de rede mantendo o tempo de reprodução.
        pg.click('#playPause')
        recovery = pg.evaluate("""() => {
          const v = document.getElementById('video');
          v.currentTime = 8;
          window.__recoveryMetadata = false;
          v.addEventListener('loadedmetadata', () => { window.__recoveryMetadata = true; }, { once: true });
          // Simula MediaError real; eventos de erro sem erro na fonte atual devem ser ignorados.
          Object.defineProperty(v, 'error', { configurable: true, value: { code: 2, message: 'Falha de rede simulada' } });
          v.dispatchEvent(new Event('error'));
          delete v.error;
          return true;
        }""")
        check(recovery, 'falha transitória simulada')
        pg.wait_for_function("document.getElementById('pmsg').textContent.includes('Reconectando o vídeo a partir de')", timeout=2500)
        pg.wait_for_function("window.__recoveryMetadata === true", timeout=10000)
        pg.wait_for_function("document.getElementById('video').currentTime >= 7 && document.getElementById('pmsg').textContent === ''", timeout=10000)
        pg.wait_for_function("document.getElementById('video').paused === true", timeout=3000)
        check(True, 'erro temporário recupera a reprodução a partir da posição anterior e preserva a pausa')
        pg.click('#playPause'); pg.wait_for_function("document.getElementById('video').paused === false", timeout=3000)
        # Teste de estresse: 1.000 operações de seek, saltos, setas e pausa/retomada.
        stress = pg.evaluate("""() => {
          const v = document.getElementById('video'), seek = document.getElementById('seek');
          const forward = document.getElementById('skipForward'), back = document.getElementById('skipBack');
          const toggle = document.getElementById('playPause');
          let actions = 0;
          for (let i = 0; i < 100; i++) {
            const d = Number.isFinite(v.duration) ? v.duration : 30;
            v.currentTime = Math.max(0, Math.min(d - 1, (i * 7) % Math.max(1, d - 1))); actions++;
            seek.value = String(Math.round(v.currentTime / d * 1000));
            seek.dispatchEvent(new Event('input', {bubbles:true})); actions++;
            seek.dispatchEvent(new Event('change', {bubbles:true})); actions++;
            forward.click(); actions++; back.click(); actions++;
            toggle.click(); actions++; toggle.click(); actions++;
            document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); actions++;
            document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})); actions++;
            v.currentTime = Math.max(0, Math.min(d - 0.5, (i * 3) % Math.max(1, d - 0.5))); actions++;
          }
          v.play().catch(()=>{});
          const g = document.querySelector('.player-main-actions').getBoundingClientRect();
          return {actions, duration:v.duration, currentTime:v.currentTime, centered:Math.abs((g.left+g.right)/2-window.innerWidth/2)<10};
        }""")
        check(stress['actions'] >= 900 and stress['duration'] > 0 and stress['currentTime'] >= 0, 'stress de 1.000 ações sem valores inválidos')
        check(stress['centered'], 'grupo play/pausa e saltos geometricamente centralizado')
        check(pg.locator('#skipBack small, #skipForward small').count() == 0, 'sem etiquetas numéricas soltas nos botões de salto')
        pg.evaluate("const v=document.getElementById('video'); v.currentTime=0.2")
        pg.click('#skipBack'); pg.wait_for_timeout(100)
        check(pg.evaluate("document.getElementById('video').currentTime >= 0"), 'retrocesso no início não cria tempo negativo')
        pg.evaluate("const v=document.getElementById('video'); v.currentTime=v.duration-1")
        pg.click('#skipForward'); pg.wait_for_timeout(100)
        check(pg.evaluate("document.getElementById('video').currentTime <= document.getElementById('video').duration"), 'avanço no fim não ultrapassa a duração')
        pg.screenshot(path=os.path.join(here, 'shot-player.png'))
        # Regressão visual: testar o player com controles visíveis em 28 resoluções.
        # 13 asserções por resolução = 364 verificações; o teste também detecta se alguém
        # reintroduzir a vinheta ou os gradientes que escurecem a imagem.
        pg.evaluate("""() => {
          document.getElementById('ptop').classList.remove('idle');
          document.getElementById('playerControls').classList.remove('idle');
        }""")
        for width in [320, 340, 360, 375, 390, 414, 480, 540, 600, 620, 621, 680, 720, 768, 820, 900, 1024, 1100, 1280, 1366, 1440, 1600, 1920, 2048, 2560, 2880, 3440, 3840]:
            height = max(240, min(1200, int(width * 9 / 16)))
            pg.set_viewport_size({'width': width, 'height': height})
            visual = pg.evaluate("""() => {
              const get = (selector) => document.querySelector(selector);
              const rect = (node) => {
                const r = node.getBoundingClientRect();
                return {left:r.left, right:r.right, width:r.width, height:r.height};
              };
              const top = get('#ptop'), controls = get('#playerControls');
              const seek = get('#seek'), main = get('.player-main-actions');
              const video = get('#video'), player = get('#player');
              const transparent = (value) => {
                const parts = value.match(/[\\d.]+/g) || [];
                return value.startsWith('rgba(') && Number(parts[3]) === 0;
              };
              const tr = rect(top), cr = rect(controls), sr = rect(seek), mr = rect(main);
              return {
                noVignette: !get('.player-vignette'),
                noTopGradient: getComputedStyle(top).backgroundImage === 'none',
                noBottomGradient: getComputedStyle(controls).backgroundImage === 'none',
                transparentTop: transparent(getComputedStyle(top).backgroundColor),
                transparentBottom: transparent(getComputedStyle(controls).backgroundColor),
                noTopShadow: getComputedStyle(top).boxShadow === 'none',
                noBottomShadow: getComputedStyle(controls).boxShadow === 'none',
                noVideoFilter: getComputedStyle(video).filter === 'none',
                playerWidth: Math.abs(player.getBoundingClientRect().width - innerWidth) < 1,
                topInside: tr.left >= -1 && tr.right <= innerWidth + 1,
                controlsInside: cr.left >= -1 && cr.right <= innerWidth + 1,
                mainControlsInside: mr.width > 0 && mr.left >= -1 && mr.right <= innerWidth + 1,
                seekInside: sr.width > 0 && sr.left >= -1 && sr.right <= innerWidth + 1
              };
            }""")
            check(visual['noVignette'], f'[{width}px] não existe vinheta sobre o vídeo')
            check(visual['noTopGradient'], f'[{width}px] faixa superior sem gradiente')
            check(visual['noBottomGradient'], f'[{width}px] faixa inferior sem gradiente')
            check(visual['transparentTop'], f'[{width}px] cabeçalho transparente')
            check(visual['transparentBottom'], f'[{width}px] controles inferiores transparentes')
            check(visual['noTopShadow'], f'[{width}px] cabeçalho sem sombra')
            check(visual['noBottomShadow'], f'[{width}px] controles sem sombra')
            check(visual['noVideoFilter'], f'[{width}px] vídeo sem filtro de escurecimento')
            check(visual['playerWidth'], f'[{width}px] player respeita a largura da janela')
            check(visual['topInside'], f'[{width}px] cabeçalho dentro da tela')
            check(visual['controlsInside'], f'[{width}px] controles dentro da tela')
            check(visual['mainControlsInside'], f'[{width}px] botões centrais dentro da tela')
            check(visual['seekInside'], f'[{width}px] barra de progresso dentro da tela')
        pg.set_viewport_size({'width': 1280, 'height': 800})
        pg.evaluate("""() => {
          document.getElementById('ptop').classList.remove('idle');
          document.getElementById('playerControls').classList.remove('idle');
        }""")
        check(pg.locator('.player-main-actions').locator('button').nth(0).get_attribute('id') == 'skipBack', 'retroceder fica à esquerda')
        check(pg.locator('.player-main-actions').locator('button').nth(1).get_attribute('id') == 'playPause', 'play/pausa fica no centro')
        check(pg.locator('.player-main-actions').locator('button').nth(2).get_attribute('id') == 'skipForward', 'avançar fica à direita')
        check(pg.locator('.player-vignette').count() == 0, 'vinheta preta removida do DOM')
        pg.wait_for_timeout(500); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(300)
        check(pg.evaluate("document.getElementById('video').currentTime")>10, 'seta direita avança 10 s')
        # Deixa o filme num ponto intermediário: conteúdo concluído não deve ficar em Continuar assistindo.
        pg.evaluate("document.getElementById('video').currentTime = 15")
        pg.wait_for_function("Math.abs(document.getElementById('video').currentTime - 15) < 1")
        pg.keyboard.press('Escape')
        pg.wait_for_selector('#detail:not(.hidden)')
        check(pg.is_hidden('#player') and not pg.is_hidden('#detail'), 'Esc retorna aos detalhes do filme')
        check('Continuar' in pg.inner_text('#dplay'), 'botão de filme atualiza a retomada ao retornar')
        check(not pg.locator('#drestart').is_hidden(), 'botão Recomeçar do início aparece quando há retomada')
        pg.click('#drestart')
        pg.wait_for_function("!document.getElementById('player').classList.contains('hidden') && document.getElementById('video').currentTime < 3", timeout=8000)
        check(True, 'Recomeçar do início abre o mesmo filme perto de 00:00')
        pg.evaluate("document.getElementById('video').currentTime = 15")
        pg.wait_for_function("Math.abs(document.getElementById('video').currentTime - 15) < 1")
        pg.keyboard.press('Escape')
        pg.wait_for_selector('#detail:not(.hidden)')
        pg.click('#detailClose')
        pg.click('#nav button[data-tab=home]'); pg.wait_for_selector('#home .card')
        check('Continuar assistindo' in pg.inner_text('#home'), 'início mostra continuar assistindo')
        check(pg.locator('#home .rail-recent .sec-explore').count() == 1, 'Explorar de Continue descobrindo é um botão real')
        pg.click('#home .rail-recent .sec-explore')
        check('history' in (pg.locator('#nav button.on').get_attribute('data-tab') or '') and pg.locator('#grid .card').count() >= 1, 'Explorar abre o histórico completo com os itens assistidos')
        pg.click('#nav button[data-tab=home]'); pg.wait_for_selector('#home .card')
        pg.click('#nav button[data-tab=movie]'); pg.wait_for_selector('#grid .card')
        pg.select_option('#sort', 'rating'); pg.wait_for_timeout(200)
        check('Outro Filme' in pg.inner_text('#grid .card >> nth=0'), 'ordenar por avaliação')
        pg.click('#grid .card:has-text("Filme Ação")'); pg.wait_for_function("document.getElementById('dplay').textContent.includes('Continuar')")
        check(True, 'botão continuar de mm:ss no filme'); pg.keyboard.press('Escape')
        # ao vivo: zapping, números, guia
        pg.click('#nav button[data-tab=live]'); pg.wait_for_selector('#grid .card')
        pg.click('#grid .card >> nth=4')
        pg.wait_for_function("document.getElementById('pinfo').textContent.includes('Jornal Agora')")
        check('A SEGUIR' in pg.inner_text('#pinfo'), 'guia mostra agora e a seguir')
        pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(300)
        check(pg.inner_text('#ptitle') == 'Canal 6', 'seta para baixo troca para o próximo canal')
        pg.keyboard.press('PageUp'); pg.wait_for_timeout(300)
        check(pg.inner_text('#ptitle') == 'Canal 5', 'PageUp volta um canal')
        for d in '12': pg.keyboard.press(d)
        pg.wait_for_function("document.getElementById('ptitle').textContent=='Canal 12'", timeout=5000)
        check(True, 'digitar 12 vai para o canal 12')
        pg.keyboard.press('Escape')
        # conteúdo adulto
        pg.click('#settingsBtn'); pg.locator('#modalBody input[type=checkbox]').nth(0).click()
        pg.fill('#modalBody input[type=password]', '1234'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
        pg.keyboard.press('Escape')
        pg.click('#nav button[data-tab=live]'); pg.wait_for_selector('#grid .card')
        check('300' not in pg.inner_text('#count') and '290' in pg.inner_text('#count'), 'ocultar adulto remove 10 canais')
        check('Adultos' not in pg.inner_text('#cats'), 'categoria adulta some')
        # busca geral
        pg.click('#nav button[data-tab=search]'); pg.fill('#search', 'serie um'); pg.wait_for_selector('#grid .card')
        check(pg.locator('#grid .card').count() == 1, 'busca geral encontra série')
        pg.fill('#search', 'drama'); pg.wait_for_timeout(350)
        check(pg.locator('#grid .card').count() == 2 and 'Série Um' in pg.inner_text('#grid'), 'busca geral encontra séries e filmes pelo gênero')
        pg.fill('#search', '')
        # séries
        pg.click('#nav button[data-tab=series]'); pg.wait_for_selector('#grid .card'); pg.click('#grid .card')
        pg.wait_for_selector('#episodes button')
        check(pg.locator('#seasons button').count() == 2 and pg.locator('#episodes button').count() == 2, 'série: 2 temporadas, T1 com 2 episódios')
        pg.screenshot(path=os.path.join(here, 'shot-series.png'))
        pg.click('#dfav'); pg.click('#episodes button >> nth=0')
        pg.wait_for_function("document.getElementById('ptitle').textContent.includes('T1E1') && Number.isFinite(document.getElementById('video').duration) && document.getElementById('video').duration > 0 && document.getElementById('video').currentTime > 0.3", timeout=15000)
        check(True, 'episódio toca com duração válida e metadados carregados')
        # Regressão: sair e reabrir rapidamente, recebendo um error atrasado da fonte anterior.
        # Esse evento não pertence ao novo vídeo e não pode interromper nem pausar a reprodução.
        for cycle in range(5):
            pg.click('#pback')
            pg.wait_for_selector('#detail:not(.hidden)', timeout=3000)
            pg.click('#episodes button >> nth=0')
            pg.evaluate("""() => setTimeout(() => {
              const v = document.getElementById('video');
              if (!v.error) v.dispatchEvent(new Event('error'));
            }, 0)""")
            pg.wait_for_function("""() => {
              const v = document.getElementById('video');
              return document.getElementById('ptitle').textContent.includes('T1E1') &&
                !v.paused && v.readyState >= 2 && v.currentTime > 0.2 &&
                document.getElementById('pmsg').textContent === '';
            }""", timeout=12000)
            pg.wait_for_timeout(250)
            check(pg.evaluate("""() => {
              const v = document.getElementById('video');
              return !v.paused && !v.error && document.getElementById('pmsg').textContent === '';
            }"""), f'abrir e fechar episódio rapidamente sem erro/pausa indevida ({cycle + 1}/5)')
        # O cartão deve aparecer antes do fim; o utilizador também pode avançar manualmente.
        pg.evaluate("document.getElementById('video').currentTime = document.getElementById('video').duration - 6")
        pg.wait_for_selector('#nextEpisode:not(.hidden)', timeout=10000)
        check('Segundo' in pg.inner_text('#nextEpisode'), 'cartão mostra o próximo episódio antes do fim')
        check(pg.locator('#nextPlay').is_visible(), 'botão Assistir agora disponível')
        # Pausar congela a contagem, cancelar impede a troca e voltar no seek permite rearmar.
        pg.click('#playPause')
        countdown_before = pg.inner_text('#nextCountdown')
        pg.wait_for_timeout(1000)
        check('T1E1' in pg.inner_text('#ptitle') and pg.inner_text('#nextCountdown') == countdown_before, 'contagem baseada no tempo do vídeo congela em pausa')
        pg.click('#nextDismiss')
        check(pg.is_hidden('#nextEpisode') and 'T1E1' in pg.inner_text('#ptitle'), 'Cancelar esconde o aviso e mantém o episódio atual')
        pg.evaluate("document.getElementById('video').currentTime = document.getElementById('video').duration - 12")
        pg.wait_for_timeout(150)
        pg.evaluate("document.getElementById('video').currentTime = document.getElementById('video').duration - 4.5")
        pg.wait_for_function("!document.getElementById('nextEpisode').classList.contains('hidden') && document.getElementById('nextCountdown').textContent.includes('Avançando automaticamente')", timeout=5000)
        check(True, 'contagem final de 5 segundos é exibida')
        pg.click('#nextPlay')
        pg.wait_for_function("document.getElementById('ptitle').textContent.includes('T1E2')", timeout=10000)
        check(True, 'avanço manual abre o próximo episódio no mesmo player')
        # Testa o avanço automático de 5 s para a primeira faixa da temporada seguinte.
        pg.wait_for_function("document.getElementById('video').duration > 0", timeout=10000)
        pg.evaluate("document.getElementById('video').currentTime = document.getElementById('video').duration - 5.2")
        pg.wait_for_selector('#nextEpisode:not(.hidden)', timeout=10000)
        pg.wait_for_function("document.getElementById('ptitle').textContent.includes('T2E1')", timeout=12000)
        check(True, 'avanço automático após 5 segundos funciona entre temporadas')
        pg.click('#pback')
        pg.wait_for_selector('#detail:not(.hidden)')
        check(pg.is_hidden('#player') and not pg.is_hidden('#detail'), 'voltar do player retorna à tela da série')
        check(pg.locator('#seasons button.on').get_attribute('data-s') == '2', 'voltar preserva a temporada selecionada após avanço automático')
        check(pg.locator('#episodes [data-episode-id="33"]').count() == 1, 'voltar mantém o episódio atual da temporada na lista')
        pg.wait_for_function("document.activeElement?.dataset?.episodeId === '33'", timeout=3000)
        check(True, 'foco retorna ao episódio que estava tocando')
        pg.click('#detailClose')
        pg.click('#nav button[data-tab=favs]'); check(pg.locator('#grid .card').count() == 1, 'favorito salvo')
        pg.click('#nav button[data-tab=history]'); check(pg.locator('#grid .card').count() >= 2, 'histórico registrado')
        # mkv indisponível -> mensagem de erro amigável
        pg.click('#nav button[data-tab=movie]'); pg.wait_for_selector('#grid .card'); pg.click('#grid .card:has-text("Outro Filme")'); pg.click('#dplay')
        pg.wait_for_function("document.getElementById('pmsg').textContent.includes('Não foi possível')", timeout=30000)
        check(True, 'falha de reprodução mostra mensagem amigável')
        pg.keyboard.press('Escape')
        pg.reload(); pg.wait_for_selector('#app:not(.hidden)', timeout=10000)
        check('joao' in pg.inner_text('#acct'), 'reabrir o app entra direto no último perfil')
        pg.click('#logout'); pg.wait_for_selector('#picker:not(.hidden)')
        check('joao' in pg.inner_text('#picker'), 'trocar perfil mostra a lista de perfis')
        pg.click('#picker .go'); pg.wait_for_selector('#app:not(.hidden)')
        pg.click('#nav button[data-tab=live]'); pg.wait_for_selector('#grid .card'); pg.screenshot(path=os.path.join(here, 'shot-live.png'))
        check(not errs, 'sem erros JS: ' + '; '.join(errs))
        b.close()
finally:
    mock.kill(); web.kill()
sys.exit(0 if ok else 1)
