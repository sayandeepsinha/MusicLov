/**
 * Local Library Service
 */
const { dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const { parseFile } = require('music-metadata');
const { AUDIO_EXTENSIONS, IGNORED_DIRS, getDefaultMusicPath } = require('../config');

const isAudioFile = (filePath) => AUDIO_EXTENSIONS.includes(path.extname(filePath).toLowerCase());

async function parseFileMetadata(filePath) {
    const defaultMeta = {
        title: path.basename(filePath, path.extname(filePath)),
        artist: 'Unknown Artist',
        filePath,
        fileName: path.basename(filePath),
        format: path.extname(filePath).toLowerCase().slice(1),
    };

    try {
        const { common, format } = await parseFile(filePath);
        return {
            ...defaultMeta,
            title: common.title || defaultMeta.title,
            artist: common.artist || defaultMeta.artist,
            album: common.album,
            duration: format.duration,
            thumbnail: common.picture?.[0] ? { url: `data:${common.picture[0].format};base64,${common.picture[0].data.toString('base64')}` } : null
        };
    } catch {
        return defaultMeta;
    }
}

async function scanDirectory(dirPath, results = []) {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.') || IGNORED_DIRS.includes(entry.name)) continue;
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                await scanDirectory(fullPath, results);
            } else if (entry.isFile() && isAudioFile(fullPath)) {
                results.push({
                    id: `local_${Buffer.from(fullPath).toString('base64')}`,
                    isLocal: true,
                    ...(await parseFileMetadata(fullPath)),
                });
            }
        }
    } catch (e) { console.error(`[LocalLibrary] Error scanning ${dirPath}:`, e.message); }
    return results;
}

async function scanDefaultMusicFolder() {
    const musicPath = getDefaultMusicPath();
    if (!existsSync(musicPath)) return { songs: [], folders: [] };

    const songs = await scanDirectory(musicPath);
    console.log(`[LocalLibrary] Found ${songs.length} songs`);
    return {
        songs,
        folders: [...new Set(songs.map(s => path.dirname(s.filePath)))],
        basePath: musicPath,
    };
}

async function selectMusicFolder() {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select Music Folder',
        properties: ['openDirectory', 'multiSelections'],
        buttonLabel: 'Import Folder',
    });
    return canceled || filePaths.length === 0 ? null : filePaths;
}

async function importFromFolders(folderPaths) {
    const allSongs = [];
    for (const folder of folderPaths) {
        if (existsSync(folder)) allSongs.push(...(await scanDirectory(folder)));
    }
    return {
        songs: allSongs,
        folders: [...new Set(allSongs.map(s => path.dirname(s.filePath)))],
    };
}

const getLocalFileUrl = (filePath) => existsSync(filePath) ? `media://${filePath}` : null;

module.exports = {
    scanDefaultMusicFolder, selectMusicFolder, importFromFolders, getLocalFileUrl,
    getPlatformInfo: () => ({ platform: process.platform, defaultMusicPath: getDefaultMusicPath(), supportedFormats: AUDIO_EXTENSIONS })
};
