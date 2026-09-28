/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ResourceItem } from '../types/resource';

interface ProfessionalVideoPlayerProps {
  resource: ResourceItem;
  className?: string;
  autoPlay?: boolean;
}

interface VideoSourceInfo {
  type: 'youtube' | 'vimeo' | 'dailymotion' | 'archive' | 'direct' | 'unknown';
  id?: string;
  streamUrl?: string;
  embedUrl?: string;
}

export function parseVideoSource(resource: ResourceItem): VideoSourceInfo {
  const rawUrl = resource.previewUrl || resource.downloadUrl || resource.source?.resourceUrl || '';
  const trimmed = rawUrl.trim();

  // 1. YouTube
  if (resource.attributes?.youtubeId) {
    return {
      type: 'youtube',
      id: String(resource.attributes.youtubeId),
      embedUrl: `https://www.youtube-nocookie.com/embed/${resource.attributes.youtubeId}?autoplay=1&rel=0&modestbranding=1`
    };
  }

  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      id: ytMatch[1],
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`
    };
  }

  // 2. Vimeo
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      id: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&color=ffffff`
    };
  }

  // 3. Dailymotion
  const dmMatch = trimmed.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  if (dmMatch && dmMatch[1]) {
    return {
      type: 'dailymotion',
      id: dmMatch[1],
      embedUrl: `https://geo.dailymotion.com/player.html?video=${dmMatch[1]}`
    };
  }

  // 4. Internet Archive
  const iaMatch = trimmed.match(/archive\.org\/(?:details|embed)\/([a-zA-Z0-9._-]+)/i);
  const iaId = resource.attributes?.iaId || (iaMatch ? iaMatch[1] : null);
  if (iaId) {
    return {
      type: 'archive',
      id: String(iaId),
      embedUrl: `https://archive.org/embed/${encodeURIComponent(String(iaId))}`,
      streamUrl: `/api/v1/media-tunnel?iaId=${encodeURIComponent(String(iaId))}&type=video`
    };
  }

  // 5. Direct Video File (mp4, webm, ogv, m4v)
  if (/\.(mp4|webm|ogv|m4v)(\?.*)?$/i.test(trimmed)) {
    // If running on HTTPS and stream is HTTP, route through media-tunnel to prevent mixed-content blocking
    let finalUrl = trimmed;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && trimmed.startsWith('http://')) {
      finalUrl = `/api/v1/media-tunnel?url=${encodeURIComponent(trimmed)}&type=video`;
    }
    return {
      type: 'direct',
      streamUrl: finalUrl
    };
  }

  // 6. Generic Stream fallback
  let fallbackStream = trimmed;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && trimmed.startsWith('http://')) {
    fallbackStream = `/api/v1/media-tunnel?url=${encodeURIComponent(trimmed)}&type=video`;
  }

  return {
    type: 'direct',
    streamUrl: fallbackStream
  };
}

export const ProfessionalVideoPlayer: React.FC<ProfessionalVideoPlayerProps> = ({
  resource,
  className = '',
  autoPlay = true
}) => {
  const [videoInfo, setVideoInfo] = useState<VideoSourceInfo>(() => parseVideoSource(resource));
  const [playbackTier, setPlaybackTier] = useState<number>(0); // 0 = default, 1 = tunnel proxy, 2 = embed fallback, 3 = error state
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const info = parseVideoSource(resource);
    setVideoInfo(info);
    setPlaybackTier(0);
    setHasError(false);
    setIsLoading(true);
  }, [resource]);

  const handleVideoError = () => {
    console.warn('[VideoPlayer] Playback error on tier', playbackTier, resource.title);

    if (playbackTier === 0) {
      // Tier 1: Try universal media tunnel proxy
      const originalUrl = resource.previewUrl || resource.downloadUrl || resource.source?.resourceUrl || '';
      if (originalUrl) {
        setPlaybackTier(1);
        setVideoInfo((prev) => ({
          ...prev,
          streamUrl: `/api/v1/media-tunnel?url=${encodeURIComponent(originalUrl)}&type=video`
        }));
        return;
      }
    }

    if (playbackTier === 1 && videoInfo.type === 'archive' && videoInfo.id) {
      // Tier 2: For archive items, fallback to embed iframe
      setPlaybackTier(2);
      return;
    }

    // Tier 3: Unrecoverable in native element
    setHasError(true);
    setIsLoading(false);
  };

  const handleVideoLoaded = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleRetry = () => {
    setPlaybackTier(0);
    setHasError(false);
    setIsLoading(true);
    const info = parseVideoSource(resource);
    setVideoInfo(info);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  // 1. YouTube, Vimeo, Dailymotion Embeds
  if ((videoInfo.type === 'youtube' || videoInfo.type === 'vimeo' || videoInfo.type === 'dailymotion') && videoInfo.embedUrl) {
    return (
      <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
        <iframe
          key={videoInfo.embedUrl}
          src={videoInfo.embedUrl}
          title={resource.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  // 2. Archive.org Embed Fallback (if direct stream failed or tier 2 selected)
  if (videoInfo.type === 'archive' && (playbackTier === 2 || !videoInfo.streamUrl) && videoInfo.embedUrl) {
    return (
      <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
        <iframe
          key={videoInfo.embedUrl}
          src={videoInfo.embedUrl}
          title={resource.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  // 3. Direct HTML5 Video Playback with Tiered Fallback
  return (
    <div className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${className}`}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
          <Loader2 className="h-8 w-8 animate-spin text-white/70" />
        </div>
      )}

      {hasError ? (
        /* Professional Video Fallback Screen with Poster & Source Link */
        <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-white text-center bg-neutral-950">
          {resource.thumbnailUrl && (
            <img
              src={resource.thumbnailUrl}
              alt={resource.title}
              className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm pointer-events-none"
            />
          )}
          <div className="relative z-10 max-w-md space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 shadow-md">
              <Play className="h-5 w-5 ml-0.5 fill-current" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white line-clamp-1">{resource.title}</h3>
              <p className="text-xs text-neutral-400">
                Direct browser playback restricted by origin provider.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Stream</span>
              </button>

              {(resource.previewUrl || resource.source?.resourceUrl) && (
                <a
                  href={resource.previewUrl || resource.source?.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-xs font-semibold text-neutral-900 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open on Source</span>
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          key={videoInfo.streamUrl}
          src={videoInfo.streamUrl}
          poster={resource.thumbnailUrl}
          controls
          autoPlay={autoPlay}
          playsInline
          onError={handleVideoError}
          onLoadedData={handleVideoLoaded}
          onCanPlay={handleVideoLoaded}
          className="w-full h-full object-contain"
        >
          Your browser does not support HTML5 video playback.
        </video>
      )}
    </div>
  );
};
