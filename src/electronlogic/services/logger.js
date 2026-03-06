/**
 * Main-Process Logger Service
 *
 * Writes structured log lines ONLY to src/logs/musiclov.log (file-only, no terminal output).
 * Terminal noise is intentionally suppressed — all diagnostics live in the log file.
 *
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('AudioEngine', 'Initialized');
 *   logger.warn('AudioEngine', 'Seek with no video');
 *   logger.error('AudioEngine', 'Load error', err);
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Only enable file logging in development/unpackaged mode
const isDev = app ? !app.isPackaged : process.env.NODE_ENV !== 'production';
const LOG_DIR = isDev ? (app ? path.join(app.getPath('userData'), 'logs') : path.join(__dirname, '../../logs')) : null;
const LOG_FILE = LOG_DIR ? path.join(LOG_DIR, 'musiclov.log') : null;

// Ensure the logs directory exists if in dev
if (isDev && LOG_DIR && !fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Append-mode write stream (only in dev)
const logStream = isDev && LOG_FILE ? fs.createWriteStream(LOG_FILE, { flags: 'a' }) : null;

function _timestamp() {
    return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function _write(level, tag, message, extra) {
    if (!logStream) return; // Silent in production
    const line = `[${_timestamp()}] [${level}] [${tag}] ${message}${extra ? ' ' + extra : ''}`;
    // File only — no terminal output
    logStream.write(line + '\n');
}

function _serialize(...args) {
    return args.map(a => (a instanceof Error ? a.stack || a.message : String(a))).join(' ');
}

function info(tag, msg, ...args) {
    _write('INFO', tag, msg, args.length ? _serialize(...args) : '');
}

function warn(tag, msg, ...args) {
    _write('WARN', tag, msg, args.length ? _serialize(...args) : '');
}

function error(tag, msg, ...args) {
    _write('ERROR', tag, msg, args.length ? _serialize(...args) : '');
}

module.exports = { info, warn, error };
