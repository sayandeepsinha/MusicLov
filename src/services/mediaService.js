import { getAllLocalSongs, saveLocalSongs, clearLocalLibrary, getSetting, saveSetting, saveDownload, removeDownload, getAllDownloads } from '../common/db';

const mergeWithExisting = (existing, newSongs) => {
    const paths = new Set(existing.map(s => s.filePath));
    return newSongs.filter(s => !paths.has(s.filePath));
};

export async function scanDefaultMusicFolder() {
    if (!window.electronAPI) return { result: null, newSongs: [] };
    // Fetch current library directly from DB to avoid stale state issues
    const currentLibrary = await getAllLocalSongs().catch(() => []);

    const result = await window.electronAPI.scanDefaultMusicFolder();
    if (result?.songs?.length) {
        const newSongs = mergeWithExisting(currentLibrary, result.songs);
        if (newSongs.length) await saveLocalSongs(newSongs);
        return { result, newSongs };
    }
    return { result, newSongs: [] };
}

export async function importMusicFolder(importedFolders = []) {
    if (!window.electronAPI) return null;
    const folderPaths = await window.electronAPI.selectMusicFolder();
    if (!folderPaths?.length) return null;
    // Fetch current library directly from DB to avoid stale state issues
    const currentLibrary = await getAllLocalSongs().catch(() => []);

    const result = await window.electronAPI.importMusicFolders(folderPaths);
    if (result?.songs?.length) {
        const newSongs = mergeWithExisting(currentLibrary, result.songs);
        if (newSongs.length) await saveLocalSongs(newSongs);
        const updatedFolders = [...new Set([...importedFolders, ...folderPaths])];
        await saveSetting('importedFolders', updatedFolders);
        return { result, newSongs, updatedFolders, folderPaths };
    }
    return { result, newSongs: [], updatedFolders: importedFolders, folderPaths };
}

export async function rescanLibrary(importedFolders = []) {
    if (!window.electronAPI) return [];
    await clearLocalLibrary();
    const defaultResult = await window.electronAPI.scanDefaultMusicFolder();
    let allSongs = defaultResult?.songs || [];

    if (importedFolders.length) {
        const importResult = await window.electronAPI.importMusicFolders(importedFolders);
        if (importResult?.songs) allSongs = [...allSongs, ...importResult.songs];
    }

    const uniqueSongs = Array.from(new Map(allSongs.map(s => [s.filePath, s])).values());
    await saveLocalSongs(uniqueSongs);
    return uniqueSongs;
}

export async function loadLibraryData() {
    const [localLibrary, importedFolders] = await Promise.all([
        getAllLocalSongs().catch(() => []),
        getSetting('importedFolders').catch(() => [])
    ]);
    return { localLibrary: localLibrary || [], importedFolders: importedFolders || [] };
}

// DOWNLOAD FUNCTIONS

export { getAllDownloads };

export async function downloadSong(song, downloads = []) {
    const videoId = song.videoId || song.key;
    if (!videoId || !window.electronAPI) return { success: false };

    try {
        const existingPath = await window.electronAPI.isSongDownloaded(videoId, { title: song.title, artist: song.artist || 'Unknown' });
        if (existingPath) {
            if (!downloads.some(d => d.videoId === videoId)) {
                const downloadedSong = { ...song, videoId, filePath: existingPath, downloadedAt: Date.now() };
                await saveDownload(downloadedSong);
                return { success: true, downloadedSong };
            }
            return { success: true };
        }

        const result = await window.electronAPI.downloadSong(videoId, { title: song.title, artist: song.artist || 'Unknown' });
        if (!result?.filePath) throw new Error('Download failed');

        const downloadedSong = { ...song, videoId, filePath: result.filePath, downloadedAt: Date.now() };
        await saveDownload(downloadedSong);
        return { success: true, downloadedSong };
    } catch (e) {
        console.error('[MediaService]', e);
        return { success: false, error: e };
    }
}

export async function deleteDownloadedSong(videoId, downloads = []) {
    try {
        const d = downloads.find(x => x.videoId === videoId);
        if (d?.filePath && window.electronAPI) await window.electronAPI.deleteDownload(d.filePath);
        await removeDownload(videoId);
        return { success: true };
    } catch (e) {
        console.error('[MediaService]', e);
        return { success: false, error: e };
    }
}

export const isDownloaded = (videoId, downloads = []) => downloads.some(d => d.videoId === videoId);

export async function fetchAudioUrl(song, downloads = []) {
    if (!song) return null;
    if (song.isLocal && song.filePath) return window.electronAPI?.getLocalFileUrl(song.filePath) || null;

    const videoId = song.videoId || song.id;
    if (!videoId) return null;

    const downloaded = downloads.find(d => d.videoId === videoId);
    if (downloaded?.filePath) return window.electronAPI?.getLocalFileUrl(downloaded.filePath) || null;

    return window.electronAPI?.getAudioUrl(videoId) || null;
}
