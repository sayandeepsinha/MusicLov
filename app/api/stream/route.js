import { NextResponse } from 'next/server';
import { Innertube, UniversalCache } from 'youtubei.js/web';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    try {
        // Initialize Innertube with ANDROID client
        const youtube = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_locally: true,
            client_type: 'ANDROID'
        });

        console.log(`Getting stream for video: ${videoId}`);

        const stream = await youtube.download(videoId, {
            type: 'audio',
            quality: 'best',
            format: 'mp4'
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'audio/mp4',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('Stream API Error:', error);
        return NextResponse.json({ error: 'Failed to get stream' }, { status: 500 });
    }
}
