# Publicar o site do Vela Player (sem custo)

O site estático fica em `site/index.html`. Ele não precisa de servidor próprio nem do computador ligado. Os botões consultam os GitHub Releases públicos do repositório `Diegum19/VALE-PLAYER` e, quando encontram um arquivo `.exe`, `.msi` ou `.apk`, apontam diretamente para ele.

## Publicar no Cloudflare Pages

1. Entre ou crie uma conta gratuita em https://dash.cloudflare.com/.
2. Abra **Workers & Pages** e escolha **Create** / **Create application**.
3. Escolha **Pages** e depois **Connect to Git** (o nome pode variar um pouco no painel).
4. Autorize a conexão com GitHub e selecione o repositório **Diegum19/VALE-PLAYER**.
5. Configure o projeto assim:
   - **Project name:** `vela-player` (ou outro nome disponível).
   - **Production branch:** `main`.
   - **Framework preset:** `None` / `No framework`.
   - **Build command:** deixe vazio, pois o site é HTML estático.
   - **Build output directory:** `site`.
   - **Root directory:** deixe vazio.
6. Clique em **Save and Deploy**. Ao terminar, o Cloudflare mostrará um endereço gratuito terminado em `.pages.dev`.
7. A cada atualização de `site/index.html` na branch `main`, o Cloudflare publica uma nova versão do site automaticamente.

## Como os downloads aparecem

- Publique a versão do Windows em **GitHub → Releases**, anexando o instalador `.exe` (ou `.msi`) como arquivo da versão.
- Quando o APK Android estiver pronto, anexe o arquivo `.apk` a uma versão publicada em Releases.
- A página procura arquivos entre as versões publicadas e mostra um link direto ao arquivo que encontrar. Se ainda não houver um arquivo de uma plataforma, ela mostra um link para consultar todas as versões em vez de inventar um download.
- O nome do arquivo pode variar; a página procura pela extensão. Para versões Android de teste, marque o release como *pre-release* no GitHub.

## Observações

- Não é necessário contratar domínio próprio. O endereço gratuito `.pages.dev` funciona para compartilhar o site.
- Os downloads continuam hospedados pelo GitHub Releases; o Cloudflare hospeda somente a página.
- Este site não contém nem oferece o conteúdo reproduzido pelo aplicativo. O acesso aos canais, filmes e séries depende do serviço e das credenciais do usuário.
- O site é público porque precisa ser acessível aos visitantes. Não coloque senhas, tokens ou dados pessoais em seus arquivos.
