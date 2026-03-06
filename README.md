# MusicLov 🎵

A beautiful, ad-free music streaming desktop app built with Electron and React.

![MusicLov](https://img.shields.io/badge/version-26.0.1-purple)
![macOS](https://img.shields.io/badge/macOS-supported-red)
![Linux](https://img.shields.io/badge/Linux-supported-green)
![Windows](https://img.shields.io/badge/Windows-supported-blue)

## Features

- **Stream music** from YouTube Music (Native Engine)
- **Search** for songs and artists
- **Browse** trending categories (Hindi, English, Global, etc.)
- **Offline playback** - Download songs for offline listening
- **Beautiful UI** with dark mode and smooth animations
- **High-Res Thumbnails** - Sharp artwork for every track
- **No ads** - Built-in native ad-blocking

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

## Troubleshooting Installation (Security Warnings)

Since this app is not signed with expensive Apple/Microsoft developer certificates, your OS will show a warning:

### macOS ("App is damaged" or "Unidentified Developer")
1. Drag the app to your **Applications** folder.
2. **Right-click** (or Control-click) the app icon and select **Open**.
3. A dialog will appear; click **Open** again. 
4. *Alternatively:* Run `sudo xattr -rd com.apple.quarantine /Applications/MusicLov.app` in your terminal.

### Windows ("Windows protected your PC")
1. Click **More info**.
2. Click **Run anyway**.

## License

MIT License - See [LICENSE](LICENSE) for details.

---

Made with ❤️ by Sayandeep Sinha
