/**
 * Library Service
 * Frontend service for managing local music library
 * Handles scanning, importing, and managing local songs
 */

import {
    getAllLocalSongs,
    saveLocalSongs,
    clearLocalLibrary,
    getSetting,
    saveSetting,
} from '../common/db';

/**
 * Merge new songs with existing library, avoiding duplicates by file path
 * @param {Array} existingLibrary - Current local library songs
 * @param {Array} newSongs - New songs to merge
 * @returns {Array} - Songs that are actually new (not duplicates)
 */
export function mergeWithExisting(existingLibrary, newSongs) {
    const existingPaths = new Set(existingLibrary.map(s => s.filePath));
    return newSongs.filter(s => !existingPaths.has(s.filePath));
}

/**
 * Scan the default Music folder for audio files
 * @param {Array} currentLibrary - Current local library for duplicate checking
 * @returns {Promise<{result: Object, newSongs: Array}>}
 */
export async function scanDefaultMusicFolder(currentLibrary = []) {
    if (!window.electronAPI) return { result: null, newSongs: [] };

    const result = await window.electronAPI.scanDefaultMusicFolder();

    if (result && result.songs.length > 0) {
        const newSongs = mergeWithExisting(currentLibrary, result.songs);
        if (newSongs.length > 0) {
            await saveLocalSongs(newSongs);
        }
        console.log(`[LibraryService] Added ${newSongs.length} new local songs`);
        return { result, newSongs };
    }

    return { result, newSongs: [] };
}

/**
 * Open folder picker and import selected music folders
 * @param {Array} currentLibrary - Current local library for duplicate checking
 * @param {Array} importedFolders - Previously imported folder paths
 * @returns {Promise<{result: Object, newSongs: Array, updatedFolders: Array}|null>}
 */
export async function importMusicFolder(currentLibrary = [], importedFolders = []) {
    if (!window.electronAPI) return null;

    const folderPaths = await window.electronAPI.selectMusicFolder();
    if (!folderPaths || folderPaths.length === 0) return null;

    const result = await window.electronAPI.importMusicFolders(folderPaths);

    if (result && result.songs.length > 0) {
        const newSongs = mergeWithExisting(currentLibrary, result.songs);

        if (newSongs.length > 0) {
            await saveLocalSongs(newSongs);
        }

        // Update imported folder paths
        const updatedFolders = [...new Set([...importedFolders, ...folderPaths])];
        await saveSetting('importedFolders', updatedFolders);

        console.log(`[LibraryService] Imported ${newSongs.length} new songs from selected folders`);

        return { result, newSongs, updatedFolders, folderPaths };
    }

    return { result, newSongs: [], updatedFolders: importedFolders, folderPaths };
}

/**
 * Rescan all imported folders and rebuild the library
 * @param {Array} importedFolders - List of imported folder paths
 * @returns {Promise<Array>} - Unique songs from all folders
 */
export async function rescanLibrary(importedFolders = []) {
    if (!window.electronAPI) return [];

    // Clear existing local library
    await clearLocalLibrary();

    // Scan default folder
    const defaultResult = await window.electronAPI.scanDefaultMusicFolder();
    let allSongs = defaultResult?.songs || [];

    // Scan imported folders
    if (importedFolders.length > 0) {
        const importResult = await window.electronAPI.importMusicFolders(importedFolders);
        if (importResult?.songs) {
            allSongs = [...allSongs, ...importResult.songs];
        }
    }

    // Remove duplicates by file path
    const uniqueSongs = Array.from(
        new Map(allSongs.map(s => [s.filePath, s])).values()
    );

    await saveLocalSongs(uniqueSongs);
    console.log(`[LibraryService] Rescanned library: ${uniqueSongs.length} songs`);

    return uniqueSongs;
}



/**
 * Load initial library data from IndexedDB
 * @returns {Promise<{localLibrary: Array, importedFolders: Array}>}
 */
export async function loadLibraryData() {
    const [localLibrary, importedFolders] = await Promise.all([
        getAllLocalSongs().catch(() => []),
        getSetting('importedFolders').catch(() => []),
    ]);

    return {
        localLibrary: localLibrary || [],
        importedFolders: importedFolders || [],
    };
}
