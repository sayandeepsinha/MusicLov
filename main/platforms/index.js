/**
 * Platform Module Index
 * Auto-detects current platform and exports the appropriate module
 */

const platform = process.platform;

let platformModule;

switch (platform) {
    case 'darwin':
        platformModule = require('./darwin');
        break;
    case 'win32':
        platformModule = require('./win32');
        break;
    case 'linux':
        platformModule = require('./linux');
        break;
    default:
        // Fallback to Linux for unknown platforms
        console.warn(`[Platforms] Unknown platform '${platform}', using Linux defaults`);
        platformModule = require('./linux');
        break;
}

module.exports = platformModule;
