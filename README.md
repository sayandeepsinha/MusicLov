# MusicLov 🎵

A beautiful, ad-free music streaming desktop app built with Electron and React.

![MusicLov](https://img.shields.io/badge/version-1.0.0-purple)
![Platform](https://img.shields.io/badge/platform-macOS-blue)

## Features

- 🎶 **Stream music** from YouTube Music
- 🔍 **Search** for songs and artists
- 📚 **Browse** trending categories (Hindi, English, Global, etc.)
- 💾 **Offline playback** - Download songs for offline listening
- 🎨 **Beautiful UI** with dark mode and smooth animations
- 🚫 **No ads** - Pure music experience

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Desktop**: Electron
- **Audio**: yt-dlp for audio extraction
- **API**: YouTube Music InnerTube API

## Prerequisites

Before running, you need to download the yt-dlp binary:

1. Download yt-dlp for your platform from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
2. Place the binary in the `binaries/` folder
3. Make it executable: `chmod +x binaries/yt-dlp`

## Installation

```bash
# Clone the repository
git clone https://github.com/sayandeepsinha/MusicLov.git
cd MusicLov

# Install dependencies
npm install

# Run in development
npm run electron:dev

# Build for production
npm run package
```

## Project Structure

```
musicLov/
├── electron/              # Electron main process
│   ├── main.js           # Entry point
│   ├── preload.js        # Preload script
│   └── services/         # Backend services
│       ├── innertube.js  # YouTube Music API
│       ├── proxy.js      # Audio proxy server
│       └── ytdlp.js      # yt-dlp integration
├── src/                  # React frontend
│   ├── App.jsx           # Main app component
│   ├── components/       # UI components
│   ├── constants/        # App constants
│   └── context/          # React context
├── public/               # Static assets
└── binaries/             # yt-dlp binary (not in git)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run electron:dev` | Start Electron with hot reload |
| `npm run build` | Build for production |
| `npm run package` | Package as macOS app |

## License

MIT License - See [LICENSE](LICENSE) for details.

---

Made with ❤️ by Sayandeep Sinha
