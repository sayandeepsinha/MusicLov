#!/bin/bash

# Download yt-dlp binary for the current platform
# This script is run during CI/CD builds or for local development setup

set -e

BINARIES_DIR="$(dirname "$0")/../binaries"
mkdir -p "$BINARIES_DIR"

# Get the latest release URL from yt-dlp GitHub
YT_DLP_BASE_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download"

echo "Detecting platform..."

case "$(uname -s)" in
    Darwin)
        BINARY_NAME="yt-dlp_macos"
        OUTPUT_NAME="yt-dlp"
        echo "Platform: macOS"
        ;;
    Linux)
        BINARY_NAME="yt-dlp_linux"
        OUTPUT_NAME="yt-dlp"
        echo "Platform: Linux"
        ;;
    MINGW*|MSYS*|CYGWIN*|Windows_NT)
        BINARY_NAME="yt-dlp.exe"
        OUTPUT_NAME="yt-dlp.exe"
        echo "Platform: Windows"
        ;;
    *)
        echo "Unsupported platform: $(uname -s)"
        exit 1
        ;;
esac

DOWNLOAD_URL="${YT_DLP_BASE_URL}/${BINARY_NAME}"
OUTPUT_PATH="${BINARIES_DIR}/${OUTPUT_NAME}"

echo "Downloading yt-dlp from: $DOWNLOAD_URL"
echo "Saving to: $OUTPUT_PATH"

# Download using curl
if command -v curl &> /dev/null; then
    curl -L -o "$OUTPUT_PATH" "$DOWNLOAD_URL"
elif command -v wget &> /dev/null; then
    wget -O "$OUTPUT_PATH" "$DOWNLOAD_URL"
else
    echo "Error: Neither curl nor wget found"
    exit 1
fi

# Make executable (not needed on Windows, but doesn't hurt)
chmod +x "$OUTPUT_PATH"

echo "✅ yt-dlp downloaded successfully!"
echo "Binary location: $OUTPUT_PATH"

# Verify the binary works
echo "Verifying installation..."
"$OUTPUT_PATH" --version
