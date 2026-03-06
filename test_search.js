const { innertubeRequest, WEB_REMIX_CLIENT, SearchFilter } = require('./src/electronlogic/services/innertube');

async function testSearch() {
    const body = {
        context: {
            client: WEB_REMIX_CLIENT
        },
        query: 'Billboard Hot 100 songs',
        params: SearchFilter.Song,
    };

    try {
        console.log(`Searching...`);
        const res = await innertubeRequest('/youtubei/v1/search', body);
        console.log("Got response:", res.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer?.contents?.length || 0, "songs");
    } catch (e) {
        console.error(e);
    }
}

testSearch();
