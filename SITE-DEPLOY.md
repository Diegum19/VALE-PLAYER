# Site de downloads do Vela Player (R$ 0)

A página estática fica em `site/index.html`. Ela não precisa de servidor próprio nem do PC ligado. Os botões consultam os GitHub Releases públicos do repositório `Diegum19/VALE-PLAYER` e, quando encontram um arquivo `.exe`, `.msi` ou `.apk`, apontam diretamente para ele.

## Deploy recomendado para este repositório: Cloudflare Workers Static Assets

O Worker `vale-player` já existe na conta Cloudflare. Para evitar criar um segundo projeto e confundir Workers com Pages, o arquivo `wrangler.jsonc` configura o deploy atual para publicar apenas o conteúdo da pasta `site/`. O endereço esperado continua sendo `https://vale-player.diegoood49.workers.dev`.

1. O arquivo de configuração na raiz é `wrangler.jsonc`, com `name: "vale-player"` e `assets.directory: "./site"`.
2. No Cloudflare, abra **Workers & Pages → vale-player → Deployments**.
3. Inicie uma nova implantação usando o commit mais recente da branch `main`. Se a integração de Git estiver ativa, a nova alteração pode iniciar o build automaticamente.
4. Confira os logs da nova implantação. Eles devem usar o `wrangler.jsonc` e enviar os arquivos da pasta `site/`, em vez de escolher `main.js` como entrada do aplicativo Electron.
5. Após a implantação terminar com sucesso, abra `https://vale-player.diegoood49.workers.dev`. A página inicial deve mostrar a página de downloads do Vela Player.
6. Se o Cloudflare continuar dizendo **Missing git connection**, conecte a origem GitHub nas configurações de build/deploy do Worker ou use a opção de deploy que seleciona a branch/commit mais recente. Não é necessário configurar um domínio personalizado.

Esta configuração é de assets estáticos: o Cloudflare serve HTML, CSS e outros arquivos da pasta `site/`. Não adicione um `main` que aponte para `main.js`, porque ele é a entrada do aplicativo Electron de Windows, não o site web.

## Alternativa: Cloudflare Pages

Se preferir criar um projeto Pages separado, conecte o repositório `Diegum19/VALE-PLAYER` via **Workers & Pages → Create application → Pages → Connect to Git**, use a branch `main`, preset `None`, comando de build vazio e diretório de saída `site`. O endereço ficará terminado em `.pages.dev`. Essa alternativa não é necessária se o Worker acima já estiver publicado corretamente.

## Como os downloads aparecem

- Publique a versão do Windows em **GitHub → Releases**, anexando o instalador `.exe` (ou `.msi`) como arquivo da versão.
- Quando o APK Android estiver pronto, anexe o arquivo `.apk` a uma versão publicada em Releases.
- A página procura arquivos entre as versões públicas e mostra um link direto ao arquivo que encontrar. Se ainda não houver arquivo para uma plataforma, ela mostra um link para consultar todas as versões.
- O nome do arquivo pode variar; a página procura pela extensão. Para versões Android de teste, marque o release como *pre-release* no GitHub.

## Observações

- Não é necessário comprar um domínio próprio.
- Os downloads ficam no GitHub Releases; o Cloudflare hospeda somente a página de download.
- O site não contém nem oferece os conteúdos reproduzidos pelo aplicativo. A disponibilidade dos canais, filmes e séries depende do serviço e das credenciais do usuário.
- Não coloque senhas, tokens ou dados pessoais nos arquivos públicos do repositório.
