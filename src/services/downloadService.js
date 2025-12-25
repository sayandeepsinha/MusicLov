/**
 * Download Service
 * Frontend service for managing song downloads
 * Handles downloading, checking status, and deleting downloaded songs
 */

import { saveDownload, removeDownload } from '../common/db';

/**
 * Download a song for offline playback
 * @param {Object} song - Song object with videoId, title, artist, thumbnail
 * @param {Array} downloads - Current downloads list
 * @returns {Promise<{success: boolean, downloadedSong?: Object}>}
 */
export async function downloadSong(song, downloads = []) {
    const videoId = song.videoId || song.key;
    if (!videoId || !window.electronAPI) {
        return { success: false };
    }

    try {
        // Ask backend if file already exists on disk
        const existingPath = await window.electronAPI.isSongDownloaded(videoId, {
            title: song.title,
            artist: song.artist || 'Unknown Artist',
        });

        if (existingPath) {
            console.log('[DownloadService] Already downloaded:', existingPath);
            // Sync to IndexedDB if not there
            if (!downloads.some(d => d.videoId === videoId)) {
                const downloadedSong = {
                    videoId,
                    title: song.title,
                    artist: song.artist,
                    thumbnail: song.thumbnail,
                    filePath: existingPath,
                    downloadedAt: Date.now(),
                };
                await saveDownload(downloadedSong);
                return { success: true, downloadedSong };
            }
            return { success: true };
        }

        // Download via backend
        console.log('[DownloadService] Downloading:', song.title);
        const result = await window.electronAPI.downloadSong(videoId, {
            title: song.title,
            artist: song.artist || 'Unknown Artist',
        });

        if (!result?.filePath) {
            throw new Error('Download failed');
        }

        // Save metadata to IndexedDB
        const downloadedSong = {
            videoId,
            title: song.title,
            artist: song.artist,
            thumbnail: song.thumbnail,
            filePath: result.filePath,
            downloadedAt: Date.now(),
        };
        await saveDownload(downloadedSong);
        console.log('[DownloadService] Downloaded to:', result.filePath);

        return { success: true, downloadedSong };
    } catch (error) {
        console.error('[DownloadService] Download failed:', error);
        return { success: false, error };
    }
}

/**
 * Delete a downloaded song
 * @param {string} videoId - Video ID of the song to delete
 * @param {Array} downloads - Current downloads list
 * @returns {Promise<{success: boolean, shouldStopPlayback: boolean}>}
 */
export async function deleteDownloadedSong(videoId, downloads = []) {
    try {
        const downloaded = downloads.find(d => d.videoId === videoId);

        // Backend deletes file from disk
        if (downloaded?.filePath && window.electronAPI) {
            await window.electronAPI.deleteDownload(downloaded.filePath);
        }

        // Remove from IndexedDB
        await removeDownload(videoId);

        return { success: true };
    } catch (error) {
        console.error('[DownloadService] Failed to delete download:', error);
        return { success: false, error };
    }
}

/**
 * Check if a song is downloaded
 * @param {string} videoId - Video ID to check
 * @param {Array} downloads - Current downloads list
 * @returns {boolean}
 */
export function isDownloaded(videoId, downloads = []) {
    return downloads.some(d => d.videoId === videoId);
}

/**
 * Fetch audio URL for a song (local or remote)
 * @param {Object} song - Song object
 * @param {Array} downloads - Current downloads list
 * @returns {Promise<string|null>} - Audio URL or null
 */
export async function fetchAudioUrl(song, downloads = []) {
    if (!song) return null;

    // Handle local files
    if (song.isLocal && song.filePath) {
        console.log('[DownloadService] Playing local file:', song.filePath);
        try {
            const url = await window.electronAPI.getLocalFileUrl(song.filePath);
            console.log('[DownloadService] Got local file URL');
            return url;
        } catch (error) {
            console.error('[DownloadService] Failed to get local file URL:', error);
            return null;
        }
    }

    // Handle online songs
    const videoId = song.videoId || song.key || song.id;
    if (!videoId) return null;

    console.log('[DownloadService] Fetching audio for:', videoId);

    try {
        // Check if song is marked as downloaded
        const downloaded = downloads.find(d => d.videoId === videoId);
        if (downloaded && downloaded.filePath) {
            // Song is downloaded - play from local file
            const url = await window.electronAPI.getLocalFileUrl(downloaded.filePath);
            if (url) {
                console.log('[DownloadService] Playing downloaded file:', downloaded.filePath);
                return url;
            } else {
                // File was deleted - show error, don't fallback to YouTube
                console.error('[DownloadService] Downloaded file not found:', downloaded.filePath);
                return null;
            }
        }

        // Otherwise fetch from internet
        if (window.electronAPI) {
            const url = await window.electronAPI.getAudioUrl(videoId);
            console.log('[DownloadService] Got audio URL');
            return url;
        } else {
            console.error('[DownloadService] Electron API not available');
            return null;
        }
    } catch (error) {
        console.error('[DownloadService] Failed to get audio URL:', error);
        return null;
    }
}
