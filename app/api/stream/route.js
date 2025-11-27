import { NextResponse } from 'next/server';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    try {
        // Construct absolute path to yt-dlp binary
        const binaryPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');

        // Execute yt-dlp directly
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

        // Redirect to the actual audio stream URL
        return NextResponse.redirect(streamUrl);
    } catch (error) {
        console.error("Stream API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
