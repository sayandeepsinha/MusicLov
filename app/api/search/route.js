import { NextResponse } from 'next/server';
import { Innertube, SearchFilter } from '@/lib/innertube/Innertube';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'Song';

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        const innertube = new Innertube();
        const filter = SearchFilter[type] || SearchFilter.Song;
        const data = await innertube.search(query, filter);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
