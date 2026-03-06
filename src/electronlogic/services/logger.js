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

// Resolve log directory: src/electronlogic/services/ → src/logs/
const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'musiclov.log');

// Ensure the logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Append-mode write stream (non-blocking)
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function _timestamp() {
    return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function _write(level, tag, message, extra) {
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
