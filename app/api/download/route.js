import { NextResponse } from 'next/server';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const title = searchParams.get('title') || 'audio';

    if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    try {
        // Construct absolute path to yt-dlp binary
        const binaryPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');

        // Execute yt-dlp to get the stream URL
        const { stdout } = await execFileAsync(binaryPath, [
            '--get-url',
            '-f', 'bestaudio',
            '--no-warnings',
            '--no-call-home',
            '--no-check-certificate',
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        const streamUrl = stdout.trim().split('\n')[0];

        if (!streamUrl) {
            return NextResponse.json({ error: 'No audio stream found' }, { status: 404 });
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
