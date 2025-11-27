# MusicLov Web App

An ad-free music streaming web application built with Next.js.

## Features

- **Stateless Architecture**: No user accounts required.
- **Home Feed**: Curated charts (Top Hindi, English, Global).
- **Search**: Search for songs, artists, and albums.
- **Playback**: Reliable streaming with a persistent player.
- **Offline Mode**: Download songs to your browser's local storage (IndexedDB) for offline playback.
- **Responsive Design**: Glassmorphic UI with smooth animations.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Audio Source**: YouTube (via `youtubei.js` and `yt-dlp`)

## Getting Started

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Run the development server:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) in your browser.
