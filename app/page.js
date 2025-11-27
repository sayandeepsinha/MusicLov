"use client";

import { useState, useEffect, Suspense } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { Search, Play, Music, Disc, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

const getBestThumbnail = (thumbnails) => {
  if (!thumbnails?.length) return null;
  // Sort by width descending to get the highest quality
  return [...thumbnails].sort((a, b) => b.width - a.width)[0];
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q");

  const [query, setQuery] = useState(queryParam || "");
  const [results, setResults] = useState(null);
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { playSong } = usePlayer();

  useEffect(() => {
    // Fetch Home Feed on mount
    const fetchHome = async () => {
      try {
        const res = await fetch('/api/browse');
        const data = await res.json();
        setHomeData(data);
      } catch (e) {
        console.error("Failed to fetch home feed", e);
      }
    };
    fetchHome();
  }, []);

  useEffect(() => {
    if (queryParam) {
      setQuery(queryParam);
      performSearch(queryParam);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [queryParam]);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=Song`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/?q=${encodeURIComponent(query)}`);
  };

  const getHighResThumbnailUrl = (url) => {
    if (!url) return null;
    return url.replace(/w\d+-h\d+/, 'w544-h544');
  };

  // Helper to parse and render items
  const renderItem = (item, index, sectionIndex) => {
    let renderer = item.musicResponsiveListItemRenderer || item.musicTwoRowItemRenderer;
    if (!renderer) return null;

    // Extract data based on renderer type
    let title, videoId, baseThumbnailUrl, artist, subtitle, thumbnails;

    if (item.musicResponsiveListItemRenderer) {
      title = renderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text;
      videoId = renderer.playlistItemData?.videoId || renderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint?.watchEndpoint?.videoId;

      thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
      baseThumbnailUrl = getBestThumbnail(thumbnails)?.url;

      artist = renderer.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs?.[0]?.text;
    } else if (item.musicTwoRowItemRenderer) {
      title = renderer.title.runs[0].text;
      videoId = renderer.navigationEndpoint?.watchEndpoint?.videoId;

      thumbnails = renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails;
      baseThumbnailUrl = thumbnails?.[thumbnails.length - 1]?.url;

      subtitle = renderer.subtitle?.runs?.map(r => r.text).join("");
      artist = subtitle; // Use subtitle as artist/desc
    }

    if (!videoId) return null; // Skip if not playable

    const highResThumbnailUrl = getHighResThumbnailUrl(baseThumbnailUrl);

    const songItem = {
      key: videoId,
      videoId,
      title,
      thumbnail: {
        thumbnails: thumbnails || [],
        url: baseThumbnailUrl,
        highRes: highResThumbnailUrl,
        lowRes: baseThumbnailUrl
      },
      authors: [{ name: artist }],
    };

    return (
      <motion.div
        key={`${sectionIndex}-${index}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => playSong(songItem)}
        className="group relative bg-neutral-900/50 border border-white/5 hover:border-white/10 rounded-xl p-2.5 sm:p-4 cursor-pointer hover:bg-neutral-800/50 transition-all duration-300 backdrop-blur-sm w-full max-w-[200px] mx-auto"
      >
        <div className="flex flex-col gap-2 sm:gap-3 w-full">
          <div className="relative aspect-square">
            {baseThumbnailUrl ? (
              <img
                src={baseThumbnailUrl}
                alt={title}
                className="w-full h-full rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.parentElement.innerHTML = '<div class="w-full h-full rounded-xl bg-neutral-800 flex items-center justify-center"><svg class="w-12 h-12 text-neutral-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div><div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl"><svg class="w-10 h-10 text-white" style="fill: currentColor" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>';
                }}
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-neutral-800 flex items-center justify-center">
                <Music className="w-12 h-12 text-neutral-600" />
              </div>
            )}
            {baseThumbnailUrl && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl">
                <Play className="w-10 h-10 text-white fill-current" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-white line-clamp-2 group-hover:text-purple-400 transition-colors text-xs sm:text-sm leading-tight">{title}</h3>
            <p className="text-xs text-neutral-400 truncate mt-0.5 sm:mt-1">{artist}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-32 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-16 sm:pt-24 md:pt-32 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6 sm:mb-8 md:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-2 sm:mb-4 md:mb-6 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-tight">
            MusicLov
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base md:text-lg">Stream your favorite tracks, ad-free.</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="sticky top-16 sm:top-20 md:top-24 z-40 mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto"
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition-opacity duration-500" />
            <div className="relative flex items-center bg-neutral-900/80 border border-white/10 rounded-full p-1.5 sm:p-2 backdrop-blur-xl shadow-2xl transition-all group-hover:border-white/20">
              <Search className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-400 ml-3 sm:ml-4" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for songs, artists, or albums..."
                className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none text-white placeholder-neutral-500 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base md:text-lg appearance-none no-focus-outline"
                style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-white text-black px-4 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 rounded-full font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  "Search"
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {results && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {results?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.map((section, i) => (
              section.musicShelfRenderer?.contents?.map((item, j) => renderItem(item, j, i))
            ))}
          </div>
        )}

        {/* Home Feed (Curated Charts) */}
        {
          !results && !loading && homeData?.sections && (
            <div className="space-y-12">
              {homeData.sections.map((section, i) => {
                // Extract items from the search response structure
                // Search results are usually in: contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicShelfRenderer.contents
                // We need to be careful as the structure might vary.

                const contents = section.data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

                if (!contents) return null;

                // Flatten all shelves to get a list of songs
                let items = [];
                contents.forEach(c => {
                  if (c.musicShelfRenderer?.contents) {
                    items = [...items, ...c.musicShelfRenderer.contents];
                  }
                });

                // Limit to 10 songs as requested
                items = items.slice(0, 10);

                if (items.length === 0) return null;

                return (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingUp className="w-6 h-6 text-purple-400" />
                      <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                      {items.map((item, j) => renderItem(item, j, i))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }

        {/* Loading State */}
        {
          loading && (
            <div className="flex justify-center mt-20">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )
        }

        {/* Empty State / Welcome */}
        {
          !results && !loading && !homeData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mt-20"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-900 mb-6 border border-white/5">
                <Music className="w-10 h-10 text-neutral-500" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Ready to play?</h2>
              <p className="text-neutral-400">Search for your favorite songs to get started.</p>
            </motion.div>
          )
        }
      </div >
    </main >
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
