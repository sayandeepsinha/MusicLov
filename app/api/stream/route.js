import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    try {
        console.log(`[Stream API] Extracting audio URL for video: ${videoId}`);

        // Use yt-dlp to extract the direct audio URL (not download the file)
        const ytdlp = spawn('yt-dlp', [
            // Get URL only, don't download
            '-g',

            // Format selection - best audio only
            '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',

            // Performance optimizations
            '--no-playlist',
            '--no-warnings',
            '--quiet',
            '--no-check-certificates',

            // Video URL
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        // Collect the URL from stdout
        let audioUrl = '';
        let errorOutput = '';

        ytdlp.stdout.on('data', (data) => {
            audioUrl += data.toString();
        });

        ytdlp.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        // Wait for the process to complete
        await new Promise((resolve, reject) => {
            ytdlp.on('close', (code) => {
                if (code !== 0) {
                    console.error(`[Stream API] yt-dlp exited with code ${code}`);
                    console.error(`[Stream API] Error output: ${errorOutput}`);
                    reject(new Error(`yt-dlp failed with code ${code}`));
                } else {
                    resolve();
                }
            });

            ytdlp.on('error', (error) => {
                console.error(`[Stream API] Process error:`, error);
                reject(error);
            });
        });

        // Clean up the URL (remove any trailing whitespace/newlines)
        audioUrl = audioUrl.trim();

        if (!audioUrl) {
            throw new Error('Failed to extract audio URL');
        }

        console.log(`[Stream API] Successfully extracted URL for ${videoId}`);

        // Redirect to the direct audio URL
        // YouTube's servers support range requests, enabling seeking
        return NextResponse.redirect(audioUrl, 302);

    } catch (error) {
        console.error('[Stream API] Error:', error);

        return NextResponse.json({
            error: 'Failed to extract audio URL',
            message: error.message || 'Unknown error occurred',
        }, { status: 500 });
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range',
        },
    });
}
