import { NextResponse } from 'next/server';
import { Innertube } from '@/lib/innertube/Innertube';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const playlistId = searchParams.get('playlistId');
    const params = searchParams.get('params');

    if (!videoId && !playlistId) {
        return NextResponse.json({ error: 'videoId or playlistId parameter is required' }, { status: 400 });
    }

    try {
        const innertube = new Innertube();
        const data = await innertube.next(videoId, playlistId, params);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
