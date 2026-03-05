export function upgradeThumbnailUrl(url) {
    if (!url) return url;

    // YouTube Music (googleusercontent.com / ggpht.com)
    if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
        // Use s400 which is more broadly available than s544 but still sharp
        return url.replace(/(=w\d+-h\d+|=s\d+).*/, '=s400');
    }

    // Standard YouTube (ytimg.com)
    if (url.includes('ytimg.com')) {
        // Use hqdefault as a safer bet than maxresdefault
        return url.replace(/\/(default|hqdefault|mqdefault|sddefault|hq720)\.jpg/, '/hqdefault.jpg');
    }

    return url;
}
