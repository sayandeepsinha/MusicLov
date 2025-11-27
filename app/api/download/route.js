import { NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js/web';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const title = searchParams.get('title') || 'audio';

    if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    try {
        // Initialize Innertube
        const youtube = await Innertube.create();

        // Get video info
        const info = await youtube.getInfo(videoId);

        if (!info) {
            return NextResponse.json({ error: 'Could not get video info' }, { status: 404 });
        }

        // Get the best audio format
        const audioFormat = info.chooseFormat({ type: 'audio', quality: 'best' });

        if (!audioFormat) {
            return NextResponse.json({ error: 'No audio format found' }, { status: 404 });
        }

        // Decipher the URL if needed
        if (audioFormat.has_signature_cipher || audioFormat.has_cipher) {
            await audioFormat.decipher(youtube.session.player);
        }

        const streamUrl = audioFormat.url;

        if (!streamUrl) {
            return NextResponse.json({ error: 'Could not get stream URL' }, { status: 404 });
        }

        // Fetch the stream
        const response = await fetch(streamUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch stream: ${response.statusText}`);
        }

        // Create a new response with the stream body
        // We need to set headers for download
        const headers = new Headers(response.headers);
        headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.mp3"`);
        headers.set('Content-Type', 'audio/mpeg');

        return new NextResponse(response.body, {
            status: 200,
            headers: headers,
        });

    } catch (error) {
        console.error("Download API Error:", error);
        return NextResponse.json({
            error: error.message || 'Failed to download audio',
            details: error.toString()
        }, { status: 500 });
    }
}
