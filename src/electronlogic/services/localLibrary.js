/**
 * Local Library Service
 * Handles scanning and importing local music files from the file system
 * Uses platform-specific paths from the platforms module
 */

const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');

const { parseFile } = require('music-metadata');

// Import from common and platforms
const { AUDIO_EXTENSIONS, IGNORED_DIRS } = require('../common');
const platform = require('../platform');

/**
 * Check if a file is an audio file based on extension
 */
function isAudioFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Extract metadata using music-metadata library
 */
async function parseFileMetadata(filePath) {
    try {
        const metadata = await parseFile(filePath);
        const { common, format } = metadata;

        // Get valid thumbnail if available
        let thumbnail = null;
        if (common.picture && common.picture.length > 0) {
            const pic = common.picture[0];
            // Convert buffer to base64 for frontend display
            thumbnail = {
                url: `data:${pic.format};base64,${pic.data.toString('base64')}`
            };
        }

        return {
            title: common.title || path.basename(filePath, path.extname(filePath)),
            artist: common.artist || 'Unknown Artist',
            album: common.album,
            duration: format.duration,
            thumbnail,
            filePath,
            fileName: path.basename(filePath),
            format: path.extname(filePath).toLowerCase().slice(1),
        };
    } catch (error) {
        console.warn(`[LocalLibrary] Failed to parse metadata for ${filePath}:`, error.message);
        // Fallback to filename
        return {
            title: path.basename(filePath, path.extname(filePath)),
            artist: 'Unknown Artist',
            filePath,
            fileName: path.basename(filePath),
            format: path.extname(filePath).toLowerCase().slice(1),
        };
    }
}


/**
 * Recursively scan a directory for audio files
 */
async function scanDirectory(dirPath, results = []) {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            // Skip hidden files and ignored items
            if (entry.name.startsWith('.')) continue;
            if (IGNORED_DIRS.includes(entry.name)) continue;

            if (entry.isDirectory()) {
                // Recursively scan subdirectories
                await scanDirectory(fullPath, results);
            } else if (entry.isFile() && isAudioFile(fullPath)) {
                // Use new metadata parser
                const metadata = await parseFileMetadata(fullPath);
                results.push({
                    id: `local_${Buffer.from(fullPath).toString('base64').slice(0, 32)}`,
                    isLocal: true,
                    ...metadata,
                });
            }
        }
    } catch (error) {
        console.error(`[LocalLibrary] Error scanning ${dirPath}:`, error.message);
    }

    return results;
}

/**
 * Scan the default Music folder and any subfolders containing music
 */
async function scanDefaultMusicFolder() {
    const musicPath = platform.getDefaultMusicPath();
    console.log('[LocalLibrary] Scanning default music folder:', musicPath);

    if (!existsSync(musicPath)) {
        console.log('[LocalLibrary] Default music folder does not exist');
        return { songs: [], folders: [] };
    }

    const songs = await scanDirectory(musicPath);

    // Get unique folder names containing music
    const folders = [...new Set(songs.map(s => path.dirname(s.filePath)))];

    console.log(`[LocalLibrary] Found ${songs.length} songs in ${folders.length} folders`);

    return {
        songs,
        folders,
        basePath: musicPath,
    };
}

/**
 * Open folder picker dialog for manual import
 */
async function selectMusicFolder() {
    const result = await dialog.showOpenDialog({
        title: 'Select Music Folder',
        properties: ['openDirectory', 'multiSelections'],
        buttonLabel: 'Import Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    return result.filePaths;
}

/**
 * Scan user-selected folders for music files
 */
async function importFromFolders(folderPaths) {
    console.log('[LocalLibrary] Importing from folders:', folderPaths);

    const allSongs = [];
    const allFolders = [];

    for (const folderPath of folderPaths) {
        if (existsSync(folderPath)) {
            const songs = await scanDirectory(folderPath);
            allSongs.push(...songs);

            const folders = [...new Set(songs.map(s => path.dirname(s.filePath)))];
            allFolders.push(...folders);
        }
    }

    console.log(`[LocalLibrary] Imported ${allSongs.length} songs from selected folders`);

    return {
        songs: allSongs,
        folders: [...new Set(allFolders)],
    };
}

/**
 * Get file URL for playing local audio
 */
function getLocalFileUrl(filePath) {
    if (existsSync(filePath)) {
        // Return media:// URL for local playback via custom protocol
        // This bypasses security restrictions for file:// URLs in renderer
        return `media://${filePath}`;
    }
    return null;
}

/**
 * Get platform information
 */
function getPlatformInfo() {
    return {
        platform: process.platform,
        defaultMusicPath: platform.getDefaultMusicPath(),
        supportedFormats: AUDIO_EXTENSIONS,
    };
}

module.exports = {
    scanDefaultMusicFolder,
    selectMusicFolder,
    importFromFolders,
    getLocalFileUrl,
    getPlatformInfo,
};
