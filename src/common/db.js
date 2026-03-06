/**
 * IndexedDB Helper Functions
 * Shared database utilities for managing local storage
 */

const DB_NAME = 'musiclov_db';
const DB_VERSION = 3; // Bump version to create history store
const DOWNLOADS_STORE = 'downloads';
const LOCAL_LIBRARY_STORE = 'localLibrary';
const SETTINGS_STORE = 'settings';
const HISTORY_STORE = 'history';

/**
 * Open the IndexedDB database
 */
export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(DOWNLOADS_STORE)) {
                db.createObjectStore(DOWNLOADS_STORE, { keyPath: 'videoId' });
            }
            if (!db.objectStoreNames.contains(LOCAL_LIBRARY_STORE)) {
                const localStore = db.createObjectStore(LOCAL_LIBRARY_STORE, { keyPath: 'id' });
                localStore.createIndex('filePath', 'filePath', { unique: true });
            }
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(HISTORY_STORE)) {
                const historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'timestamp' });
                historyStore.createIndex('videoId', 'videoId', { unique: false });
            }
        };
    });
}

/**
 * Get all downloaded songs
 */
export async function getAllDownloads() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DOWNLOADS_STORE, 'readonly');
        const store = tx.objectStore(DOWNLOADS_STORE);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

/**
 * Save a downloaded song
 */
export async function saveDownload(song) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DOWNLOADS_STORE, 'readwrite');
        const store = tx.objectStore(DOWNLOADS_STORE);
        const request = store.put(song);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

/**
 * Remove a downloaded song
 */
export async function removeDownload(videoId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DOWNLOADS_STORE, 'readwrite');
        const store = tx.objectStore(DOWNLOADS_STORE);
        const request = store.delete(videoId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

/**
 * Get all local songs from library
 */
export async function getAllLocalSongs() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_LIBRARY_STORE, 'readonly');
        const store = tx.objectStore(LOCAL_LIBRARY_STORE);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

/**
 * Save local songs to library
 */
export async function saveLocalSongs(songs) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_LIBRARY_STORE, 'readwrite');
        const store = tx.objectStore(LOCAL_LIBRARY_STORE);

        songs.forEach(song => {
            store.put(song);
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Clear the entire local library
 */
export async function clearLocalLibrary() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_LIBRARY_STORE, 'readwrite');
        const store = tx.objectStore(LOCAL_LIBRARY_STORE);
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

/**
 * Get a setting value
 */
export async function getSetting(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, 'readonly');
        const store = tx.objectStore(SETTINGS_STORE);
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result?.value);
    });
}

/**
 * Save a setting value
 */
export async function saveSetting(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, 'readwrite');
        const store = tx.objectStore(SETTINGS_STORE);
        const request = store.put({ key, value });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

/**
 * Delete a local song from library
 */
export async function deleteLocalSong(songId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_LIBRARY_STORE, 'readwrite');
        const store = tx.objectStore(LOCAL_LIBRARY_STORE);
        const request = store.delete(songId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

/**
 * Add a song to the listening history
 */
export async function addToHistory(song) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(HISTORY_STORE, 'readwrite');
        const store = tx.objectStore(HISTORY_STORE);
        // Save minimal song info with current timestamp
        const entry = {
            timestamp: Date.now(),
            videoId: song.videoId,
            title: song.title,
            artist: song.artist,
            thumbnail: song.thumbnail,
            isLocal: song.isLocal || false,
        };
        const request = store.put(entry);

        // Optional: trim history if it gets too large (> 500 items)
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Get the N most recently played songs
 * Returns only unique videoIds from recent history to seed recommendations
 */
export async function getRecentHistoryVideoIds(limit = 10) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(HISTORY_STORE, 'readonly');
        const store = tx.objectStore(HISTORY_STORE);

        // Open a cursor going backwards (prev) through timestamps (newest first)
        const request = store.openCursor(null, 'prev');

        const recentUniqueIds = new Set();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && recentUniqueIds.size < limit) {
                // Only consider YouTube streams, not local offline files for seeding
                if (!cursor.value.isLocal && cursor.value.videoId) {
                    recentUniqueIds.add(cursor.value.videoId);
                }
                cursor.continue();
            } else {
                resolve(Array.from(recentUniqueIds));
            }
        };

        request.onerror = () => reject(request.error);
    });
}
