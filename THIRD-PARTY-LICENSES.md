# Componentes de terceiros — Vela Player 1.1.0

## electron-mpv-video

- Versão: 0.1.1.
- Licença do código de integração: MIT.
- Código e avisos: https://github.com/yscoder/electron-mpv-video
- O projeto fornece a ponte entre Electron e libmpv; o runtime libmpv é um componente separado.

## libmpv / mpv

- Runtime previsto para o instalador Windows: mpv-dev-lgpl-x86_64-20261025-git-baa3e11d42.7z.
- Origem do binário, versão e hash SHA-256 estão fixados no workflow de build.
- Build comunitário identificado como LGPL: https://github.com/zhongfly/mpv-winbuild/releases/tag/2026-10-25-baa3e11d42
- Código-fonte do mpv: https://github.com/mpv-player/mpv
- Licença e condições gerais: https://github.com/mpv-player/mpv/blob/master/Copyright
- A etiqueta LGPL do pacote não substitui uma revisão das licenças de todas as bibliotecas vinculadas. Consulte os avisos e fontes publicados pelo mantenedor do build usado.

## FFmpeg

A variante de libmpv escolhida é anunciada pelo mantenedor como um build LGPL. O conjunto de formatos e a disponibilidade real de codecs dependem das opções compiladas nesse runtime.

- Código-fonte: https://ffmpeg.org/
- Licenças e configuração de compilação: https://ffmpeg.org/legal.html

## Nota de distribuição

O instalador inclui DLLs do runtime libmpv junto do addon nativo. Ao redistribuir o instalador, mantenha este arquivo e os avisos de terceiros aplicáveis. A disponibilidade de um codec também pode depender do conteúdo de origem, da rede, de autenticação e do suporte da compilação utilizada.
