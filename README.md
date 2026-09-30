# 🎵 AppMusic

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.78+-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Android-Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin Android" />
  <img src="https://img.shields.io/badge/Status-Ativo-success?style=for-the-badge" alt="Status" />
</p>

> Aplicativo móvel para reprodução de músicas locais e motor embutido de extração e download de áudios em alta fidelidade diretamente do YouTube.

---

## ✨ Recursos Principais

- 📥 **Motor de Download Embutido:** Cole o link de qualquer vídeo do YouTube e baixe o áudio em MP3 diretamente para a sua prateleira offline, sem redirecionamentos e com acompanhamento do progresso em tempo real.
- 🌐 **Navegador YouTube Integrado:** Navegue pelo YouTube diretamente no app com detecção automática de músicas, captura inteligente de faixas de áudio e opção de baixar para a prateleira ou direto para uma playlist.
- 🎧 **Player Nativo Completo:** Reprodução em segundo plano com suporte a fila, modo aleatório (*shuffle*), repetição (*repeat one / repeat all*), mini-player dinâmico e visualização em tela cheia com capa do álbum.
- ⏱️ **Duração Real Automática:** Extração precisa dos minutos e segundos de cada faixa baixada através da API nativa `MediaMetadataRetriever` do Android.
- 📁 **Organização e Playlists:** Crie, edite e organize playlists personalizadas com persistência local rápida.
- 🎨 **Interface Premium:** Design elegante em tema *dark mode*, micro-animações suaves e tipografia moderna.

---

## 🛠️ Tecnologias

- **Frontend:** [React Native](https://reactnative.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Estilização e Ícones:** Vanilla StyleSheet, [Lucide React Native](https://lucide.dev/)
- **Camada Nativa Android:** Kotlin, `MediaPlayer`, `MediaMetadataRetriever`, `HttpURLConnection`
- **Navegação Webview:** [React Native WebView](https://github.com/react-native-webview/react-native-webview)
- **Armazenamento Local:** [@react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage)

---

## 📂 Estrutura do Projeto

```text
AppMusic/
├── android/               # Código nativo Android e módulos Kotlin customizados
│   └── app/src/main/java/com/appmusic/
│       ├── AudioPlayerModule.kt       # Controle de reprodução nativa
│       ├── AudioDownloaderModule.kt   # Motor de download e extração de duração
│       └── AppMusicPackage.kt         # Registro dos módulos nativos no RN
├── src/
│   ├── components/        # MiniPlayer, FullScreenPlayer e componentes de UI
│   ├── context/           # MusicContext (gerenciamento global de estado e downloads)
│   ├── screens/           # MainShelf, Downloads, Playlists, YouTubeBrowser
│   ├── services/          # audioEngine, storage e youtubeEngine
│   ├── theme/             # Paleta de cores, tipografia e espaçamentos
│   ├── types/             # Definições de tipos TypeScript
│   └── utils/             # Formatadores de tempo e tamanho de arquivo
└── App.tsx                # Ponto de entrada do aplicativo
```

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Android Studio](https://developer.android.com/studio) com SDK configurado (variáveis `ANDROID_HOME` no PATH)
- Dispositivo físico Android conectado via USB (com depuração USB ativada) ou Emulador ativo

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   cd SEU_REPOSITORIO
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor Metro:**
   ```bash
   npm start
   ```

4. **Compile e instale no dispositivo Android (em outro terminal):**
   ```bash
   npm run android
   ```

---

## 📄 Licença

Este projeto é disponibilizado sob a licença [MIT](LICENSE).
