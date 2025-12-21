/**
 * Services Index
 * Re-exports all services for easy importing
 */

const proxy = require('./proxy');
const ytdlp = require('./ytdlp');
const innertube = require('./innertube');

module.exports = {
    proxy,
    ytdlp,
    innertube,
};
