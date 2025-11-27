export const InnertubeConfig = {
    BASE_URL: "https://music.youtube.com",
    API_KEY: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    USER_AGENT: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ENDPOINTS: {
        browse: "/youtubei/v1/browse",
        next: "/youtubei/v1/next",
        player: "/youtubei/v1/player",
        search: "/youtubei/v1/search",
        searchSuggestions: "/youtubei/v1/music/get_search_suggestions",
    },
};

export const SearchFilter = {
    Song: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D",
    Video: "EgWKAQIQAWoKEAkQChAFEAMQBA%3D%3D",
    Album: "EgWKAQIYAWoKEAkQChAFEAMQBA%3D%3D",
    Artist: "EgWKAQIgAWoKEAkQChAFEAMQBA%3D%3D",
    CommunityPlaylist: "EgeKAQQoAEABagoQAxAEEAoQCRAF",
    FeaturedPlaylist: "EgeKAQQoADgBagwQDhAKEAMQBRAJEAQ%3D",
};

export const Clients = {
    WEB_REMIX: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20220918",
        platform: "DESKTOP",
        hl: "en",
        visitorData: "CgtEUlRINDFjdm1YayjX1pSaBg%3D%3D",
    },
    ANDROID_MUSIC: {
        clientName: "ANDROID_MUSIC",
        clientVersion: "5.28.1",
        platform: "MOBILE",
        androidSdkVersion: 30,
        userAgent: "com.google.android.apps.youtube.music/5.28.1 (Linux; U; Android 11) gzip",
    },
    TV_EMBEDDED: {
        clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        clientVersion: "2.0",
        platform: "TV",
    },
    IOS: {
        clientName: "IOS",
        clientVersion: "19.29.1",
        platform: "MOBILE",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        userAgent: "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)",
    },
};

export class Innertube {
    constructor() {
        this.baseUrl = InnertubeConfig.BASE_URL;
        this.apiKey = InnertubeConfig.API_KEY;
    }

    async request(endpoint, body = {}) {
        const url = new URL(endpoint, this.baseUrl);
        url.searchParams.append("key", this.apiKey);
        url.searchParams.append("prettyPrint", "false");

        const headers = {
            "User-Agent": body.context?.client?.userAgent || InnertubeConfig.USER_AGENT,
            "Content-Type": "application/json",
            "X-Goog-Api-Key": this.apiKey,
        };

        try {
            const response = await fetch(url.toString(), {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`Innertube API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Innertube Request Failed:", error);
            throw error;
        }
    }

    async search(query, filter = SearchFilter.Song) {
        const body = {
            context: { client: Clients.WEB_REMIX },
            query: query,
            params: filter,
        };
        return this.request(InnertubeConfig.ENDPOINTS.search, body);
    }

    async browse(browseId = "FEmusic_home") {
        const body = {
            context: { client: Clients.WEB_REMIX },
            browseId: browseId,
        };
        return this.request(InnertubeConfig.ENDPOINTS.browse, body);
    }

    async next(videoId, playlistId, params) {
        const body = {
            context: { client: Clients.WEB_REMIX },
            videoId: videoId,
        };
        if (playlistId) body.playlistId = playlistId;
        if (params) body.params = params;
        return this.request(InnertubeConfig.ENDPOINTS.next, body);
    }

    async player(videoId) {
        // Try TV_EMBEDDED Client first (often returns direct URLs and bypasses restrictions)
        try {
            const body = {
                context: {
                    client: Clients.TV_EMBEDDED,
                    thirdParty: {
                        embedUrl: `https://www.youtube.com/watch?v=${videoId}`,
                    },
                },
                videoId: videoId,
            };
            const response = await this.request(InnertubeConfig.ENDPOINTS.player, body);

            if (response.playabilityStatus?.status === "OK") {
                return response;
            }
            console.warn("TV_EMBEDDED Client failed:", response.playabilityStatus?.reason);
        } catch (e) {
            console.warn("TV_EMBEDDED Client failed with error:", e);
        }

        // Fallback to IOS
        try {
            const body = {
                context: { client: Clients.IOS },
                videoId: videoId,
            };
            return this.request(InnertubeConfig.ENDPOINTS.player, body);
        } catch (e) {
            console.error("All clients failed");
            throw e;
        }
    }

    getBestAudioUrl(playerResponse) {
        if (!playerResponse || !playerResponse.streamingData) {
            return null;
        }

        const formats = playerResponse.streamingData.adaptiveFormats || [];
        // Filter for audio only and sort by bitrate (descending)
        const audioFormats = formats
            .filter(f => f.mimeType.includes("audio"))
            .sort((a, b) => b.bitrate - a.bitrate);

        return audioFormats[0]?.url || null;
    }
}
