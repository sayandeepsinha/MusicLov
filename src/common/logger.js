/**
 * Renderer-Process Logger Service
 *
 * A lightweight logger for the React renderer. All messages are prefixed
 * with [MusicLov] and the tag so they're easy to filter in DevTools.
 *
 * Usage:
 *   import logger from '../common/logger';
 *   logger.info('PlayerContext', 'Engine ready');
 *   logger.error('PlayerContext', 'Engine error', err);
 */

const isDev = process.env.NODE_ENV === 'development';

function _format(level, tag, message) {
    return `[MusicLov][${level}][${tag}] ${message}`;
}

function info(tag, msg, ...args) {
    if (!isDev) return;
    if (args.length) {
        console.info(_format('INFO', tag, msg), ...args);
    } else {
        console.info(_format('INFO', tag, msg));
    }
}

function warn(tag, msg, ...args) {
    if (!isDev) return;
    if (args.length) {
        console.warn(_format('WARN', tag, msg), ...args);
    } else {
        console.warn(_format('WARN', tag, msg));
    }
}

function error(tag, msg, ...args) {
    if (!isDev) return;
    if (args.length) {
        console.error(_format('ERROR', tag, msg), ...args);
    } else {
        console.error(_format('ERROR', tag, msg));
    }
}

const logger = { info, warn, error };
export default logger;
