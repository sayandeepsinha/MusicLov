/**
 * Services Index
 * Re-exports all services for easy importing
 */

const proxy = require('./proxy');
const ytdlp = require('./ytdlp');
const innertube = require('./innertube');
const localLibrary = require('./localLibrary');

module.exports = {
    proxy,
    ytdlp,
    innertube,
    localLibrary,
};
