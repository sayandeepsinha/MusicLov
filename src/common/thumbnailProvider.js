export function upgradeThumbnailUrl(url, videoId) {
    if (videoId) {
        // Force standard high-res 16:9 YouTube video thumbnail for everything
        return `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
    }

    // Fallbacks if no videoId is provided
    if (!url) return null;
    if (url.includes('googleusercontent.com')) {
        return url.replace(/=w\d+-h\d+/, '=w1080-h1080').replace(/-p-df/, '');
    }
    if (url.includes('i.ytimg.com')) {
        return url.split('?')[0]; // Strip tight cropping parameters
    }

    return url;
}
