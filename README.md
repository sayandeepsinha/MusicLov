# MusicLov 🎵

A beautiful, ad-free music streaming desktop app built with Electron and React.

![MusicLov](https://img.shields.io/badge/version-1.8.5-purple)
![macOS](https://img.shields.io/badge/macOS-supported-red)
![Linux](https://img.shields.io/badge/Linux-supported-green)
![Windows](https://img.shields.io/badge/Windows-supported-blue)

## Features

- 🎶 **Stream music** from YouTube Music (Native Engine)
- 🔍 **Search** for songs and artists
- 📚 **Browse** trending categories (Hindi, English, Global, etc.)
- 💾 **Offline playback** - Download songs for offline listening
- 🎨 **Beautiful UI** with dark mode and smooth animations
- �️ **High-Res Thumbnails** - Sharp artwork for every track
- �🚫 **No ads** - Built-in native ad-blocking

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Desktop**: Electron
- **Audio Engine**: Native Chromium-based playback (Zero external dependencies)
- **API**: YouTube Music InnerTube API

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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run electron:dev` | Start Electron with hot reload |
| `npm run package` | Package as macOS app |

## License

MIT License - See [LICENSE](LICENSE) for details.

---

Made with ❤️ by Sayandeep Sinha
