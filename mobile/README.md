# Vela Player Android — APK de teste

Este módulo fica separado da versão Windows; não modifica o Electron, o EXE nem o fluxo de build do PC.

## Build
- Android 6.0 (API 23) ou superior.
- JDK 17, Gradle 8.13 e Android SDK Platform 36.
- Executar gradle :app:assembleDebug em mobile/android.
- APK: mobile/android/app/build/outputs/apk/debug/app-debug.apk.

## Recursos
- Login Xtream com host, usuário e senha; senha não é salva automaticamente.
- Catálogos de TV ao vivo, filmes e séries; categorias, busca, filtro por ano, pôsteres e favoritos locais.
- Temporadas/episódios e reprodução nativa AndroidX Media3/ExoPlayer.
- Retomada local da reprodução e opção de recomeçar do início.
- Interface adaptada para celular; o player abre em paisagem.
- Conexão direta ao servidor informado, sem servidor intermediário do Vela Player.

## Limites
- Build debug instalável para teste lateral, não é pacote release assinado para Play Store.
- Compatibilidade depende do servidor e dos codecs/decodificadores do aparelho.
- Ainda não sincroniza favoritos/retomada entre PC e Android.
- HTTP está habilitado por compatibilidade com servidores antigos; prefira HTTPS.
