# MusicLov 🎵

A beautiful, ad-free music streaming desktop app built with Electron and React.

![MusicLov](https://img.shields.io/badge/version-1.1.0-purple)
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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run electron:dev` | Start Electron with hot reload |
| `npm run package` | Package as macOS app |

## License

MIT License - See [LICENSE](LICENSE) for details.

---

Made with ❤️ by Sayandeep Sinha
