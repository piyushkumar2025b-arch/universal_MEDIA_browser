/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  ExternalLink, 
  RefreshCw, 
  Loader2,
  Tv
} from 'lucide-react';
import { ResourceItem } from '../types/resource';

interface ProfessionalVideoPlayerProps {
  resource: ResourceItem;
  className?: string;
  autoPlay?: boolean;
}

interface VideoSourceInfo {
  type: 'embed' | 'direct' | 'broadcast';
  embedUrl?: string;
  streamUrl?: string;
  posterUrl?: string;
}

export function parseVideoSource(resource: ResourceItem): VideoSourceInfo {
  // 1. Explicit attributes embedUrl (PeerTube, YouTube, Vimeo, Internet Archive, DailyMotion)
  if (resource.attributes?.embedUrl) {
    const raw = String(resource.attributes.embedUrl).trim();
    if (raw.startsWith('http') || raw.startsWith('//')) {
      return {
        type: 'embed',
        embedUrl: raw
      };
    }
  }

  // 2. YouTube ID from attributes
  if (resource.attributes?.youtubeId) {
    return {
      type: 'embed',
      embedUrl: `https://www.youtube-nocookie.com/embed/${resource.attributes.youtubeId}?autoplay=1&rel=0&modestbranding=1`
    };
  }

  const rawUrl = (resource.previewUrl || resource.downloadUrl || resource.source?.resourceUrl || '').trim();
  const resourceUrl = (resource.source?.resourceUrl || '').trim();

  // 3. YouTube URL matching
  const ytMatch = (rawUrl + ' ' + resourceUrl).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'embed',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`
    };
  }

  // 4. Vimeo URL matching
  const vimeoMatch = (rawUrl + ' ' + resourceUrl).match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'embed',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&color=ffffff`
    };
  }

  // 5. PeerTube URL or Provider matching
  if (
    resource.source?.providerId === 'peertube_video' ||
    rawUrl.includes('peertube') ||
    rawUrl.includes('/videos/embed/') ||
    rawUrl.includes('/videos/watch/') ||
    resourceUrl.includes('/videos/watch/')
  ) {
    let embed = rawUrl;
    if (embed.includes('/videos/watch/')) {
      embed = embed.replace('/videos/watch/', '/videos/embed/');
    } else if (!embed.includes('/videos/embed/') && resourceUrl.includes('/videos/watch/')) {
      embed = resourceUrl.replace('/videos/watch/', '/videos/embed/');
    }
    if (embed.startsWith('http') && embed.includes('/videos/embed/')) {
      return {
        type: 'embed',
        embedUrl: embed
      };
    }
  }

  // 6. Dailymotion URL matching
  const dmMatch = (rawUrl + ' ' + resourceUrl).match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  if (dmMatch && dmMatch[1]) {
    return {
      type: 'embed',
      embedUrl: `https://geo.dailymotion.com/player.html?video=${dmMatch[1]}&autoplay=1`
    };
  }

  // 7. Internet Archive video matching
  const iaMatch = (rawUrl + ' ' + resourceUrl).match(/archive\.org\/(?:details|embed)\/([a-zA-Z0-9._-]+)/i);
  const iaId = resource.attributes?.iaId || (iaMatch ? iaMatch[1] : null);
  if (iaId) {
    return {
      type: 'embed',
      embedUrl: `https://archive.org/embed/${encodeURIComponent(String(iaId))}`
    };
  }

  // 8. Generic URL with /embed/
  if (rawUrl.includes('/embed/') || rawUrl.includes('/embed?')) {
    return {
      type: 'embed',
      embedUrl: rawUrl
    };
  }

  // 9. Pure Poster / Image URLs (such as TVMaze Broadcast or News Preview)
  if (/\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(rawUrl)) {
    return {
      type: 'broadcast',
      posterUrl: rawUrl
    };
  }

  // 10. Direct video stream file (.mp4, .webm, .ogv, .m4v, or internal tunnel stream)
  let streamUrl = rawUrl;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && streamUrl.startsWith('http://')) {
    streamUrl = `/api/v1/media-tunnel?url=${encodeURIComponent(streamUrl)}&type=video`;
  }

  return {
    type: 'direct',
    streamUrl
  };
}

export const ProfessionalVideoPlayer: React.FC<ProfessionalVideoPlayerProps> = ({
  resource,
  className = '',
  autoPlay = true
}) => {
  const [videoInfo, setVideoInfo] = useState<VideoSourceInfo>(() => parseVideoSource(resource));
  const [hasDirectStreamError, setHasDirectStreamError] = useState(false);
  const [hasAttemptedTunnel, setHasAttemptedTunnel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const info = parseVideoSource(resource);
    setVideoInfo(info);
    setHasDirectStreamError(false);
    setHasAttemptedTunnel(false);
    setIsLoading(true);
  }, [resource]);

  const handleDirectVideoError = () => {
    // If native stream failed, try media tunnel proxy once
    if (!hasAttemptedTunnel && videoInfo.streamUrl && !videoInfo.streamUrl.startsWith('/api/')) {
      setHasAttemptedTunnel(true);
      const originalUrl = resource.previewUrl || resource.downloadUrl || resource.source?.resourceUrl || '';
      if (originalUrl) {
        setVideoInfo({
          type: 'direct',
          streamUrl: `/api/v1/media-tunnel?url=${encodeURIComponent(originalUrl)}&type=video`
        });
        return;
      }
    }

    // If tunnel also failed, check if we have any fallback embed URL
    if (resource.attributes?.embedUrl) {
      setVideoInfo({
        type: 'embed',
        embedUrl: String(resource.attributes.embedUrl)
      });
      return;
    }

    setHasDirectStreamError(true);
    setIsLoading(false);
  };

  const handleVideoLoaded = () => {
    setIsLoading(false);
    setHasDirectStreamError(false);
  };

  // 1. EMBED PLAYER (YouTube, PeerTube, Vimeo, Archive.org, Dailymotion, etc.)
  if (videoInfo.type === 'embed' && videoInfo.embedUrl) {
    return (
      <div className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 pointer-events-none">
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          </div>
        )}

        <iframe
          key={videoInfo.embedUrl}
          src={videoInfo.embedUrl}
          title={resource.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  // 2. BROADCAST / ARCHIVE POSTER PRESENTATION (TVMaze, Variety, Broadcast catalogs)
  if (videoInfo.type === 'broadcast') {
    const watchLink = resource.downloadUrl || resource.source?.resourceUrl || resource.previewUrl;
    return (
      <div className={`relative w-full h-full bg-neutral-950 overflow-hidden flex items-center justify-center text-white p-6 ${className}`}>
        {videoInfo.posterUrl && (
          <img
            src={videoInfo.posterUrl}
            alt={resource.title}
            className="absolute inset-0 h-full w-full object-cover opacity-30 blur-sm pointer-events-none scale-105"
            referrerPolicy="no-referrer"
          />
        )}

        <div className="relative z-10 max-w-lg text-center space-y-4">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-neutral-900/90 border border-neutral-700/80 flex items-center justify-center text-white shadow-xl backdrop-blur-md">
            <Tv className="h-7 w-7 text-neutral-200" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white line-clamp-1">{resource.title}</h3>
            <p className="text-xs text-neutral-300">
              {resource.source?.providerName || 'Broadcaster'} · {resource.attributes?.duration || 'Official Broadcast'}
            </p>
          </div>

          {watchLink && (
            <div className="pt-2">
              <a
                href={watchLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-xs font-semibold text-neutral-900 transition-all shadow-md active:scale-95"
              >
                <Play className="h-4 w-4 fill-current ml-0.5" />
                <span>Watch on Official Broadcaster</span>
                <ExternalLink className="h-3.5 w-3.5 ml-1 text-neutral-500" />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. DIRECT HTML5 VIDEO (Pexels, Pixabay, Wikimedia, NASA, raw mp4/webm)
  return (
    <div className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${className}`}>
      {isLoading && !hasDirectStreamError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
          <Loader2 className="h-8 w-8 animate-spin text-white/70" />
        </div>
      )}

      {hasDirectStreamError ? (
        /* Clean, Unobtrusive Fallback Card (Never an ugly error message) */
        <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-white text-center bg-neutral-950">
          {resource.thumbnailUrl && (
            <img
              src={resource.thumbnailUrl}
              alt={resource.title}
              className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm pointer-events-none"
              referrerPolicy="no-referrer"
            />
          )}

          <div className="relative z-10 max-w-md space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md">
              <Play className="h-5 w-5 ml-0.5 fill-current" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white line-clamp-1">{resource.title}</h3>
              <p className="text-xs text-neutral-300">
                {resource.source?.providerName || 'Media Archive'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setHasDirectStreamError(false);
                  setHasAttemptedTunnel(false);
                  setIsLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors cursor-pointer backdrop-blur-md"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Stream</span>
              </button>

              {(resource.previewUrl || resource.source?.resourceUrl) && (
                <a
                  href={resource.previewUrl || resource.source?.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-xs font-semibold text-neutral-900 transition-colors shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Video Source</span>
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
          onError={handleDirectVideoError}
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
